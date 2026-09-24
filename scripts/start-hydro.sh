#!/usr/bin/env bash
# Start Hydro: site name / domain avatar / LAN URL + Campux OAuth env + worker.
# Secrets: export env vars, or put them in scripts/env.campux (git-ignored). Never hardcode here.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$HOME/.hydro/config.json" ]]; then
  echo "error: $HOME/.hydro/config.json not found. Start Mongo first: scripts/start-mongo.sh" >&2
  exit 1
fi

node data/set-hydro-lan.js
node data/set-site-name.js
node data/set-domain-avatar.js

# Optional local secrets file (do not commit)
if [[ -f scripts/env.campux ]]; then
  set -a
  # shellcheck disable=SC1091
  source scripts/env.campux
  set +a
fi

: "${CAMPUX_OAUTH_ENDPOINT:=https://kg.campux.top}"
: "${CAMPUX_OAUTH_SCOPE:=profile}"
: "${CAMPUX_ADMIN_QQ:=1692138502}"

if [[ -z "${CAMPUX_OAUTH_CLIENT_ID:-}" || -z "${CAMPUX_OAUTH_CLIENT_SECRET:-}" ]]; then
  echo "error: CAMPUX_OAUTH_CLIENT_ID / CAMPUX_OAUTH_CLIENT_SECRET required." >&2
  echo "  export them, or put them in scripts/env.campux (git-ignored)." >&2
  exit 1
fi

export CAMPUX_OAUTH_ENDPOINT CAMPUX_OAUTH_SCOPE CAMPUX_ADMIN_QQ

exec node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js \
  --host 0.0.0.0 --port 8888 --public
