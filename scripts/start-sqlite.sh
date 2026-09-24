#!/usr/bin/env bash
# Start Hydro with SQLite persistence (no MongoDB).
# Usage: scripts/start-sqlite.sh [db-path]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_PATH="${1:-$ROOT/data/hydro.db}"
mkdir -p "$(dirname "$DB_PATH")"

if [[ ! -f "$HOME/.hydro/config.json" ]]; then
  mkdir -p "$HOME/.hydro"
  echo '{}' > "$HOME/.hydro/config.json"
fi

# write sqlite url + server defaults via node
node - "$DB_PATH" <<'NODE'
const fs = require('fs');
const os = require('os');
const path = require('path');
const dbPath = process.argv[2];
const cfgPath = path.join(os.homedir(), '.hydro', 'config.json');
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch { cfg = {}; }
cfg.url = `sqlite://${dbPath}`;
cfg.server = { ...(cfg.server || {}), host: '0.0.0.0', port: 8888, url: (cfg.server && cfg.server.url) || 'http://127.0.0.1:8888/' };
cfg.session = { ...(cfg.session || {}) };
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
const addonPath = path.join(os.homedir(), '.hydro', 'addon.json');
let addons = [];
try { addons = JSON.parse(fs.readFileSync(addonPath, 'utf8')); } catch { addons = []; }
if (!Array.isArray(addons)) addons = [];
if (!addons.includes('@hydrooj/ui-default')) addons.push('@hydrooj/ui-default');
fs.writeFileSync(addonPath, JSON.stringify(addons, null, 2));
console.log('sqlite url', cfg.url);
NODE

# 启动前先修好品牌配置；失败则不启动（修好才能访问）
node data/set-hydro-lan.js || true
node data/set-site-name.js
node data/set-domain-avatar.js
if [[ -f data/apply-brand-settings.js ]]; then
  node data/apply-brand-settings.js
else
  echo "error: data/apply-brand-settings.js missing" >&2
  exit 1
fi

if [[ -f scripts/env.campux ]]; then
  set -a
  # shellcheck disable=SC1091
  source scripts/env.campux
  set +a
fi

: "${CAMPUX_OAUTH_ENDPOINT:=https://kg.campux.top}"
: "${CAMPUX_OAUTH_SCOPE:=profile}"
: "${CAMPUX_ADMIN_QQ:=1692138502}"
export CAMPUX_OAUTH_ENDPOINT CAMPUX_OAUTH_SCOPE CAMPUX_ADMIN_QQ

# OAuth client id/secret required only if login-with-campux addon is loaded.
# For UI-only smoke tests you may export dummy values.

exec node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js \
  --host 0.0.0.0 --port 8888 --public
