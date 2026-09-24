# Kuiguang OJ · Campux OAuth Login (Hydro fork)

Custom [Hydro](https://github.com/hydro-dev/Hydro) fork for **Guilin Kuiguang School**:

- Site name: **「奎光」** (Kuiguang)
- Login **only via Campux campus OAuth** (no local password login, no other OAuth, no password recovery)
- UI branding: school badge + campus painting
- Footer keeps `Powered by Hydro` (AGPL)

Users sign in with their existing Campux / QQ identity. Hydro does not maintain a separate password pool for day-to-day login.

---

## 1. Prerequisites (what to install)

### 1.1 Required

| Dependency | Version | Purpose | Install |
|------------|---------|---------|---------|
| **Node.js** | 20+ (verified on 24.x) | Hydro + local scripts | <https://nodejs.org> or `winget install OpenJS.NodeJS.LTS` |
| **Git** | any recent | clone / update | <https://git-scm.com> or `winget install Git.Git` |
| **Yarn** | via Corepack | workspace install | see below (**do not** `npm i -g yarn` (Yarn 1)) |
| **Workspace packages** | locked by `yarn.lock` | Hydro, UI, plugins | run `yarn install` once in repo root |
| **mongodb-memory-server** | root `package.json` devDependency | local in-memory Mongo | installed with `yarn install`; **first start downloads a mongod binary** |

Enable Yarn (this repo uses Corepack + Yarn Berry, `nodeLinker: node-modules`):

```powershell
cd D:\github\Hydro
corepack enable
corepack prepare yarn@stable --activate
yarn -v
yarn install
```

`postinstall` runs `node build/prepare.js` — that is expected.

### 1.2 Local helper scripts (in `data/`, git-ignored)

| Script | Role |
|--------|------|
| `data/start-memory-mongo.js` | start in-memory Mongo, write `~/.hydro/config.json` + `addon.json` |
| `data/start-mongo.cmd` | wrapper for the above |
| `data/start-hydro.cmd` | site name / domain avatar / LAN URL + OAuth env + start worker |
| `data/start-all.cmd` | **one-click**: Mongo window → wait config → Hydro |
| `data/set-hydro-lan.js` | auto-detect LAN IP into `server.url` |
| `data/set-site-name.js` | site name Kuiguang / 奎光 |
| `data/set-domain-avatar.js` | domain avatar = school badge |
| `data/patch-*.py` | manual patches for prebuilt UI (see §5) |

### 1.3 Optional

| Need | Extra |
|------|-------|
| Full UI rebuild | Linux/macOS (or a working Stylus setup). **Windows `build:ui` fails** (Stylus/rupture). |
| Template / badge only | No UI rebuild — restart Hydro after edits |
| Production | **Persistent MongoDB**, not the memory server |
| `data/patch-*.py` | Python 3 |

You do **not** need a separate MongoDB server for local demos, PM2, or Nginx.

---

## 2. Quick start

### 2.1 One click (recommended)

```powershell
cd D:\github\Hydro
data\start-all.cmd
```

Opens a Mongo window, waits for `~/.hydro/config.json`, applies site branding, exports Campux OAuth env vars, starts Hydro.

Open:

```text
http://127.0.0.1:8888/
http://<LAN-IP>:8888/
```

### 2.2 Two windows (better for debugging)

```powershell
# Window A
data\start-mongo.cmd

# Window B (after MONGO_URI is printed)
data\start-hydro.cmd
```

### 2.3 Linux / macOS quick start

```bash
cd /path/to/Hydro
corepack enable && yarn install

# Terminal A
node data/start-memory-mongo.js

# Terminal B
node data/set-hydro-lan.js
node data/set-site-name.js
node data/set-domain-avatar.js
export CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
export CAMPUX_OAUTH_CLIENT_ID=...
export CAMPUX_OAUTH_CLIENT_SECRET=...
export CAMPUX_OAUTH_SCOPE=profile
export CAMPUX_ADMIN_QQ=1692138502
node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js --host 0.0.0.0 --port 8888 --public
```

### 2.4 Smoke check

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/misc/guiguang-campus.jpg
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/img/guiguang-school-badge.png
```

Logs: `data/hydro.log`, `data/hydro.err.log`, `data/mongo.log`.

**Restart Hydro after template / TS changes.** Built UI JS is not hot-reloaded.

---

## 3. Features

### Login / OAuth

- Campux OAuth2 + **PKCE S256**
- Only Campux provider remains (password login / other OAuth / lost-password disabled)
- First login **auto-registers** a Hydro account
- `redirect_uri` is built from the **browser Host** (honors `X-Forwarded-Proto`) and reused for the token exchange
- WebAuthn autofill false-positive notices suppressed in OAuth-only mode

### Account mapping

| Campux / QQ | Hydro |
|-------------|--------|
| `username` (QQ nickname) | username (fallback QQ / `campux_<sub>`) |
| `name` (QQ number) | **UID** |
| QQ avatar | avatar `qq:<qq>` |
| synthetic email | `<qq>@campux.hydro.local` |
| `CAMPUX_ADMIN_QQ` | auto `PRIV_ALL` |

- Forced password setup **once** after first auto-register (`noLocalPassword` only written on autoRegister)
- First set-password page does not ask for the current password

### UI branding

- Site name **奎光 / Kuiguang**
- Login: full-bleed campus painting + white square school badge + official Campux SVG button
- Nav: school badge (`?v=school`) + user QQ avatar/nickname
- Empty avatar falls back to `/img/avatar.png` (no Gravatar)
- SW cache `ui-resources-cache-v2` does not pre-cache favicon / logo / nav-logo

---

## 4. Campux OAuth config

### 4.1 Environment variables

Secrets stay in `data/` (git-ignored) or deployment env — **never commit**.

```env
# Endpoint is kg.campux.top — NOT app.campux.top
CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
CAMPUX_OAUTH_CLIENT_ID=<id>
CAMPUX_OAUTH_CLIENT_SECRET=<secret>
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

Scope must be **`profile` only** unless the Campux app allowlist also permits `tenant`.

### 4.2 redirect_uri allowlist (common failure)

Hydro now derives `redirect_uri` from the host you actually use to open the site:

```text
http://127.0.0.1:8888/oauth/campux/callback
http://<current-LAN-IP>:8888/oauth/campux/callback
https://<production-domain>/oauth/campux/callback
```

**Every host you browse must be registered** in the Campux OAuth app. If the LAN IP changes (e.g. `192.168.18.11` → `192.168.18.3`), add the new callback or login fails with `redirect_uri 未在应用中注册`.

`server.url` should still end with `/` (fallback when Host is missing).

### 4.3 UserInfo

| Field | Required | Meaning |
|-------|----------|---------|
| `sub` | yes | stable user id |
| `name` | yes | **QQ number** (5–20 digits) → UID |
| `username` | no | **QQ nickname** |

---

## 5. Pitfalls

### Windows vs Linux

| Issue | Windows | Linux |
|-------|---------|-------|
| `yarn build:ui` (Stylus/rupture) | **Fails** — use prebuilt `@hydrooj/ui-default@4.58.5` in `packages/ui-default/public/` and re-apply `data/patch-*.py` after rebuilds | Usually works |
| Chinese in `.cmd` / PowerShell encoding | Can corrupt to `濂庡厜` — keep Chinese defaults in UTF-8 `.js`, not `.cmd` | Use UTF-8 locale (`zh_CN.UTF-8`); prefer bash scripts |
| `curl` alias | Use `curl.exe` | `curl` is fine |
| In-memory Mongo branding loss | Yes | Yes (same) |
| `redirect_uri` not registered | Yes | Yes (same) — IP/host must be in Campux allowlist |
| Need process supervisor | Task Scheduler / NSSM / extra console windows | `systemd`, `pm2`, `docker compose` recommended |

### Branding / UI

| Symptom | Cause | Fix |
|---------|-------|-----|
| Domain avatar / site name reset after restart | in-memory Mongo wipe | `start-hydro.cmd` re-runs `set-site-name.js` + `set-domain-avatar.js` |
| Login background “gone” | usually SW/browser cache | clear site data; check `/misc/guiguang-campus.jpg` returns 200 |
| Old favicon | SW precache | clear site data; SW v2 excludes favicon/logo |
| Rebuild UI lost patches | prebuilt chunk patches gone | re-run `data/patch-webauthn-guard.py`, `patch-nav-avatar.py`, `patch-sw.py` |

### OAuth / accounts

| Symptom | Fix |
|---------|-----|
| `redirect_uri 未在应用中注册` | Register **the exact host** you browse under in Campux allowlist (see §4.2) |
| token / state error | same host for authorize + callback; `server.url` trailing `/`; one browser session |
| Password form still visible | check env + log `Campux OAuth enabled`; hard refresh `/login` |
| Forced set-password loops | should not happen; `noLocalPassword` is write-once |

### Data / security

- In-memory Mongo is **non-persistent** — demo only
- Secrets never enter git
- Keep `Powered by Hydro` (AGPL)
- Do not change how users authenticate

---

## 6. Key code map

| Area | Path |
|------|------|
| OAuth plugin (PKCE, auto-register, QQ map, redirect_uri) | `packages/login-with-campux/` |
| Login / auto-register / forced set-password | `packages/hydrooj/src/handler/user.ts` |
| First set-password without current password | `packages/hydrooj/src/handler/home.ts` |
| Avatar fallback | `packages/hydrooj/src/lib/avatar.ts` |
| Login / nav / setpass templates | `packages/ui-default/templates/...` |
| Service Worker | `packages/ui-default/service-worker.ts` |

---

## 7. Verification

```bash
node -r @hydrooj/register --test packages/login-with-campux/pkce.test.ts
corepack yarn tsc -b packages/hydrooj/tsconfig.json packages/login-with-campux/tsconfig.json --pretty false --force
```

---

## 8. Production checklist

- [ ] Node 20+, `yarn install` OK
- [ ] Persistent MongoDB
- [ ] `server.url` = production origin, trailing `/`
- [ ] Campux allowlist contains production `redirect_uri` (and only needed hosts)
- [ ] `CAMPUX_OAUTH_SCOPE=profile`
- [ ] Secrets via env / `.hydro/env`, not git
- [ ] Superadmin QQ `1692138502` verified
- [ ] Footer `Powered by Hydro` intact
- [ ] If UI rebuilt: re-apply `data/patch-*.py`
- [ ] On Linux: UTF-8 locale; use systemd/pm2 for auto-restart

---

## 9. More docs

- [`packages/login-with-campux/README.md`](packages/login-with-campux/README.md)
- [`.env.campux.example`](.env.campux.example)
- Upstream: [hydro.js.org](https://hydro.js.org/)

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
