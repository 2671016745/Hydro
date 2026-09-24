# Kuiguang OJ · Campux OAuth Login (Hydro fork)

Guilin Kuiguang School Hydro OJ: site name **「奎光」 (Kuiguang)**, login **only via Campux OAuth**, school badge / campus-painting branding, footer keeps `Powered by Hydro`.

Sections below are **collapsed by default** — click a heading to expand.

<details>
<summary><strong>1. Prerequisites (what to install)</strong></summary>

| Dependency | Version | Notes |
|------------|---------|-------|
| **Node.js** | 20+ (verified 24.x) | <https://nodejs.org> |
| **Git** | recent | clone / update |
| **Yarn** | Corepack | `corepack enable` (do **not** `npm i -g yarn`) |
| **Workspace deps** | `yarn.lock` | `yarn install` in repo root |
| **mongodb-memory-server** | root devDependency | first start downloads mongod |

```bash
cd /path/to/Hydro
corepack enable && yarn install
```

Helper scripts live in `data/` (git-ignored): `start-mongo.sh` / `start-hydro.sh` / `start-all.sh` and Windows `.cmd` twins.

Secrets for Linux: export env vars or put them in scripts/env.campux (chmod 600, **never commit**).

</details>

<details>
<summary><strong>2. Quick start</strong></summary>

### Linux / macOS (one click)

```bash
cd /path/to/Hydro
chmod +x data/*.sh
scripts/start-all.sh
```

Backgrounds in-memory Mongo, waits for `~/.hydro/config.json`, applies branding, starts Hydro. Ctrl+C stops both.

### Windows (one click)

```powershell
cd D:\github\Hydro
data\start-all.cmd
```

### Two terminals

```bash
scripts/start-mongo.sh   # or .cmd
scripts/start-hydro.sh   # or .cmd
```

### Smoke check

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/
```

**Restart Hydro after template/TS edits.**

</details>

<details>
<summary><strong>3. Features</strong></summary>

- Campux OAuth2 + PKCE S256 only
- Auto-register; `redirect_uri` from **browser Host**, reused in token exchange
- Forced set-password **once** after first auto-register
- QQ nickname → username, QQ number → UID, QQ avatar
- Campus painting login + school badge; avatar fallback `/img/avatar.png` (no Gravatar)

</details>

<details>
<summary><strong>4. Campux OAuth / redirect_uri</strong></summary>

```env
CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
CAMPUX_OAUTH_CLIENT_ID=<id>
CAMPUX_OAUTH_CLIENT_SECRET=<secret>
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

Scope: **`profile` only**.

Register **every host you browse** in the Campux app allowlist:

```text
http://127.0.0.1:8888/oauth/campux/callback
http://<current-LAN-IP>:8888/oauth/campux/callback
https://<production-domain>/oauth/campux/callback
```

Error `redirect_uri 未在应用中注册` means the allowlist is missing that exact callback (often after an IP change).

</details>

<details>
<summary><strong>5. Pitfalls (Windows vs Linux)</strong></summary>

| Issue | Windows | Linux |
|-------|---------|-------|
| `yarn build:ui` (Stylus) | **Fails** — prebuild + `data/patch-*.py` | Usually OK |
| Chinese in `.cmd` / encoding | **Corrupts** (`濂庡厜`) | Keep UTF-8 |
| `curl` alias | Use `curl.exe` | Fine |
| In-memory Mongo branding reset | Yes | Yes |
| `redirect_uri` not registered | Yes | Yes |
| Process supervisor | weak | `systemd` / `pm2` |

</details>

<details>
<summary><strong>6. Code map / verify / production</strong></summary>

| Area | Path |
|------|------|
| OAuth plugin | `packages/login-with-campux/` |
| Login / auto-register / setpass | `packages/hydrooj/src/handler/user.ts` |
| Avatar fallback | `packages/hydrooj/src/lib/avatar.ts` |

```bash
node -r @hydrooj/register --test packages/login-with-campux/pkce.test.ts
```

Production: persistent Mongo, real `server.url`, Campux allowlist for prod host, secrets out of git, re-apply UI patches if rebuilt, keep `Powered by Hydro`.

</details>

---


<details>
<summary><strong>7. SQLite mode (this branch: feat/sqlite-db)</strong></summary>

Use **SQLite instead of MongoDB** for single-node school deployments.

```bash
scripts/start-sqlite.sh              # default DB: data/hydro.db
scripts/start-sqlite.sh /path/oj.db
```

Or set `~/.hydro/config.json` `"url": "sqlite:///abs/path/hydro.db"`, or `HYDRO_DB=sqlite`.

Implementation: `packages/hydrooj/src/service/sqlite.ts` + `db.ts` URL switch. Supports common CRUD, query/update operators, and limited aggregation. Indexes are metadata-only — use MongoDB for large data.

</details>

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
