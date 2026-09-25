@echo off
rem Hydro + persistent MongoDB. Secrets: data\local-env.cmd (gitignored) or environment.
cd /d D:\github\Hydro
if exist "%~dp0local-env.cmd" call "%~dp0local-env.cmd"
if exist "data\local-env.cmd" call "data\local-env.cmd"
set CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
set CAMPUX_OAUTH_SCOPE=profile
set CAMPUX_ADMIN_QQ=1692138502,2671016745
if not defined CAMPUX_OAUTH_CLIENT_ID (
  echo Set CAMPUX_OAUTH_CLIENT_ID and CAMPUX_OAUTH_CLIENT_SECRET first.
  echo See scripts\local-env.cmd.example
  exit /b 1
)
if exist scripts\cap-log.js (
  node scripts\cap-log.js data\hm1.log 100
  node scripts\cap-log.js data\hm1.err.log 100
)
node scripts\set-hydro-lan.js
node scripts\set-site-name.js
node scripts\set-domain-avatar.js
if exist scripts\apply-brand-settings.js node scripts\apply-brand-settings.js
start "Hydro-Mongo" /b "D:\Program Files\nodejs\node.exe" -r @hydrooj/register packages/hydrooj/bin/hydrooj.js --host 0.0.0.0 --port 8888 --public 1>data\hm1.log 2>data\hm1.err.log
echo LAUNCHED
