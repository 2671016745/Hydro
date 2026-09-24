# Hydro · SQLite 模式

本分支（`feat/sqlite-db`）把 Hydro 的持久化改为 **SQLite**，单机部署不必再装 MongoDB。

- 配置开关：`config.json` 里 `url` 以 `sqlite:` 开头，或 `HYDRO_DB=sqlite`
- 驱动：Node 内置 `node:sqlite` + `bson`（保留 Date / ObjectId）
- 适配层：`packages/hydrooj/src/service/sqlite.ts`
- 默认库文件：`data/hydro.db`（可用参数改成任意路径）

下面按系统折叠，**上 Linux、下 Windows**，点标题展开。

<details>
<summary><strong>Linux</strong></summary>

### 依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | 20+（需支持 `node:sqlite`，推荐 22/24） | 运行与内置 SQLite |
| Git | 近期版本 | 拉代码 |
| Yarn | Corepack | `corepack enable && yarn install` |
| Python 3 | 可选 | 仅 `data/patch-*.py` 打 UI 补丁时需要 |

**不需要** MongoDB / mongod / 内存 Mongo。

```bash
cd /path/to/Hydro
corepack enable
yarn install
```

### 启动

```bash
chmod +x scripts/*.sh

# 一键（推荐）：写入 sqlite url、站名/头像、OAuth 环境变量并启动
scripts/start-sqlite.sh                 # 库文件 data/hydro.db
scripts/start-sqlite.sh /var/lib/oj.db  # 或指定路径
```

脚本会：

1. 把 `~/.hydro/config.json` 的 `url` 写成 `sqlite://<db-path>`
2. 如有 `scripts/env.campux` 则加载 OAuth 密钥（可选，未启用 Campux 可跳过）
3. 前台启动 Hydro（默认 `0.0.0.0:8888`）

手工步骤：

```bash
mkdir -p ~/.hydro
# config.json 的 url 必须类似：
#   "url": "sqlite:///var/lib/oj.db"
export HYDRO_DB=sqlite
export HYDRO_SQLITE_PATH=/var/lib/oj.db   # 可选
export CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
export CAMPUX_OAUTH_CLIENT_ID=...
export CAMPUX_OAUTH_CLIENT_SECRET=...
export CAMPUX_OAUTH_SCOPE=profile
export CAMPUX_ADMIN_QQ=1692138502

node data/set-hydro-lan.js    # 可选：自动填 LAN URL
node data/set-site-name.js    # 可选：站名
node data/set-domain-avatar.js

node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js \
  --host 0.0.0.0 --port 8888 --public
```

自检：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/
```

### Linux 注意

- 库文件权限：`chmod 600 data/hydro.db`，目录属主用跑 Hydro 的用户
- 生产建议 `systemd` 托管；Ctrl+C 会一并结束 `start-sqlite.sh` 进程
- 改模板 / TS 后 **重启 Hydro**
- UTF-8 locale（`zh_CN.UTF-8` / `en_US.UTF-8`），避免中文乱码
- 服务级防火墙放行 8888（或反代）

</details>

<details>
<summary><strong>Windows</strong></summary>

### 依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | 20+（推荐 22/24） | `node:sqlite` 内置 |
| Git | 近期版本 | |
| Yarn | Corepack | `corepack enable` 后 `yarn install` |
| Python 3 | 可选 | UI 补丁脚本 |

**不需要** MongoDB。也 **不要** 在 Windows 上跑 `yarn build:ui`（Stylus 会挂）；UI 用预构建 + `data/patch-*.py`。

```powershell
cd D:\github\Hydro
corepack enable
yarn install
```

### 启动

```powershell
cd D:\github\Hydro

# 一键
scripts\start-sqlite.cmd
scripts\start-sqlite.cmd D:\oj\hydro.db
```

或手工改 `%USERPROFILE%\.hydro\config.json`：

```json
{
  "url": "sqlite://D:/oj/hydro.db",
  "server": {
    "url": "http://127.0.0.1:8888/",
    "host": "0.0.0.0",
    "port": 8888
  }
}
```

然后：

```powershell
$env:HYDRO_DB = 'sqlite'
$env:HYDRO_SQLITE_PATH = 'D:\oj\hydro.db'
# Campux OAuth 可选；启用时：
# $env:CAMPUX_OAUTH_ENDPOINT = 'https://kg.campux.top'
# $env:CAMPUX_OAUTH_CLIENT_ID = '...'
# $env:CAMPUX_OAUTH_CLIENT_SECRET = '...'
# $env:CAMPUX_OAUTH_SCOPE = 'profile'
# $env:CAMPUX_ADMIN_QQ = '1692138502'

node data\set-hydro-lan.js
node data\set-site-name.js
node data\set-domain-avatar.js
node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js --host 0.0.0.0 --port 8888 --public
```

自检：

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8888/
```

### Windows 注意

- 用 `curl.exe`，不要用 PowerShell 的 `curl` 别名
- 中文尽量写在 `.js` / 配置里，少写进 `.cmd`（编码容易坏）
- 路径在 JSON 里用 **正斜杠** 或转义：`sqlite://D:/oj/hydro.db`
- 首次 `yarn install` 较慢属正常
- 改模板 / TS 后重启 Hydro

</details>

---

### 能力与限制

| 项 | 支持情况 |
|----|----------|
| find / insert / update / delete / 分页排序投影 | 支持 |
| 查询算子 | `$eq $ne $gt $gte $lt $lte $in $nin $exists $regex $and $or $nor $size $all $elemMatch` |
| 更新算子 | `$set $unset $inc $push $pull $addToSet $pop` |
| findOneAndUpdate / upsert | 支持 |
| aggregate | `$match $project $unwind $group $sort $limit $skip $count` + `$min $max $sum $avg $first $last $push $addToSet` + `$objectToArray` |
| 索引 | 仅元数据（查询在内存匹配） |
| 全文 / 分片 / 副本集 | 不支持 |

规模建议：班级/校级（数百～数千用户）可用 SQLite；更大请继续用 MongoDB。

### 自检

```bash
# 需先编译出 .cache/ts-out（或 tsc -p packages/hydrooj）
node .cache/ts-out/packages/hydrooj/service/sqlite.smoke.js
```

### 相关文件

| 文件 | 作用 |
|------|------|
| `packages/hydrooj/src/service/sqlite.ts` | SQLite 适配层 |
| `packages/hydrooj/src/service/db.ts` | `sqlite:` URL 切换 |
| `packages/hydrooj/src/service/sqlite.smoke.ts` | 冒烟测试 |
| `scripts/start-sqlite.sh` | Linux 一键启动 |
| `scripts/start-sqlite.cmd` | Windows 一键启动 |

> 本分支只覆盖 SQLite 持久化。Campux OAuth / 校园 branding 等见 `master` 分支 README。
