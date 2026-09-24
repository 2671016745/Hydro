# 奎光 OJ · Campux OAuth 登录（Hydro fork）

桂林市奎光学校 Hydro OJ：站名 **「奎光」**，登录 **只走 Campux OAuth**，UI 用校徽 / 校园画 branding，页脚保留 `Powered by Hydro`。

下面各节默认折叠，点标题展开。

<details>
<summary><strong>1. 环境依赖（要装啥）</strong></summary>

### 1.1 必装

| 依赖 | 版本建议 | 用途 | 安装 |
|------|----------|------|------|
| **Node.js** | 20+（本机验证 24.x） | 运行 Hydro / 脚本 | <https://nodejs.org> 或 `winget install OpenJS.NodeJS.LTS` |
| **Git** | 任意近期版本 | 克隆 / 更新 | <https://git-scm.com> |
| **Yarn** | Corepack | 安装 workspace | `corepack enable`（**不要** `npm i -g yarn`） |
| **Yarn 依赖** | `yarn.lock` | Hydro + UI + 插件 | 仓库根目录 `yarn install` |
| **mongodb-memory-server** | 根 `package.json` devDependencies | 本地内存 Mongo | 随 `yarn install`；**首次会下载 mongod** |

```powershell
# Windows / 通用
cd D:\github\Hydro
corepack enable
corepack prepare yarn@stable --activate
yarn install
```

```bash
# Linux / macOS
cd /path/to/Hydro
corepack enable && yarn install
```

`postinstall` 会跑 `node build/prepare.js`，属正常现象。

### 1.2 联调脚本（`data/`，git 忽略）

| 脚本 | 平台 | 作用 |
|------|------|------|
| `data/start-memory-mongo.js` | 通用 | 内存 Mongo，写 `~/.hydro/config.json` |
| `data/start-mongo.cmd` / `start-mongo.sh` | Win / Linux | 上面脚本的包装 |
| `data/start-hydro.cmd` / `start-hydro.sh` | Win / Linux | 站名/头像/LAN + OAuth + 启动 worker |
| `data/start-all.cmd` / `start-all.sh` | Win / Linux | **一键** Mongo + Hydro |
| `data/set-hydro-lan.js` | 通用 | 自动探测局域网 IP |
| `data/set-site-name.js` | 通用 | 站名「奎光」 |
| `data/set-domain-avatar.js` | 通用 | 域名头像 = 校徽 |
| `data/patch-*.py` | 通用 | 预构建 UI 手工补丁 |

Linux 密钥可放 scripts/env.campux（chmod 600，**勿提交**），或直接 export 环境变量。

### 1.3 可选 / 不用装

| 场景 | 需要 |
|------|------|
| 完整重建 UI | Linux/macOS 推荐；**Windows `build:ui` 会失败** |
| 只改模板/校徽图 | 无需重建 UI |
| 生产 | **持久化 MongoDB** |
| 补丁脚本 | Python 3 |
| 单独 MongoDB / PM2 / Nginx | 联调不需要 |

</details>

<details>
<summary><strong>2. 快捷启动</strong></summary>

### 2.1 Windows 一键

```powershell
cd D:\github\Hydro
data\start-all.cmd
```

### 2.2 Linux / macOS 一键

```bash
cd /path/to/Hydro
chmod +x data/*.sh          # 首次
# 密钥：export 或写入 scripts/env.campux（见下）
scripts/start-all.sh
```

`start-all.sh` 会：后台起内存 Mongo → 等 `~/.hydro/config.json` → 写站名/头像/LAN → 读 OAuth 环境变量 → 前台跑 Hydro（Ctrl+C 一并停 Mongo）。

Linux 密钥示例 scripts/env.campux（**不要提交**）：

```bash
export CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
export CAMPUX_OAUTH_CLIENT_ID=你的ID
export CAMPUX_OAUTH_CLIENT_SECRET=你的SECRET
export CAMPUX_OAUTH_SCOPE=profile
export CAMPUX_ADMIN_QQ=1692138502
chmod 600 scripts/env.campux
```

### 2.3 双窗口（排错）

```bash
# 窗口 A
scripts/start-mongo.sh    # 或 start-mongo.cmd

# 窗口 B
scripts/start-hydro.sh    # 或 start-hydro.cmd
```

### 2.4 启动后自检

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/misc/guiguang-campus.jpg
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8888/img/guiguang-school-badge.png
```

> **改模板 / TS 后必须重启 Hydro**，前端 JS 不热更。

</details>

<details>
<summary><strong>3. 功能总览</strong></summary>

### 登录 / OAuth

- Campux OAuth2 + PKCE S256；只保留 Campux
- 自动注册；`redirect_uri` 按**浏览器 Host** 生成并用于 token 交换
- 首次自动注册后强制设密 **只一次**；首设免「当前密码」

### 账号映射

| Campux / QQ | Hydro |
|-------------|--------|
| `username`（QQ 昵称） | 用户名 |
| `name`（QQ 号） | **UID** |
| QQ 头像 | `qq:<qq>` |
| 合成邮箱 | `<qq>@campux.hydro.local` |
| `CAMPUX_ADMIN_QQ` | `PRIV_ALL` |

### UI

- 登录页：校园画 + 白底校徽 + Campux 按钮
- 空头像回落 `/img/avatar.png`（不用 Gravatar）
- SW `ui-resources-cache-v2`，不预缓存 favicon/logo

</details>

<details>
<summary><strong>4. OAuth / Campux 配置（含 redirect_uri）</strong></summary>

### 环境变量

```env
CAMPUX_OAUTH_ENDPOINT=https://kg.campux.top
CAMPUX_OAUTH_CLIENT_ID=<id>
CAMPUX_OAUTH_CLIENT_SECRET=<secret>
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

Scope **只用 `profile`**（`tenant` 需 allowlist 授权，本部署不用）。

### redirect_uri 必须登记

插件按当前 Host 生成 callback，**每个访问入口都要在 Campux 应用 allowlist 登记**：

```text
http://127.0.0.1:8888/oauth/campux/callback
http://<当前局域网IP>:8888/oauth/campux/callback
https://<正式域名>/oauth/campux/callback
```

> 报 **「redirect_uri 未在应用中注册」** 时：多半是 IP/域名变了，把**实际访问地址**的 callback 加进 Campux。

`server.url` 仍建议以 `/` 结尾（Host 缺失时的回退）。

### UserInfo

| 字段 | 必需 | 含义 |
|------|------|------|
| `sub` | 是 | 稳定用户 ID |
| `name` | 是 | QQ 号 → UID |
| `username` | 否 | QQ 昵称 |

</details>

<details>
<summary><strong>5. 潜在问题（Windows / Linux）</strong></summary>

| 问题 | Windows | Linux |
|------|---------|-------|
| `build:ui` Stylus/rupture 失败 | **有**，用预构建 + `data/patch-*.py` | 一般没有 |
| 中文写进启动脚本变 `濂庡厜` | **有**（`.cmd`/PowerShell 编码） | 少见；保持 UTF-8 |
| `curl` 是 PowerShell 别名 | **有**，用 `curl.exe` | 无 |
| 内存 Mongo 重启丢站名/头像 | **有** | **有**（`start-*.sh` 已自动重放） |
| `redirect_uri` 未登记 | **有** | **有**（与平台无关） |
| 进程守护 | 弱（独立窗口） | `systemd` / `pm2` |

### 其它高发

- 登录背景/图标「没了」→ 多半 SW/浏览器缓存，清站点数据
- 重建 UI 后 WebAuthn 报错/无头像 → 重跑三个 `data/patch-*.py`
- 反复强制设密 → 不应发生；查 `noLocalPassword` 是否被手改

</details>

<details>
<summary><strong>6. 关键代码位置</strong></summary>

| 区域 | 路径 |
|------|------|
| OAuth 插件 | `packages/login-with-campux/` |
| 登录/自动注册/强制设密 | `packages/hydrooj/src/handler/user.ts` |
| 首设免当前密码 | `packages/hydrooj/src/handler/home.ts` |
| 头像回落 | `packages/hydrooj/src/lib/avatar.ts` |
| 登录/导航/设密模板 | `packages/ui-default/templates/...` |
| Service Worker | `packages/ui-default/service-worker.ts` |

</details>

<details>
<summary><strong>7. 验证命令</strong></summary>

```bash
node -r @hydrooj/register --test packages/login-with-campux/pkce.test.ts
corepack yarn tsc -b packages/hydrooj/tsconfig.json packages/login-with-campux/tsconfig.json --pretty false --force
```

</details>

<details>
<summary><strong>8. 生产部署检查清单</strong></summary>

- [ ] Node 20+，`yarn install` 成功
- [ ] **持久化 MongoDB**
- [ ] `server.url` = 正式域名，尾 `/`
- [ ] Campux allowlist 只保留需要的回调（含正式域名）
- [ ] `CAMPUX_OAUTH_SCOPE=profile`
- [ ] 密钥走环境变量 / `.hydro/env` / scripts/env.campux，**不进 git**
- [ ] 超管 `1692138502` 验证
- [ ] 页脚 `Powered by Hydro`
- [ ] 若重建 UI：重打 `data/patch-*.py`
- [ ] Linux：UTF-8 locale；`systemd`/`pm2` 守护

</details>

<details>
<summary><strong>9. 详细文档</strong></summary>

- [`packages/login-with-campux/README.md`](packages/login-with-campux/README.md)
- [`.env.campux.example`](.env.campux.example)
- 上游：[hydro.js.org](https://hydro.js.org/)

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
