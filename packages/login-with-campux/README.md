# login-with-campux

Hydro fork 内置的 Campux OAuth 登录插件。启用后：

- Hydro **只保留 Campux OAuth** 登录
- 内置密码登录被关闭
- 其它 OAuth provider 会被移除
- 未绑定的 Campux 用户首次登录自动创建 Hydro 账号
- 指定 QQ 自动授予 Hydro 超级管理员权限

## 环境变量

```env
# Campux 站点地址
CAMPUX_OAUTH_ENDPOINT=https://app.campux.top

# 必填：Campux 管理后台创建的 OAuth 应用凭据
CAMPUX_OAUTH_CLIENT_ID=
CAMPUX_OAUTH_CLIENT_SECRET=

# OAuth scope
CAMPUX_OAUTH_SCOPE=profile tenant

# 自动授予 Hydro 超级管理员的 QQ 号
CAMPUX_ADMIN_QQ=1692138502
```

缺少 `CAMPUX_OAUTH_CLIENT_ID` 或 `CAMPUX_OAUTH_CLIENT_SECRET` 时，worker 启动会失败。

## 回调地址

必须在 Campux OAuth 应用中登记 Hydro 回调地址：

```text
https://<hydro-domain>/oauth/campux/callback
```

并把 Hydro 的 `server.url` 配置为以 `/` 结尾的对外地址，例如：

```text
https://oj.example.com/
```

本地调试时可使用局域网地址，例如：

```text
http://192.168.18.11:8888/oauth/campux/callback
```

## Campux OAuth 应用配置

| 项目 | 值 |
|------|----|
| Authorization URL | `{endpoint}/oauth/authorize` |
| Token URL | `{endpoint}/oauth/token` |
| UserInfo URL | `{endpoint}/oauth/userinfo` |
| PKCE | `S256`（插件自动生成 code_verifier / code_challenge） |
| Scope | `profile tenant` |

## UserInfo 约定

插件要求 Campux userinfo 至少返回：

| 字段 | 是否必需 | 说明 |
|------|----------|------|
| `sub` | 必需 | Campux 稳定用户 ID |
| `name` | 必需 | QQ 号（数字字符串） |
| `username` | 可选 | 显示名；缺失时回退为 QQ |
| `tenant_id` / `tenant_name` / `tenant_slug` | 可选 | 租户信息 |

若 `name` 不是合法 QQ 号（纯数字，5–20 位），登录会返回错误。

## 数据与账号映射

- OAuth 绑定：MongoDB `oauth` collection
  - `platform = campux`
  - `id = sub`
  - 按 `(platform, id)` 唯一
- 首选 Hydro 用户名：QQ 号
- 合成邮箱：`<qq>@campux.hydro.local`
- 用户字段：
  - `qq`
  - `campuxUserId`
  - `campuxTenantId`
  - `campuxTenantName`
- 管理员 QQ：
  - 首次登录直接授予 `PRIV_ALL`
  - 插件启动时也会查找已有账号并补齐管理员权限

## 登录体验

- 登录页只显示 Campux 入口
- 不再显示内置用户名/密码表单
- 不再显示忘记密码入口；`/lostpass` 在密码登录关闭时返回错误
- 登录页文案支持：
  - English
  - 简体中文
  - 繁体中文
  - 한국어
- 未手动设置语言时按浏览器 `Accept-Language` 匹配；无匹配时使用英文

## 代码入口

| 文件 | 作用 |
|------|------|
| `packages/login-with-campux/index.ts` | OAuth provider、自动注册、管理员提升、登录入口过滤 |
| `packages/login-with-campux/pkce.ts` | PKCE verifier / challenge |
| `packages/login-with-campux/pkce.test.ts` | PKCE 单元测试 |
| `packages/hydrooj/src/entry/worker.ts` | 加载插件并校验必需环境变量 |
| `packages/hydrooj/src/handler/user.ts` | OAuth 自动注册与绑定逻辑 |

## 验证

```powershell
# PKCE 单元测试
node -r @hydrooj/register --test packages/login-with-campux/pkce.test.ts

# TypeScript 检查
corepack yarn tsc -b packages/hydrooj/tsconfig.json packages/login-with-campux/tsconfig.json --pretty false --force
```

## 常见问题

### 登录页没有 Campux 按钮

检查：

1. 环境变量是否完整
2. worker 日志是否出现 `Campux OAuth enabled`
3. `~/.hydro/addon.json` 是否加载了 `@hydrooj/ui-default`
4. 浏览器是否缓存了旧前端资源（可强制刷新）

### 回调后报 token / state 错误

- 确认 Campux 应用登记的 callback 与当前访问域名一致
- 确认 `server.url` 以 `/` 结尾
- OAuth state 与浏览器会话绑定，请在同一浏览器会话中完成跳转

### 仍然出现密码登录

- 确认 `CAMPUX_OAUTH_*` 环境变量已生效
- 查看启动日志：`Campux OAuth enabled (password login: disabled)`
- 重新访问 `/login`，不要使用旧缓存页面
