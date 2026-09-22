# Campux OAuth 登录（Hydro fork）

这是 [Hydro](https://github.com/hydro-dev/Hydro) 的定制 fork：**只允许通过 Campux 校园墙账号登录**。

适合校园场景：用户使用已有 Campux / QQ 身份进入 OJ，无需在 Hydro 再维护一套账号密码。

## 功能

- 使用 [Campux](https://github.com/idoknow/Campux) OAuth2 + PKCE S256 登录
- 关闭 Hydro 内置密码登录与其它 OAuth provider
- 未绑定用户首次登录自动创建 Hydro 账号（自动注册，不要求设置本地密码）
- 配置的管理员 QQ（默认 `1692138502`）自动获得 Hydro 超级管理员权限
- 登录页与登录弹窗不再显示“忘记密码 / 用户名”入口
- 登录页文案适配英文、简体中文、繁体中文、韩文
- 未设置语言时按浏览器 `Accept-Language` 自动选择；无匹配语言时回退英文

## 必需配置

启动前必须提供 Campux OAuth 凭据，否则 Hydro worker 会直接报错退出。

可复制 `.env.campux.example` 作为模板：

```env
CAMPUX_OAUTH_ENDPOINT=https://app.campux.top
CAMPUX_OAUTH_CLIENT_ID=<Campux 后台创建的 Client ID>
CAMPUX_OAUTH_CLIENT_SECRET=<Campux 后台创建的 Client Secret>
CAMPUX_OAUTH_SCOPE=profile
CAMPUX_ADMIN_QQ=1692138502
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CAMPUX_OAUTH_ENDPOINT` | Campux 站点地址 | `https://app.campux.top` |
| `CAMPUX_OAUTH_CLIENT_ID` | OAuth Client ID | 必填 |
| `CAMPUX_OAUTH_CLIENT_SECRET` | OAuth Client Secret | 必填 |
| `CAMPUX_OAUTH_SCOPE` | OAuth scope | `profile` |
| `CAMPUX_ADMIN_QQ` | 自动授予超级管理员的 QQ 号 | `1692138502` |

环境变量可写入系统环境、`.hydro/env`，或在启动脚本中导出。

## Campux 侧配置

在 Campux 管理后台创建 OAuth 应用，并登记 Hydro 回调地址：

```text
https://<你的 Hydro 域名>/oauth/campux/callback
```

本地联调示例：

```text
http://192.168.18.11:8888/oauth/campux/callback
```

Campux OAuth 应用建议配置：

| 项目 | 值 |
|------|----|
| Authorization URL | `/oauth/authorize` |
| Token URL | `/oauth/token` |
| UserInfo URL | `/oauth/userinfo` |
| PKCE | `S256`（插件自动处理） |
| Scope | `profile` |

同时把 Hydro 的 `server.url` 设置为以 `/` 结尾的对外访问地址，例如：

```text
https://oj.example.com/
```

## 行为说明

- 登录页只显示 Campux 入口；内置用户名/密码表单不会渲染。
- 直接访问 `/lostpass` 会在内置密码登录关闭时返回 `Builtin login is disabled.`
- Campux userinfo 约定：`sub` 为稳定用户 ID，`name` 为 QQ 号。
- 新用户邮箱使用稳定合成地址：`<qq>@campux.hydro.local`
- 用户文档会写入 `qq`、`campuxUserId`、`campuxTenantId`、`campuxTenantName`
- OAuth 绑定写入 MongoDB `oauth` collection（`platform` + `id` 唯一），无需额外迁移
- 管理员 QQ 已存在时，插件启动时也会补齐 `PRIV_ALL`

## 语言与界面

- 登录页使用 Hydro 原生山景沉浸式布局，只保留 Campux 单一登录动作
- 登录文案已接入：
  - English
  - 简体中文
  - 繁体中文
  - 한국어
- 界面语言优先级：

```text
用户手动选择 → 浏览器系统语言 → 英文 → 站点默认语言
```

## 本地开发启动（示例）

```powershell
# 1. 启动 MongoDB（或使用已有实例）
node data/start-memory-mongo.js

# 2. 配置 UI addon（如使用官方 ui-default）
#    %USERPROFILE%\.hydro\addon.json
#    ["@hydrooj/ui-default"]

# 3. 导出 Campux OAuth 环境变量后启动
node -r @hydrooj/register packages/hydrooj/bin/hydrooj.js --host 0.0.0.0 --port 8888 --public
```

## 详细文档

插件实现、接口约定与排错说明见：

- [`packages/login-with-campux/README.md`](packages/login-with-campux/README.md)
- 环境变量模板：[`.env.campux.example`](.env.campux.example)

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
