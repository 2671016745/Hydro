import {
    Context, Handler, Logger, PRIV, Schema, Service, superagent, SystemModel,
    TokenModel, UserFacingError, UserModel,
} from 'hydrooj';
import { pkceChallenge, randomVerifier } from './pkce';

const logger = new Logger('oauth.campux');

// Campux 聚合登录主图标（橙色账号卡片，单路径简化版）
const icon = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#FF8E12" d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v11A1.5 1.5 0 0 1 19.5 17h-15A1.5 1.5 0 0 1 3 15.5v-11zM12 7.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7 18.5c0-2.2 2.2-4 5-4s5 1.8 5 4v1H7v-1z"/></svg>';

type CampuxUserInfo = {
    sub: string;
    name: string;
    username: string;
    tenant_id?: string;
    tenant_name?: string;
    tenant_slug?: string;
    scope?: string;
    client_id?: string;
};

export default class LoginWithCampuxService extends Service {
    static inject = ['oauth', 'db', 'model:system'];
    static Config = Schema.object({
        endpoint: Schema.string().description('Campux 站点地址，如 https://app.campux.top').required(),
        id: Schema.string().description('Campux OAuth Client ID').required(),
        secret: Schema.string().description('Campux OAuth Client Secret').role('secret').required(),
        scope: Schema.string().description('OAuth scope').default('profile'),
        canRegister: Schema.boolean().default(true).description('未绑定时自动注册'),
        autoRegister: Schema.boolean().default(true).description('自动注册时不再要求设置密码'),
        disablePasswordLogin: Schema.boolean().default(true).description('关闭内置账号密码登录，仅保留 Campux OAuth'),
        adminQq: Schema.string().default('1692138502').description('自动设为系统管理员的 QQ 号'),
    });

    constructor(ctx: Context, private config: ReturnType<typeof LoginWithCampuxService.Config>) {
        super(ctx, 'oauth.campux');
        const endpoint = config.endpoint.replace(/\/+$/, '');

        ctx.oauth.provide('campux', {
            text: 'Login with Campux',
            name: 'Campux',
            icon,
            canRegister: config.canRegister,
            autoRegister: config.autoRegister,
            lockUsername: false,
            callback: async function callback(this: Handler, {
                state, code, error, error_description: errorDescription,
            }) {
                if (error) throw new UserFacingError(error, errorDescription);
                const s = await TokenModel.get(state, TokenModel.TYPE_OAUTH);
                if (!s) throw new UserFacingError('token');
                if (this.session.oauthCampuxState && this.session.oauthCampuxState !== state) {
                    throw new UserFacingError('OAuth state does not match this browser session');
                }
                delete this.session.oauthCampuxState;
                const serverUrl = String(SystemModel.get('server.url') || '').replace(/\/+$/, '/');
                const redirectUri = `${serverUrl}oauth/campux/callback`;
                const verifier = s.codeVerifier as string | undefined;
                if (!verifier) throw new UserFacingError('PKCE verifier missing');

                const tokenRes = await superagent.post(`${endpoint}/oauth/token`)
                    .type('form')
                    .send({
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: redirectUri,
                        client_id: config.id,
                        client_secret: config.secret,
                        code_verifier: verifier,
                    });
                if (tokenRes.body?.error) {
                    throw new UserFacingError(
                        tokenRes.body.error,
                        tokenRes.body.error_description || 'Campux token exchange failed',
                    );
                }
                const accessToken = tokenRes.body.access_token;
                if (typeof accessToken !== 'string' || !accessToken) {
                    throw new UserFacingError('Campux token exchange returned no access_token');
                }
                const infoRes = await superagent.get(`${endpoint}/oauth/userinfo`)
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set('Accept', 'application/json');
                await TokenModel.del(s._id, TokenModel.TYPE_OAUTH);
                const info = infoRes.body as Partial<CampuxUserInfo>;
                const sub = typeof info?.sub === 'string' ? info.sub.trim() : '';
                if (!sub) throw new UserFacingError('Campux userinfo is missing sub');
                // Campux 文档约定 name 为 QQ 号；仍做格式校验，避免误把显示名当管理员标识。
                const qq = typeof info.name === 'string' ? info.name.trim() : '';
                if (!qq || !/^\d{5,20}$/.test(qq)) {
                    throw new UserFacingError('Campux userinfo.name must be the QQ number');
                }
                const displayName = typeof info.username === 'string' && info.username.trim()
                    ? info.username.trim() : qq;
                const email = `${qq}@campux.hydro.local`;
                return {
                    _id: sub,
                    email,
                    // QQ 优先：稳定、唯一，避免不同用户显示名相同导致注册回退到随机后缀
                    uname: [qq, displayName, `campux_${sub}`].filter(Boolean),
                    ...(qq === (config.adminQq || '').trim() && /^\d+$/.test(qq) ? { priv: PRIV.PRIV_ALL } : {}),
                    set: {
                        qq,
                        campuxUserId: sub,
                        campuxTenantId: typeof info.tenant_id === 'string' ? info.tenant_id : null,
                        campuxTenantName: typeof info.tenant_name === 'string' ? info.tenant_name : null,
                    },
                };
            },
            get: async function get(this: Handler) {
                const serverUrl = String(SystemModel.get('server.url') || '').replace(/\/+$/, '/');
                const redirectUri = `${serverUrl}oauth/campux/callback`;
                const verifier = randomVerifier();
                const challenge = pkceChallenge(verifier);
                const [state] = await TokenModel.add(TokenModel.TYPE_OAUTH, 600, {
                    redirect: this.request.referer,
                    codeVerifier: verifier,
                });
                this.session.oauthCampuxState = state;
                const authorize = new URL(`${endpoint}/oauth/authorize`);
                authorize.searchParams.set('response_type', 'code');
                authorize.searchParams.set('client_id', config.id);
                authorize.searchParams.set('redirect_uri', redirectUri);
                authorize.searchParams.set('scope', config.scope || 'profile');
                authorize.searchParams.set('state', state);
                authorize.searchParams.set('code_challenge', challenge);
                authorize.searchParams.set('code_challenge_method', 'S256');
                this.response.redirect = authorize.toString();
            },
        });

        // 即使站点还加载了其他 OAuth 插件，登录页也只暴露 Campux。
        ctx.on('handler/create/http', (handler: Handler) => {
            if (Array.isArray(handler.loginMethods)) {
                handler.loginMethods = handler.loginMethods.filter((method) => method.id === 'campux');
            }
        });
        ctx.on('app/started', () => {
            // 不仅隐藏按钮，也移除其它 provider，阻止直接访问 /oauth/<provider>/login。
            for (const provider of Object.keys(ctx.oauth.providers)) {
                if (provider !== 'campux') delete ctx.oauth.providers[provider];
            }
        });

        ctx.i18n.load('zh', {
            'Login with Campux': '使用 Campux 校园墙登录',
        });
        logger.info('Campux OAuth enabled (password login: %s)', config.disablePasswordLogin ? 'disabled' : 'kept');
    }

    async [Service.init]() {
        const config = this.config as ReturnType<typeof LoginWithCampuxService.Config>;
        if (config.disablePasswordLogin) await SystemModel.set('server.login', false);

        // 兼容接入前已存在的账号：按 qq / 用户名 / 稳定假邮箱找到目标并设为管理员。
        const adminQq = (config.adminQq || '').trim();
        if (!adminQq) return;
        const existing = await UserModel.coll.findOne({
            $or: [
                { qq: adminQq },
                { uname: adminQq },
                { mail: `${adminQq}@campux.hydro.local` },
            ],
        });
        if (existing) await UserModel.setPriv(existing._id, PRIV.PRIV_ALL);
    }
}
