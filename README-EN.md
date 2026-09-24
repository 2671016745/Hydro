# Kuiguang OJ · Campux OAuth Login (Hydro fork)

Guilin Kuiguang School Hydro OJ: site name **「奎光」 (Kuiguang)**, login **only via Campux OAuth**, school badge / campus painting branding, footer keeps `Powered by Hydro`.

**Collapsed by OS: Linux on top, Windows below.** Click a title to expand that OS's full runbook (deps / start / notes). Shared config is in the last folded section.

<details>
<summary><strong>Linux</strong></summary>

### Dependencies

| Need | Version | Install |
|------|---------|---------|
| Node.js | 20+ (prefer 22/24) | nodejs.org or distro packages |
| Git | recent | `apt install git` etc. |
| Yarn | Corepack | `corepack enable` then `yarn install` |
| Python 3 | optional | `data/patch-*.py` only |

```bash
cd /path/to/Hydro
corepack enable
yarn install
chmod +x scripts/*.sh
```

### Start (Mongo / demo)

```bash
scripts/start-all.sh
```

Secrets in `scripts/env.campux` (`chmod 600`, never commit):

```bash
CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
CAMPUX_OAUTH_CLIENT_ID=...
CAMPUX_OAUTH_CLIENT_SECRET=...
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

Two terminals:

```bash
scripts/start-mongo.sh
scripts/start-hydro.sh
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/
```

### Linux notes

- Restart Hydro after template/TS edits
- UTF-8 locale; use systemd/pm2 in production
- In-memory Mongo wipes DB config; `scripts/start-*.sh` re-applies site name / domain avatar
- `redirect_uri` follows browser Host — register every host in Campux allowlist
- Open port 8888 on the LAN firewall

</details>

<details>
<summary><strong>Windows</strong></summary>

### Dependencies

| Need | Version | Install |
|------|---------|---------|
| Node.js | 20+ (prefer 22/24) | nodejs.org / `winget install OpenJS.NodeJS.LTS` |
| Git | recent | `winget install Git.Git` |
| Yarn | Corepack | `corepack enable` (do **not** `npm i -g yarn`) |
| Python 3 | optional | `data/patch-*.py` |

```powershell
cd D:\github\Hydro
corepack enable
yarn install
```

Do **not** run `yarn build:ui` on Windows (Stylus/rupture). Use prebuilt `@hydrooj/ui-default@4.58.5` in `packages/ui-default/public/` and re-apply `data/patch-*.py` after source edits.

### Start (Mongo / demo)

```powershell
cd D:\github\Hydro
data\start-all.cmd
```

OAuth secrets stay in `data/start-hydro.cmd` (git-ignored) — never commit.

Two terminals:

```powershell
data\start-mongo.cmd
data\start-hydro.cmd
```

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8888/
```

### Windows notes

- Use `curl.exe`, not the PowerShell `curl` alias
- Keep Chinese out of `.cmd` (encoding breaks); put defaults in UTF-8 `.js`
- Restart Hydro after template/TS edits
- After UI rebuild: `patch-sw.py`, `patch-webauthn-guard.py`, `patch-nav-avatar.py`
- Old icons → clear Service Worker / site data

</details>

<details>
<summary><strong>Shared config (OAuth / accounts / UI)</strong></summary>

### Environment

```env
CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
CAMPUX_OAUTH_CLIENT_ID=<id>
CAMPUX_OAUTH_CLIENT_SECRET=<secret>
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

Endpoint is **`kg.campux.top`**. Scope **`profile` only**. Never commit secrets.

### redirect_uri

Built from the **browser Host** and reused for token exchange. Register every host you open:

```text
http://127.0.0.1:8888/oauth/campux/callback
http://<current-LAN-IP>:8888/oauth/campux/callback
https://<production-domain>/oauth/campux/callback
```

`redirect_uri 未在应用中注册` means the allowlist is missing that host.

### Accounts

QQ nickname → username, QQ number → UID, QQ avatar, `CAMPUX_ADMIN_QQ` → `PRIV_ALL`. Forced set-password **once** after first auto-register.

</details>

<details>
<summary><strong>Code map / verify / production</strong></summary>

| Area | Path |
|------|------|
| OAuth plugin | `packages/login-with-campux/` |
| Login / setpass | `packages/hydrooj/src/handler/user.ts` |
| Avatar fallback | `packages/hydrooj/src/lib/avatar.ts` |

```bash
node -r @hydrooj/register --test packages/login-with-campux/pkce.test.ts
```

Production: persistent Mongo, real `server.url`, Campux allowlist, secrets out of git, keep `Powered by Hydro`.

</details>

---

The remainder is the upstream Hydro English readme.


# Hydro

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/hydro-dev/hydro/build.yml?branch=master)
![hydrooj](https://img.shields.io/npm/dm/hydrooj)
![npm](https://img.shields.io/npm/v/hydrooj?label=hydrooj)
![node-current](https://img.shields.io/node/v/hydrooj)
![GitHub contributors](https://img.shields.io/github/contributors/hydro-dev/Hydro)
![GitHub commit activity](https://img.shields.io/github/commit-activity/y/hydro-dev/Hydro)

Hydro is a high-performance online judge system.  
It is easy to deploy (with install script), light weight and extensible.  
Also see previous version at [vijos/vj4](https://github.com/vijos/vj4)

Now we have a SaaS service running at [https://hydro.ac](https://hydro.ac). (Fully free of charge!)  
You can easily have a glance at the features of the system and try it out.  
You can also just use the service without self-hosting the system with the powerful `domain` feature.  
Feel free to create an account and then navigate to `MyAccount > MyDomains > Create Domain` to create one.  

[中文](https://hydro.js.org/)  

We are now looking for help with Korean and Japanese translation, if you are a native speaker of these languages, please contact us, pull requests are always welcome.

## Contact US

Email: i@undefined.moe  
Hydro QQ User Group: 1085853538  
Telegram Group [@hydrodev](https://t.me/hydrodev)
Telegram [@undefinedmoe](https://t.me/undefinedmoe)  

## License

The software is distributed under AGPLv3 with additional terms.

Additional terms under AGPLv3 Section 7:

1. You must not remove the copyright declaration displayed in the software. (Under [AGPLv3, 7(b)](LICENSE#L356))  
2. When you distribute a modified version of the software, you must change the software name or the version number in a reasonable way in order to distinguish it from the original version. (Under [AGPLv3, 7(c)](LICENSE#360))
3. Unless permitted, you are not allowed to use author's name, trademark or logo to promote the software. (Under [AGPLv3, 7(d)](LICENSE#L364))

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Thanks to

In dictionary order:

- [GitHub](https://github.com/) Code hosting and workflow.  
- [criyle](https://github.com/criyle) Sandbox.  
- [Vijos](https://github.com/vijos/vj4) UI framework.  
