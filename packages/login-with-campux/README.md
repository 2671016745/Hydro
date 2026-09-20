# Campux OAuth 登录

本 fork 内置 Campux OAuth 登录，并关闭 Hydro 内置密码登录与其它 OAuth provider。

## 环境变量

```env
CAMPUX_OAUTH_ENDPOINT=https://app.campux.top
CAMPUX_OAUTH_CLIENT_ID=从 Campux 管理后台复制
CAMPUX_OAUTH_CLIENT_SECRET=从 Campux 管理后台复制
CAMPUX_OAUTH_SCOPE=profile tenant
CAMPUX_ADMIN_QQ=1692138502
```

Hydro 回调地址必须在 Campux OAuth 应用里登记：

```text
https://你的 Hydro 域名/oauth/campux/callback
```

同时把 Hydro 的 `server.url` 设置为以 `/` 结尾的公网地址，例如：

```text
https://oj.example.com/
```

## 行为

- 登录页只显示 Campux OAuth。
- 未绑定用户会自动创建 Hydro 账号，不再要求设置本地密码。
- OAuth 绑定存放在 MongoDB `oauth` collection，使用 `(platform, id)` 唯一索引；无需额外迁移。
- 用户文档增加 `qq`、`campuxTenantId`、`campuxTenantName` 字段。
- QQ `1692138502`（或 `CAMPUX_ADMIN_QQ` 指定值）首次登录即获得 `PRIV_ALL`；已有账号启动时也会补齐管理员权限。

## Campux OAuth 应用

在 Campux 管理后台创建 OAuth 应用并启用：

- Authorization URL: `/oauth/authorize`
- Token URL: `/oauth/token`
- UserInfo URL: `/oauth/userinfo`
- PKCE: `S256`（插件自动处理）
- Scope: `profile tenant`
