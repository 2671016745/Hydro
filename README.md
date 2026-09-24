# 奎光 OJ · Campux OAuth 登录（Hydro fork）

这是 [Hydro](https://github.com/hydro-dev/Hydro) 的定制 fork，为 **桂林市奎光学校** 部署：

- 站名：**「奎光」**
- 登录 **只走 Campux 校园墙 OAuth**（无本地密码登录、无其它 OAuth、无找回密码）
- UI 使用校徽 / 校园画 branding
- 页脚按 AGPL 保留 `Powered by Hydro`

适合校园场景：用户使用已有 Campux / QQ 身份进入 OJ，无需在 Hydro 再维护一套账号密码。

---

## 1. 环境依赖（要装啥）

### 1.1 必装

| 依赖 | 版本建议 | 用途 | 安装 |
|------|----------|------|------|
| **Node.js** | 20+（本机验证 24.x） | 运行 Hydro / Mongo 脚本 | <https://nodejs.org> 或 `winget install OpenJS.NodeJS.LTS` |
| **Git** | 任意近期版本 | 克隆 / 更新仓库 | <https://git-scm.com> 或 `winget install Git.Git` |
| **Yarn** | 通过 Corepack 启用 | 安装 workspace 依赖 | 见下方命令（**不要**单独 `npm i -g yarn` 装 Yarn 1） |
| **Yarn 依赖包** | `yarn.lock` 锁定 | Hydro 本体 + UI + 插件 | 仓库根目录执行一次 `yarn install` |
| **mongodb-memory-server** | 已在根 `package.json` 的 devDependencies | 本地内存 Mongo | 随 `yarn install` 装好；**首次启动会下载 mongod 二进制** |

启用 Yarn（仓库用 Corepack + Yarn Berry，`nodeLinker: node-modules`）：

```powershell
# 在仓库根目录
corepack enable
corepack prepare yarn@stable --activate   # 或项目指定版本
yarn -v
```

首次拉依赖：

```powershell
cd D:\github\Hydro
yarn install
# postinstall 会跑 node build/prepare.js，属正常现象
```

> 首次 `yarn install` 需要网络；失败多半是代理 / 镜像问题，可设 `npm_config_registry` 或公司代理后再试。

### 1.2 联调用（已提供脚本，无需另装）

| 脚本 | 作用 |
|------|------|
| `data/start-memory-mongo.js` | 启动内存 Mongo，写 `~/.hydro/config.json` 与 `addon.json` |
| `data/start-mongo.cmd` | 上面脚本的 cmd 包装 |
| `data/start-hydro.cmd` | 设站名/域名头像/LAN URL + OAuth 环境变量 + 启动 worker |
| `data/start-all.cmd` | **一键**：先起 Mongo，再起 Hydro（推荐） |
| `data/set-hydro-lan.js` | 自动探测局域网 IP 写入 `server.url` |
| `data/set-site-name.js` | 站名「奎光」 |
| `data/set-domain-avatar.js` | 域名头像 = 校徽 |
| `data/patch-*.py` | 预构建 UI 的手工补丁（见 §5） |

### 1.3 可选 / 场景依赖

| 场景 | 需要 |
|------|------|
| 改 UI 并 **完整重建** 前端 | 能跑 `yarn build:ui` 的环境（Linux/macOS 或修好 Stylus 的 Windows）+ 较大内存（生产构建脚本给了 8GB） |
| 只改模板 / 校徽图 | **不需要** 重建 UI；改完重启 Hydro 即可 |
| 生产部署 | **持久化 MongoDB**（系统包或 Docker），不要用内存 Mongo |
| 打补丁脚本 `data/patch-*.py` | Python 3（写文件用 UTF-8） |
| 测 PKCE / 类型检查 | 见 §7 验证命令 |

### 1.4 不需要单独安装的

- MongoDB 服务端（联调用 `mongodb-memory-server` 即可）
- PM2 / Nginx（本地联调不需要；生产再配）
- Campux 服务端本体（走线上 `https://kg.campux.top`）

---

## 2. 快捷启动

### 2.1 一键（推荐）

```powershell
cd D:\github\Hydro
data\start-all.cmd
```

脚本会：

1. 新开窗口启动内存 Mongo  
2. 等待 `~/.hydro/config.json` 写好  
3. 写入站名 / 域名头像 / LAN URL  
4. 导出 Campux OAuth 环境变量并启动 Hydro  

浏览器打开日志里打印的地址，或：

```text
http://127.0.0.1:8888/
http://<局域网IP>:8888/
```

### 2.2 两个窗口（排错时更直观）

```powershell
# 窗口 A：内存 Mongo
cd D:\github\Hydro
data\start-mongo.cmd

# 窗口 B：等 A 打出 MONGO_URI 后
cd D:\github\Hydro
data\start-hydro.cmd
```

### 2.3 手工最小步骤（理解原理）

```powershell
cd D:\github\Hydro

# 1) 起 Mongo（会写 ~/.hydro/config.json）
node data\start-memory-mongo.js

# 2) 另开终端，写站点配置
node data\set-hydro-lan.js
node data\set-site-name.js          # 默认「奎光」
node data\set-domain-avatar.js

# 3) 导出 OAuth 环境变量（密钥在 data/start-hydro.cmd，勿外传）
$env:CAMPUX_OAUTH_ENDPOINT = 'https://kg.campux.top'
$env:CAMPUX_OAUTH_CLIENT_ID = '<ID>'
$env:CAMPUX_OAUTH_CLIENT_SECRET = '<SECRET>'
$env:CAMPUX_OAUTH_SCOPE = 'profile'
$env:CAMPUX_ADMIN_QQ = '1692138502'

# 4) 启动
node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js --host 0.0.0.0 --port 8888 --public
```

### 2.4 启动后自检（约 10 秒）

```powershell
# 端口在听？
Get-NetTCPConnection -LocalPort 8888

# 首页 200 且标题含「奎光」？
curl.exe -s -o NUL -w "%%{http_code}" http://127.0.0.1:8888/

# 登录页品牌资源可访问？
curl.exe -s -o NUL -w "campus=%%{http_code}\n" http://127.0.0.1:8888/misc/guiguang-campus.jpg
curl.exe -s -o NUL -w "badge=%%{http_code}\n"  http://127.0.0.1:8888/img/guiguang-school-badge.png
```

日志：`data/hydro.log`、`data/hydro.err.log`、`data/mongo.log`。

> **改模板 / TS 后必须重启 Hydro。** 已构建的 UI JS 不会热更。

---

## 3. 功能总览

### 3.1 登录与 OAuth

- Campux OAuth2 + **PKCE S256**
- 只保留 Campux；关闭内置密码登录 / 其它 OAuth / 找回密码
- 未绑定用户首次登录 **自动注册**
- WebAuthn 自动填充误报提示在 OAuth-only 下抑制

### 3.2 账号映射与权限

| Campux / QQ | Hydro |
|-------------|--------|
| `username`（QQ 昵称） | 用户名（冲突时回退 QQ 号 / `campux_<sub>`） |
| `name`（QQ 号） | **UID** |
| QQ 头像 | 头像 `qq:<qq>` |
| 合成邮箱 | `<qq>@campux.hydro.local` |
| `CAMPUX_ADMIN_QQ` | 自动 `PRIV_ALL` |

- **首次 OAuth 自动注册后强制设密码，且只强制一次**（`noLocalPassword` 仅 autoRegister 写入；已有用户登录不再重置）
- 首次设密 **不需要** 当前密码
- 用户自己设的密码保留，不要改回密码登录

### 3.3 站点 UI / 品牌

- 站名 **「奎光」**
- 登录页：校园画满幅 + 白底方形校徽 + Campux 官方 SVG 按钮
- 导航：左校徽（`?v=school`）+ 右上 QQ 头像/昵称
- 空头像回落 `/img/avatar.png`（**不用 Gravatar**）
- SW 缓存 `ui-resources-cache-v2`，不预缓存 favicon / logo / nav-logo

| 素材 | 路径 |
|------|------|
| 白底方形校徽 | `packages/ui-default/static/img/guiguang-school-badge.png` |
| 透明校徽 logo | `packages/ui-default/static/img/guiguang-school-logo.png` |
| Campux logo | `packages/ui-default/static/img/campux-logo.svg` |
| 默认头像 | `packages/ui-default/static/img/avatar.png` |
| 校园画 | `packages/ui-default/static/misc/guiguang-campus.jpg` |
| 导航 logo | `packages/ui-default/public/components/navigation/nav-logo-small_dark.png` |

---

## 4. OAuth / Campux 配置

### 4.1 环境变量

**密钥只放 `data/`（git 忽略）或部署环境变量，禁止进 git、禁止外传。**

```env
# 端点是 kg.campux.top，不是 app.campux.top
CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
CAMPUX_OAUTH_CLIENT_ID=<Client ID>
CAMPUX_OAUTH_CLIENT_SECRET=<Client Secret>
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

| 变量 | 说明 | 默认 / 要求 |
|------|------|-------------|
| `CAMPUX_OAUTH_ENDPOINT` | Campux 站点 | `https://kg.campux.top` |
| `CAMPUX_OAUTH_CLIENT_ID` | Client ID | **必填**，缺则 worker 退出 |
| `CAMPUX_OAUTH_CLIENT_SECRET` | Client Secret | **必填**，缺则 worker 退出 |
| `CAMPUX_OAUTH_SCOPE` | Scope | `profile` |
| `CAMPUX_ADMIN_QQ` | 超管 QQ | `1692138502` |

### 4.2 Scope 坑

**只使用 `profile`。** 申请 `tenant` 会报「不支持的 scope: tenant」，除非 Campux 应用 allowlist 勾了它。

### 4.3 UserInfo

| 字段 | 必需 | 含义 |
|------|------|------|
| `sub` | 是 | 稳定用户 ID |
| `name` | 是 | **QQ 号**（5–20 位纯数字）→ UID |
| `username` | 否 | **QQ 昵称** |
| `tenant_*` | 否 | 本部署不用 |

### 4.4 回调登记

在 Campux 后台登记 **所有** 会用到的回调（与浏览器实际 host 一致）：

```text
https://<正式域名>/oauth/campux/callback
http://127.0.0.1:8888/oauth/campux/callback
http://<局域网IP>:8888/oauth/campux/callback
```

| 应用项 | 值 |
|--------|----|
| Authorization URL | `{endpoint}/oauth/authorize` |
| Token URL | `{endpoint}/oauth/token` |
| UserInfo URL | `{endpoint}/oauth/userinfo` |
| PKCE | `S256`（插件自动处理） |
| Scope | `profile` |

`server.url` 必须 **以 `/` 结尾**，例如 `http://192.168.18.11:8888/`。

---

## 5. 潜在问题（提前避坑）

### 5.1 安装 / 依赖

| 现象 | 原因 | 处理 |
|------|------|------|
| `yarn` 命令找不到或版本不对 | 未启用 Corepack / 装了全局 Yarn 1 | `corepack enable` 后用仓库 Yarn；删掉全局 yarn 1 |
| `yarn install` 很慢或失败 | 网络 / 镜像 / 代理 | 配代理或 registry；企业网注意 SSL 检查 |
| 首次起 Mongo 卡很久 | `mongodb-memory-server` **首次下载 mongod** | 等待完成；或预置二进制 / 换持久化 Mongo |
| `Cannot find module 'mongodb'` | 脚本在错误目录执行 | 必须在 `D:\github\Hydro` 下 `node data\...`（用仓库依赖） |
| 启动报缺 `CAMPUX_OAUTH_CLIENT_ID/SECRET` | 环境变量未导出 | 使用 `data/start-hydro.cmd`，或手动 set 后再启 |

### 5.2 端口 / 进程

| 现象 | 处理 |
|------|------|
| 8888 被占用 | `Get-NetTCPConnection -LocalPort 8888` 找到 PID 后结束，或改端口 |
| Mongo 端口每次都变 | 内存 Mongo **随机端口**，URI 在 `~/.hydro/config.json`；正常现象 |
| 关窗口后服务没了 | cmd 是前台/子进程；用 `start-all.cmd` 的独立窗口，或改用持久化 Mongo + 进程守护 |
| 改了模板不生效 | **必须重启 Hydro**；前端 chunk 不热更 |

### 5.3 品牌 / UI（高发）

| 现象 | 原因 | 处理 |
|------|------|------|
| 重启后域名头像 / 站名回默认 | **内存 Mongo 清空**，库内配置丢失 | `start-hydro.cmd` / `start-all.cmd` 已自动重跑 `set-site-name.js`、`set-domain-avatar.js` |
| 登录背景 / 校徽丢 | 多半是 **SW / 浏览器缓存**，不是文件没了 | 清站点数据，或强刷；确认 `/misc/guiguang-campus.jpg` 200 |
| 图标仍是旧 Hydro | SW 预缓存旧 favicon | 清站点数据；SW v2 已排除 favicon/logo |
| 中文站名变 `濂庡厜` | **`.cmd` 编码** 把 UTF-8 当 ANSI | 勿把中文写进 `.cmd`；站名默认值只放在 `set-site-name.js` |
| `build:ui` 在 Windows 失败 | Stylus / rupture | **不要**在 Windows 重建；用 npm `@hydrooj/ui-default@4.58.5` 预构建进 `packages/ui-default/public/` |
| 重建 UI 后 WebAuthn 报错 / 无导航头像 / SW 异常 | 产物丢了手工补丁 | 重跑 `data/patch-webauthn-guard.py`、`patch-nav-avatar.py`、`patch-sw.py` |

### 5.4 登录 / 账号

| 现象 | 处理 |
|------|------|
| 回调后 token / state 错误 | 回调 host 必须与访问地址一致；`server.url` 带尾 `/`；同一浏览器会话完成跳转 |
| 仍出现密码登录 | 查环境变量与日志 `Campux OAuth enabled`；换无缓存窗口开 `/login` |
| 反复强制设密码 | 不应发生。`noLocalPassword` 只在 autoRegister 写入；若复现检查是否手动改过该字段 |
| 超管权限不对 | 确认 `CAMPUX_ADMIN_QQ=1692138502` 且该 QQ 能登录；插件启动时会补 `PRIV_ALL` |
| Scope 报错「不支持的 tenant」 | 改回 `SCOPE=profile`，或在 Campux 应用 allowlist 勾选 |

### 5.5 数据与安全

| 风险 | 说明 |
|------|------|
| 内存 Mongo **无持久化** | 用户/题目/设置重启即没；只适合联调 |
| 密钥进 git | **禁止**。`data/` 保持 untracked；生产用环境变量 |
| 改用户登录方式 | **禁止**。密码是用户自己设的 |
| AGPL 页脚 | 保留 `Powered by Hydro` |

---

## 6. 关键代码位置

| 区域 | 路径 |
|------|------|
| OAuth 插件（PKCE、自动注册、QQ 映射） | `packages/login-with-campux/` |
| 登录 / 自动注册 / 强制设密 | `packages/hydrooj/src/handler/user.ts` |
| 首次设密免当前密码 | `packages/hydrooj/src/handler/home.ts` |
| 头像回落 | `packages/hydrooj/src/lib/avatar.ts` |
| 登录页模板 | `packages/ui-default/templates/user_login.html` |
| 导航模板 | `packages/ui-default/templates/partials/nav.html` |
| 设密页 | `packages/ui-default/templates/user_setpass.html` |
| favicon cache-bust | `packages/ui-default/templates/layout/html5.html` |
| Service Worker | `packages/ui-default/service-worker.ts` |
| 多语言 | `packages/ui-default/locales/{en,zh,zh_TW,ko}.yaml` |
| 插件加载 / 环境变量校验 | `packages/hydrooj/src/entry/worker.ts` |

---

## 7. 验证命令

```powershell
cd D:\github\Hydro

# PKCE 单元测试
node -r @hydrooj/register --test packages/login-with-campux/pkce.test.ts

# TypeScript
corepack yarn tsc -b packages/hydrooj/tsconfig.json packages/login-with-campux/tsconfig.json --pretty false --force
```

---

## 8. 生产部署检查清单

- [ ] Node 20+，`yarn install` 成功
- [ ] **持久化 MongoDB**（不要内存 Mongo）
- [ ] `server.url` = 正式域名，且以 `/` 结尾
- [ ] Campux allowlist 只保留需要的正式回调
- [ ] `CAMPUX_OAUTH_SCOPE=profile`
- [ ] 密钥用环境变量 / `.hydro/env`，不进 git
- [ ] 超管 `1692138502` 登录验证权限
- [ ] 页脚 `Powered by Hydro` 仍在
- [ ] 若重建 UI：重打 `data/patch-*.py` 三个补丁
- [ ] 用户支持话术：图标旧 → 清 SW / 站点数据

---

## 9. 行为说明（补充）

- 登录页只显示 Campux 入口
- `/lostpass` 在密码登录关闭时返回 `Builtin login is disabled.`
- 语言优先级：`手动选择 → Accept-Language → 英文 → 站点默认`
- 本机 LAN IP 由 `set-hydro-lan.js` 自动探测，换网段后重启即可

---

## 10. 详细文档

- [`packages/login-with-campux/README.md`](packages/login-with-campux/README.md)：插件细节与排错
- [`.env.campux.example`](.env.campux.example)：环境变量模板
- 上游文档：[hydro.js.org](https://hydro.js.org/)

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
