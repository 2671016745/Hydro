#!/usr/bin/env bash
# Start persistent MongoDB (not in-memory).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
MONGO_BIN="${MONGO_BIN:-mongod}"
DB_PATH="${MONGO_DB_PATH:-$HOME/mongo-data}"
LOG_PATH="${MONGO_LOG_PATH:-$HOME/mongo-log/mongod.log}"
mkdir -p "$DB_PATH" "$(dirname "$LOG_PATH")"
node -e '
const fs=require("fs");const os=require("os");const path=require("path");
const cfgPath=path.join(os.homedir(),".hydro","config.json");
let cfg={};try{cfg=JSON.parse(fs.readFileSync(cfgPath,"utf8"))}catch(e){cfg={}}
cfg.url="mongodb://127.0.0.1:27017/hydro";
cfg.server=Object.assign({},cfg.server,{host:"0.0.0.0",port:8888,url:(cfg.server&&cfg.server.url)||"http://127.0.0.1:8888/"});
fs.writeFileSync(cfgPath,JSON.stringify(cfg,null,2));
console.log("mongo url",cfg.url);
'
exec "$MONGO_BIN" --dbpath "$DB_PATH" --logpath "$LOG_PATH" --bind_ip 127.0.0.1 --port 27017
