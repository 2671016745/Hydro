#!/usr/bin/env bash
# One-click: background in-memory Mongo -> wait for config -> foreground Hydro
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "error: node not found. Install Node.js 20+ first." >&2
  exit 1
fi

echo "[1/3] Starting memory Mongo in background..."
mkdir -p data
node data/start-memory-mongo.js > data/mongo.log 2> data/mongo.err.log &
MONGO_PID=$!
trap 'kill "$MONGO_PID" 2>/dev/null || true' EXIT INT TERM

echo "[2/3] Waiting for ~/.hydro/config.json ..."
for i in $(seq 1 60); do
  if [[ -f "$HOME/.hydro/config.json" ]]; then
    break
  fi
  if ! kill -0 "$MONGO_PID" 2>/dev/null; then
    echo "Mongo process died. See data/mongo.log / data/mongo.err.log" >&2
    exit 1
  fi
  sleep 1
  if [[ "$i" -eq 60 ]]; then
    echo "Mongo did not write config.json in 60s. See data/mongo.log" >&2
    exit 1
  fi
done

echo "[3/3] Starting Hydro..."
bash scripts/start-hydro.sh
