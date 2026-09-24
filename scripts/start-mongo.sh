#!/usr/bin/env bash
# Start in-memory Mongo (random port); writes ~/.hydro/config.json and addon.json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec node data/start-memory-mongo.js
