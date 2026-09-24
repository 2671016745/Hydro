# Hydro · SQLite mode

Branch `feat/sqlite-db` uses **SQLite** for persistence so you can run Hydro without MongoDB.

- Enable with `url` starting with `sqlite:` in `config.json`, or `HYDRO_DB=sqlite`
- Driver: Node built-in `node:sqlite` + `bson` (Date / ObjectId preserved)
- Adapter: `packages/hydrooj/src/service/sqlite.ts`
- Default DB file: `data/hydro.db` (override with a path argument)

Collapsed by OS: **Linux on top, Windows below** — click to expand.

<details>
<summary><strong>Linux</strong></summary>

### Dependencies

| Need | Version | Notes |
|------|---------|-------|
| Node.js | 20+ (`node:sqlite`, prefer 22/24) | built-in SQLite |
| Git | recent | |
| Yarn | Corepack | `corepack enable && yarn install` |
| Python 3 | optional | UI patch scripts only |

No MongoDB required.

```bash
cd /path/to/Hydro
corepack enable
yarn install
chmod +x scripts/*.sh
```

### Start

```bash
scripts/start-sqlite.sh                 # data/hydro.db
scripts/start-sqlite.sh /var/lib/oj.db
```

The script writes `sqlite://<db-path>` into `~/.hydro/config.json`, optional `scripts/env.campux`, then starts Hydro on `0.0.0.0:8888`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/
```

### Linux notes

- `chmod 600` the DB file; use systemd in production
- Restart Hydro after template/TS edits
- UTF-8 locale; open firewall for port 8888 if needed

</details>

<details>
<summary><strong>Windows</strong></summary>

### Dependencies

| Need | Version | Notes |
|------|---------|-------|
| Node.js | 20+ (prefer 22/24) | `node:sqlite` |
| Git | recent | |
| Yarn | Corepack | `yarn install` |

Do **not** run `yarn build:ui` on Windows (Stylus). Use prebuilt UI + `data/patch-*.py`.

```powershell
cd D:\github\Hydro
corepack enable
yarn install
```

### Start

```powershell
scripts\start-sqlite.cmd
scripts\start-sqlite.cmd D:\oj\hydro.db
```

Or set `%USERPROFILE%\.hydro\config.json`:

```json
{ "url": "sqlite://D:/oj/hydro.db", "server": { "url": "http://127.0.0.1:8888/", "host": "0.0.0.0", "port": 8888 } }
```

```powershell
$env:HYDRO_DB = 'sqlite'
$env:HYDRO_SQLITE_PATH = 'D:\oj\hydro.db'
node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js --host 0.0.0.0 --port 8888 --public
```

### Windows notes

- Use `curl.exe`, not the PowerShell `curl` alias
- Prefer forward slashes in JSON: `sqlite://D:/oj/hydro.db`
- Restart Hydro after template/TS edits

</details>

---

### Capabilities / limits

CRUD, common query/update operators, limited aggregation (`$match/$project/$unwind/$group/...`). Indexes are metadata-only. No full-text / sharding. Fine for school-scale data; use MongoDB for large deployments.

Smoke test:

```bash
node .cache/ts-out/packages/hydrooj/service/sqlite.smoke.js
```

Campux OAuth / branding docs live on `master`.
