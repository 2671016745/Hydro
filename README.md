# 奎光 OJ · Campux OAuth + SQLite（Hydro fork）

桂林市奎光学校 Hydro OJ：站名 **「奎光」**，登录 **只走 Campux OAuth**，UI 用校徽 / 校园画 branding，页脚保留 `Powered by Hydro`。

本分支（`feat/sqlite-db`）持久化使用 **SQLite**（`data/hydro.db`），单机部署不必安装数据库服务。

**按系统折叠：上 Linux、下 Windows。** 点标题展开。公共配置见文末折叠节。

<details>
<summary><strong>Linux</strong></summary>

### 依赖

| 依赖 | 版本 | 安装 |
|------|------|------|
| Node.js | 20+（推荐 22/24，需内置 `node:sqlite`） | <https://nodejs.org> 或发行版包管理 |
| Git | 近期版本 | `apt install git` 等 |
| Yarn | Corepack | `corepack enable` 后 `yarn install` |
| Python 3 | 可选 | 仅 `data/patch-*.py` UI 补丁 |

**不需要**安装任何数据库服务。

```bash
cd /path/to/Hydro
corepack enable
yarn install
chmod +x scripts/*.sh
```

### 启动（SQLite）

```bash
# 一键：写入 sqlite url、站名/头像、OAuth 环境变量并启动
scripts/start-sqlite.sh                    # 库文件 data/hydro.db
scripts/start-sqlite.sh /var/lib/oj.db     # 或指定路径
```

密钥 `scripts/env.campux`（`chmod 600`，**勿提交**）：

```bash
CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
CAMPUX_OAUTH_CLIENT_ID=你的ID
CAMPUX_OAUTH_CLIENT_SECRET=你的SECRET
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

手工步骤：

```bash
# ~/.hydro/config.json 的 url：
#   "url": "sqlite:///var/lib/oj.db"
export HYDRO_DB=sqlite
export HYDRO_SQLITE_PATH=/var/lib/oj.db

node data/set-hydro-lan.js
node data/set-site-name.js
node data/set-domain-avatar.js

node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js \
  --host 0.0.0.0 --port 8888 --public
```

自检：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/misc/guiguang-campus.jpg
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/img/guiguang-school-badge.png
```

### Linux 注意

- 改模板 / TS 后 **必须重启** Hydro
- 库文件 `chmod 600`，生产用 `systemd` / `pm2` 守护
- 数据存在 SQLite 文件里，**重启不会丢**（站名 / 头像 / 用户都在库里）
- `redirect_uri` 按浏览器 Host 生成，每个访问地址都要进 Campux allowlist
- 防火墙放行 8888；UTF-8 locale

</details>

<details>
<summary><strong>Windows</strong></summary>

### 依赖

| 依赖 | 版本 | 安装 |
|------|------|------|
| Node.js | 20+（推荐 22/24） | <https://nodejs.org> 或 `winget install OpenJS.NodeJS.LTS` |
| Git | 近期版本 | `winget install Git.Git` |
| Yarn | Corepack | `corepack enable`，**不要** `npm i -g yarn` |
| Python 3 | 可选 | `data/patch-*.py` |

**不需要**额外数据库服务。

```powershell
cd D:\github\Hydro
corepack enable
yarn install
```

**不要**在 Windows 执行 `yarn build:ui`（Stylus 会失败）。UI 用预构建 `@hydrooj/ui-default@4.58.5`，改源码后重跑 `data/patch-*.py`。

### 启动（SQLite）

```powershell
cd D:\github\Hydro
scripts\start-sqlite.cmd
scripts\start-sqlite.cmd D:\oj\hydro.db
```

或改 `%USERPROFILE%\.hydro\config.json`：

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
$env:CAMPUX_OAUTH_ENDPOINT = 'https://kg.campux.top'
$env:CAMPUX_OAUTH_CLIENT_ID = '<id>'
$env:CAMPUX_OAUTH_CLIENT_SECRET = '<secret>'
$env:CAMPUX_OAUTH_SCOPE = 'profile'
$env:CAMPUX_ADMIN_QQ = '1692138502'

node data\set-hydro-lan.js
node data\set-site-name.js
node data\set-domain-avatar.js
node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js --host 0.0.0.0 --port 8888 --public
```

自检：

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8888/
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8888/misc/guiguang-campus.jpg
```

### Windows 注意

- 用 `curl.exe`，不要用 PowerShell 的 `curl` 别名
- JSON 路径用正斜杠：`sqlite://D:/oj/hydro.db`
- 中文少写进 `.cmd`；密钥放环境变量或 `data/`（git 忽略）
- 改模板 / TS 后重启 Hydro
- 重建 UI 后重打：`patch-sw.py`、`patch-webauthn-guard.py`、`patch-nav-avatar.py`
- 图标旧了：清 Service Worker / 站点数据

</details>

<details>
<summary><strong>公共配置（OAuth / 账号 / UI）</strong></summary>

### 环境变量

```env
CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
CAMPUX_OAUTH_CLIENT_ID=<id>
CAMPUX_OAUTH_CLIENT_SECRET=<secret>
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

- 端点是 **`kg.campux.top`**，不是 `app.campux.top`
- Scope **只用 `profile`**
- 密钥只放 `data/` / `scripts/env.campux` / 环境变量，**禁止进 git**

### redirect_uri

按 **当前浏览器 Host** 生成并用于 token 交换。每个访问入口都要在 Campux 应用 allowlist 登记：

```text
http://127.0.0.1:8888/oauth/campux/callback
http://<当前局域网IP>:8888/oauth/campux/callback
https://<正式域名>/oauth/campux/callback
```

「redirect_uri 未在应用中注册」＝ allowlist 缺该 host。

### 账号映射

| Campux / QQ | Hydro |
|-------------|--------|
| `username`（QQ 昵称） | 用户名 |
| `name`（QQ 号） | **UID** |
| QQ 头像 | `qq:<qq>` |
| 合成邮箱 | `<qq>@campux.hydro.local` |
| `CAMPUX_ADMIN_QQ` | 自动 `PRIV_ALL` |

- 未绑定用户 OAuth **自动注册**
- 首次注册后 **强制设密码只一次**；首设免「当前密码」
- 禁用本地密码登录 / 其它 OAuth / 忘记密码

### UI

- 站名「奎光」；登录页：校园画 + 白底校徽 + Campux 官方按钮
- 导航：校徽 `?v=school` + 用户 QQ 头像/昵称
- 空头像 `/img/avatar.png`（**不用 Gravatar**）
- SW `ui-resources-cache-v2`，不预缓存 favicon / logo

### 账号策略（补充）

- 用户密码由用户自设，**不要改登录方式**
- WebAuthn 误报提示在 OAuth-only 下抑制
- 多语言：Sign in with Campux / Set Password 等（en/zh/zh_TW/ko）

</details>

<details>
<summary><strong>SQLite 能力与限制</strong></summary>

| 项 | 支持情况 |
|----|----------|
| find / insert / update / delete / 分页排序投影 | 支持 |
| 查询算子 | `$eq $ne $gt $gte $lt $lte $in $nin $exists $regex $and $or $nor $size $all $elemMatch` |
| 更新算子 | `$set $unset $inc $push $pull $addToSet $pop` |
| findOneAndUpdate / upsert | 支持 |
| aggregate | `$match $project $unwind $group $sort $limit $skip $count` 等 |
| 索引 | 仅元数据（查询在内存匹配） |
| 全文 / 分片 / 副本集 | 不支持 |

规模：班级/校级（数百～数千用户）可用；更大请换数据库方案。

自检：

```bash
node .cache/ts-out/packages/hydrooj/service/sqlite.smoke.js
```

| 文件 | 作用 |
|------|------|
| `packages/hydrooj/src/service/sqlite.ts` | SQLite 适配层 |
| `packages/hydrooj/src/service/db.ts` | `sqlite:` URL 切换 |
| `scripts/start-sqlite.sh` / `.cmd` | Linux / Windows 一键启动 |
| `scripts/start-sqlite.cmd` | Windows 一键启动 |

</details>

<details>
<summary><strong>关键代码 / 验证 / 生产清单</strong></summary>

| 区域 | 路径 |
|------|------|
| OAuth 插件（PKCE、自动注册、QQ 映射） | `packages/login-with-campux/` |
| 登录 / 强制设密 | `packages/hydrooj/src/handler/user.ts` |
| 首设免当前密码 | `packages/hydrooj/src/handler/home.ts` |
| 头像回落 | `packages/hydrooj/src/lib/avatar.ts` |
| 登录 / 导航 / 设密模板 | `packages/ui-default/templates/` |
| Service Worker | `packages/ui-default/service-worker.ts` |

```bash
node -r @hydrooj/register --test packages/login-with-campux/pkce.test.ts
```

生产：备份 `data/hydro.db`（或指定库路径）、正式 `server.url`（尾 `/`）、Campux allowlist、密钥不进 git、超管 `1692138502` 验证、页脚 `Powered by Hydro`、重建 UI 则重打 patch。

</details>

---

以下为上游 Hydro 原始自述文档内容。



# Hydro

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/hydro-dev/hydro/build.yml?branch=master)
![hydrooj](https://img.shields.io/npm/dm/hydrooj)
![npm](https://img.shields.io/npm/v/hydrooj?label=hydrooj)
![node-current](https://img.shields.io/node/v/hydrooj)
![GitHub contributors](https://img.shields.io/github/contributors/hydro-dev/Hydro)
![GitHub commit activity](https://img.shields.io/github/commit-activity/y/hydro-dev/Hydro)

Hydro 是一个高效信息学在线测评系统。易安装，跨平台，多功能，可扩展，有题库。

对于不熟悉 Linux 或是懒得运维的老师，我们也提供了免费开通即用的在线版本，  
详情前往 [https://hydro.ac](https://hydro.ac) 查看 [操作指引](https://hydro.ac/discuss/6172ceeed850d38c79ae18f9)  

将安装命令粘贴到控制台一键安装，安装后注册首个用户自动获得超级管理员权限。  
兼容主流 Linux 发行版，推荐使用 Debian 12，支持 arm64 设备（树莓派等）

```sh
LANG=zh . <(curl https://hydro.ac/setup.sh)
```

[中文文档](https://hydro.js.org/) / [English](./README-EN.md)  

相关文档若说明的不够详细，请提交 Pull Request 或联系开发组说明。  
bug 和功能建议请在 Issues 提出。  

## 系统特点

### 模块化设计，插件系统，功能热插拔

Hydro 设计了一套模块化的插件系统，可以方便地扩展系统功能。  
使用插件系统，可以在修改功能后，仍然保证系统的可升级性。  
Hydro 的所有历史版本均可平滑升级到最新版本。  

插件使用和开发指南，请前往文档 [插件](https://docs.hydro.ac/docs/Hydro/plugins) 和 [开发](https://docs.hydro.ac/docs/Hydro/dev/typescript) 章节。

### 跨平台兼容，数据一键备份/导入

Hydro 支持所有主流的 Linux 发行版，兼容 x86_64 和 arm64 架构设备，且均可一键安装。  
Hydro 可在 树莓派 或是 Apple M1/M2 上正常运行。

使用 `hydrooj backup` 即可备份系统全部数据，使用 `hydrooj restore 文件名` 即可导入备份数据。
整个过程无需手工干预。

### 单系统多空间，不同班级/院校，分开管理

Hydro 提供了单系统多空间支持，可以方便地为不同的班级/年级/院校等创建独立的空间。  
不同空间内除用户外数据默认隔离，且可分配独立管理员，互不干扰。  
题目可跨域复制，在系统内仅占用一份空间。

### 粒度精细的权限系统，灵活调节

Hydro 的权限可以按比赛/作业分配给对应的用户，也可以将用户分组（班级），按组分配权限。
有关权限节点，可以查看 [介绍](https://docs.hydro.ac/docs/Hydro) 下方截图。

### 规模化支持，上千用户无压力，伸缩组秒级自动扩展

Hydro 系统本身是无状态的，这意味着你可以随意增删服务节点，而不会影响系统的正常运行。
评测队列会自动在当前在线的所有评测机间均衡分配。接入弹性伸缩组后，可根据服务器负载情况自动增删评测机。
不像其他系统，Hydro 会管理不同服务器间的测试数据缓存，按需拉取，做到评测机上线即用，无需手动同步数据。

### 全题型支持，跟随时代潮流

Hydro 支持所有题型。无论是传统题型，Special Judge，还是文件输入输出，提交答案题，IO 交互，函数交互，乃至选择填空题等，
Hydro 都有相应的支持。安装相关运行环境后，Hydro 甚至可以做到：

- 调用小海龟画图，与标准图片比对；
- 调用 GPU 进行机器学习模型的评测；

更多的样例可前往 [样例区](https://hydro.ac/d/system_test/) 查看并下载。

### 丰富的题库

Hydro 支持导入常见格式的题库文件，包括 Hydro 通用的 zip 格式，HUSTOJ 导出的 FPS (xml) 格式题目，QDUOJ 导出的压缩包。  
可以在 [Hydro 题库](https://hydro.ac/d/tk/p) 下载免费题库使用。  
Hydro 同时支持 VJudge，这意味着你可以直接在系统内导入其他平台的题目，修改题面后编入自己的作业或比赛，快速搭建自己的题库体系。  
当前支持的平台有：  

- [一本通编程启蒙](https://hydro.ac/ybtbas.zip)：官方提供一本通编程启蒙题库，免费使用，参照压缩包内导入说明。
- [深入浅出程序设计竞赛](https://hydro.ac/srqc.zip)：官方提供洛谷《深入浅出程序设计竞赛(基础篇)》配套题库，免费使用，参照压缩包内导入说明。
- [UOJ](https://uoj.ac)：国内知名 OJ，国家集训队常用；
- [Codeforces](https://codeforces.com)：国外大型竞赛平台，大量高质量题目；
- [洛谷](https://www.luogu.com.cn)：使用此功能需要向洛谷购买授权；
- [HDUOJ](https://acm.hdu.edu.cn)：杭州电子科技大学在线评测系统，其中包含多校训练题；
- [CSGOJ](https://cpc.csgrandeur.cn)：广东省赛与湖南省赛赛题评测平台；
- [SPOJ](https://www.spoj.com)：国内连接很不稳定，不推荐；
- [POJ](https://poj.org)：较为古董，服务器稳定性差；
- [YACS](https://iai.sh.cn)：上海市计算机学会竞赛平台，单账号每日提交有限制；
- HUSTOJ：理论上支持所有 HUSTOJ 驱动的系统，但由于各个系统中 UI 有差异，通常需要手动适配。

### 多赛制支持

Hydro 支持多种赛制，包括 ACM/ICPC 赛制（支持封榜），OI 赛制，IOI 赛制，乐多赛制，以及作业功能。  
在 IOI 和 OI 赛制下，支持订正题目功能，学生在赛后可以在题库中提交对应题目，其分数会在榜单旁边显示。  
在 IOI 和 OI 赛制下，支持灵活时间功能，学生可以在设定的时间范围内，自选 X 小时参赛。  

### 轻松添加其他编程语言

Hydro 的语言设置并非硬编码于系统中，而是使用了配置文件。
只要能写出对应语言的编译命令和运行命令，Hydro 都可以进行判题。

## 联系我们

Email：i@undefined.moe
Telegram [@undefinedmoe](https://t.me/undefinedmoe)  
Hydro 用户群：1085853538  

注：加入用户群请先阅读[《提问的智慧》](https://github.com/ryanhanwu/How-To-Ask-Questions-The-Smart-Way/blob/main/README-zh_CN.md)。  
同时群内可能存在部分令您感到不适或感到冒犯的内容。若对此有顾虑**请勿加群**。

## 开源许可

本项目中 framework/ examples/ install/ 下的内容采用 MIT 协议授权，您可自由使用。  
本项目中 packages/ui-default/ 下的内容仅采用 AGPL-3.0 进行授权。  
项目其余部分使用双重许可：

1. 您可以在遵守 AGPL-3.0 许可证和下述附加条款章节的前提下免费使用这些代码：  
2. 如确需闭源，您也可以联系我们购买其他授权。

### 附加条款

基于 AGPL3 协议第七条，您在使用本项目时，需要遵守以下额外条款：

1. 不可移除本项目的版权声明与作者/来源署名；（[AGPL3 7(b)](LICENSE#L356)）
2. 当重分发经修改后的本软件时，需要在软件名或版本号中采用可识别的方式进行注明；（[AGPL3 7(c)](LICENSE#L360)）
3. 除非得到许可，不得以宣传为目的使用作者姓名；（[AGPL3 7(d)](LICENSE#364)）

即：  
在您部署 Hydro 时，需要保留底部的 `Powered by Hydro` 字样，其中的 `Hydro` 字样需指向 `hydro.js.org/本仓库/fork` 之一的链接。  
若您对源码做出修改/扩展，同样需要以 AGPL-3.0-or-later 开源，您可以以 `Powered by Hydro, Modified by xxx` 格式在页脚注明。  

## 贡献代码

参照 [CONTRIBUTING.md](CONTRIBUTING.md)

## 鸣谢

排名不分先后，按照链接字典序  

- [GitHub](https://github.com/) 为 Hydro 提供了代码托管与自动构建。  
- [criyle](https://github.com/criyle) 提供评测沙箱实现。  
- [Vijos](https://github.com/vijos/vj4) 为 Hydro 提供了 UI 框架。  

## Sponsors

- [云斗学院](https://www.yundouxueyuan.com)
