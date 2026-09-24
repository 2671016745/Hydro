@echo off
setlocal EnableExtensions
cd /d D:\github\Hydro

set "DB_PATH=%~1"
if "%DB_PATH%"=="" set "DB_PATH=D:\github\Hydro\data\hydro.db"

if not exist "%USERPROFILE%\.hydro" mkdir "%USERPROFILE%\.hydro"

node -e "const fs=require('fs');const os=require('os');const path=require('path');const dbPath=process.argv[1].replace(/\\/g,'/');const cfgPath=path.join(os.homedir(),'.hydro','config.json');let cfg={};try{cfg=JSON.parse(fs.readFileSync(cfgPath,'utf8'))}catch(e){cfg={}};cfg.url='sqlite://'+dbPath;cfg.server=Object.assign({},cfg.server,{host:'0.0.0.0',port:8888,url:(cfg.server&&cfg.server.url)||'http://127.0.0.1:8888/'});fs.writeFileSync(cfgPath,JSON.stringify(cfg,null,2));const addonPath=path.join(os.homedir(),'.hydro','addon.json');let addons=[];try{addons=JSON.parse(fs.readFileSync(addonPath,'utf8'))}catch(e){addons=[]};if(!Array.isArray(addons))addons=[];if(!addons.includes('@hydrooj/ui-default'))addons.push('@hydrooj/ui-default');fs.writeFileSync(addonPath,JSON.stringify(addons,null,2));console.log('sqlite url',cfg.url);" "%DB_PATH%"

if exist data\set-hydro-lan.js node data\set-hydro-lan.js
if exist data\set-site-name.js node data\set-site-name.js
if exist data\set-domain-avatar.js node data\set-domain-avatar.js

set CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
set CAMPUX_OAUTH_SCOPE=profile
set CAMPUX_ADMIN_QQ=1692138502
rem Set client id/secret via environment or edit data\start-hydro.cmd local copy — never commit secrets.

node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js --host 0.0.0.0 --port 8888 --public
endlocal
