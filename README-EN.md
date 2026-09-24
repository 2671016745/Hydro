# Kuiguang OJ · Campux OAuth + SQLite (Hydro fork)

Guilin Kuiguang School Hydro OJ: site name **「奎光」 (Kuiguang)**, login **only via Campux OAuth**, school badge / campus painting branding, footer keeps `Powered by Hydro`.

Branch `feat/sqlite-db` stores data in **SQLite** (`data/hydro.db`) — no database server install.

**Collapsed by OS: Linux on top, Windows below.** Click to expand. Shared config is further down.

<details>
<summary><strong>Linux</strong></summary>

### Dependencies

| Need | Version | Install |
|------|---------|---------|
| Node.js | 20+ (prefer 22/24, with `node:sqlite`) | nodejs.org / distro |
| Git | recent | |
| Yarn | Corepack | `corepack enable && yarn install` |
| Python 3 | optional | `data/patch-*.py` |

**No database server** required.

```bash
cd /path/to/Hydro
corepack enable
yarn install
chmod +x scripts/*.sh
```

### Start (SQLite)

```bash
scripts/start-sqlite.sh                 # data/hydro.db
scripts/start-sqlite.sh /var/lib/oj.db
```

Secrets in `scripts/env.campux` (`chmod 600`, never commit):

```bash
CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
CAMPUX_OAUTH_CLIENT_ID=...
CAMPUX_OAUTH_CLIENT_SECRET=...
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/
```

### Linux notes

- Restart Hydro after template/TS edits
- `chmod 600` the DB file; systemd/pm2 in production
- Data persists in the SQLite file across restarts
- Register every browse host as OAuth callback in Campux allowlist

</details>

<details>
<summary><strong>Windows</strong></summary>

### Dependencies

| Need | Version | Install |
|------|---------|---------|
| Node.js | 20+ (prefer 22/24) | nodejs.org / winget |
| Git | recent | |
| Yarn | Corepack | `yarn install` (no global Yarn 1) |
| Python 3 | optional | UI patches |

**No extra DB server.** Do not run `yarn build:ui` on Windows (Stylus). Use prebuilt UI + `data/patch-*.py`.

```powershell
cd D:\github\Hydro
corepack enable
yarn install
```

### Start (SQLite)

```powershell
scripts\start-sqlite.cmd
scripts\start-sqlite.cmd D:\oj\hydro.db
```

Or set `%USERPROFILE%\.hydro\config.json` `"url": "sqlite://D:/oj/hydro.db"` and:

```powershell
$env:HYDRO_DB = 'sqlite'
$env:HYDRO_SQLITE_PATH = 'D:\oj\hydro.db'
node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js --host 0.0.0.0 --port 8888 --public
```

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8888/
```

### Windows notes

- Use `curl.exe`, not PowerShell `curl` alias
- Forward slashes in JSON paths: `sqlite://D:/oj/hydro.db`
- Restart Hydro after template/TS edits
- After UI rebuild: re-apply `data/patch-*.py`

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

### Accounts & UI

- QQ nickname → username, QQ number → UID, QQ avatar
- Auto-register; forced set-password **once** after first register
- `CAMPUX_ADMIN_QQ` → `PRIV_ALL`
- Login: campus painting + school badge + Campux button
- Avatar fallback `/img/avatar.png` (no Gravatar)

</details>

<details>
<summary><strong>SQLite capabilities / limits</strong></summary>

CRUD, common query/update operators, limited aggregation. Indexes are metadata-only. No full-text / sharding.

Smoke: `node .cache/ts-out/packages/hydrooj/service/sqlite.smoke.js`

| File | Role |
|------|------|
| `packages/hydrooj/src/service/sqlite.ts` | adapter |
| `packages/hydrooj/src/service/db.ts` | `sqlite:` URL switch |
| `scripts/start-sqlite.sh` / `.cmd` | one-click start |

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

Production: back up the SQLite file, real `server.url`, Campux allowlist, secrets out of git, keep `Powered by Hydro`.

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
