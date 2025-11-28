# pdf-render-service

高并发 HTML to PDF 微服务

## 功能特性

- HTML 模板渲染为 PDF（Puppeteer）
- 并发执行与浏览器断连自恢复
- SCSS 编译至 `public/css`（Gulp）
- 多环境配置与 PM2 部署

## 目录结构（简要）

- `app.js`：应用入口（直接监听 `config/<env>.js` 的 `inPort`）
- `routes/pdf.js`：PDF 导出与模板读取接口
- `views/`：EJS 模板（如 `commission.html`, `customer-detail.html`, `customer-domestic.html`）
- `assets/styles/`：SCSS 源码；由 Gulp 编译到 `public/css/`
- `public/`：静态资源（CSS/IMG 等）
- `config/`：按 `node_env_type` 加载，如 `config/local.js`
- `common/`：配置汇合（`common/config.js`）、工具等
- `libs/`：工具库（如 `utils.js`、请求封装、队列等）
- `pm2.json`：PM2 应用与多环境变量
- `gulpfile.js`：SCSS 构建与监听

提示：仓库中存在 `bin/www` 但当前启动入口为 `app.js`，实际未使用 `bin/www`。

## 环境要求

- Node.js 14+（建议 LTS）
- Chrome/Chromium 可执行文件（跨平台）
  - 通过环境变量 `CHROMIUM_PATH` 指定可执行文件路径
  - Windows（PowerShell）示例：
    ```powershell
    setx CHROMIUM_PATH "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    ```

## 启动方式

### 1) 本地启动（推荐）

- 启动服务：

```bash
npm start
# 等同于：node ./app
# 默认端口：3001（见 config/local.js 的 inPort）
```

- 启动服务 + 样式监听（SCSS -> CSS 实时编译）：

```bash
npm run dev
# 等同于并行执行：npm run start + gulp watch
```

访问：

- 站点根：`http://localhost:3001/`
- PDF 接口前缀：`/pdf`

### 2) PM2 启动（多环境）

```bash
pm2 startOrReload pm2.json --env local
# 支持的 env：local/dev/test/preview/prod（见 pm2.json）
```

## 环境变量

- `node_env_type`：配置环境，默认 `local`
  - 可选：`local`/`dev`/`test`/`preview`/`prod`
  - 加载顺序：`config/<env>.js`，再由 `center-config/<env>.js`（如存在）覆盖
- `CHROMIUM_PATH`：Chrome/Chromium 可执行文件路径（Puppeteer 使用该路径）
  - Windows 示例（PowerShell）：`setx CHROMIUM_PATH "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`
  - macOS 示例（bash/zsh）：`export CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`
- `SW_DIRECT_SERVERS`：若设置，将启用 `wxb-skyapm-nodejs` 接入 SkyAPM 监控

注意：当前项目以 `app.js` 中的 `inPort` 为准对外监听（默认 3001），并不会读取 `PORT` 环境变量。

## API 文档

### GET /pdf/template

读取模板原文（便于调试前端模板）。

- 请求：
  - Query：`name` 模板名（不含扩展名），如 `commission`
- 示例：

```bash
curl "http://localhost:3001/pdf/template?name=commission"
```

### POST /pdf/export

基于 EJS 模板渲染 HTML，并由 Puppeteer 生成 PDF 返回。

- 请求：
  - Body（application/json）：
    - `page`：模板名（必填），对应 `views/<page>.html`
    - `content`：模板数据对象（或经 `encodeURIComponent` 后的 JSON 字符串）
    - `parse`：可选布尔值，是否启用服务端数据预处理（当前逻辑默认关闭）
- 响应：
  - `Content-Type: application/pdf`
- 示例（原始 JSON）：

```bash
curl -X POST "http://localhost:3001/pdf/export" \
  -H "Content-Type: application/json" \
  -d "{\"page\":\"commission\",\"content\":{\"title\":\"测试\",\"list\":[1,2,3]}}" \
  --output output.pdf
```

## 调试指南

- Puppeteer 可视化调试：
  - 将 `routes/pdf.js` 中 `puppeteer.launch({ headless: true, ... })` 的 `headless` 改为 `false`，并可启用 `devtools: true`
  - 仅用于本地调试，不建议在生产环境使用
- 常见问题：
  - 找不到 Chrome/Chromium：请正确设置 `CHROMIUM_PATH`
  - “Chromium is disconnected”：进程被系统杀死或异常退出；服务内置自动重启（累计生成超过 `MAX_COUNT` 或断连时重启）
  - VPN/DNS：若访问内网域名失败，请检查 VPN 连接与 DNS（参考旧版 README 的 `resolv.conf` 提示）
  - Redis 连接失败：默认 `config/local.js` 指向内网 Redis，外网开发可改为本地 Redis 或临时禁用会话存储（仅用于开发）

## 运行参数与并发

- 并发：`routes/pdf.js` 中 `QueueManager` 默认并发度 `50`
- 自动重启浏览器：累计生成 `maxCount(=5000)` 次后自动重启
- 可按需在 `config/local.js` 或代码中调整

## 模板与静态资源

- 模板目录：`views/`（EJS 语法）
- 静态资源：
  - 公共静态：`public/`（含 `public/css`、`public/img` 等）
  - 业务静态：`/dist`（若存在，将通过 `basePath` 作为挂载路径）

## 生产部署建议

- 使用 `pm2.json` 按环境启动
- 为 `CHROMIUM_PATH` 配置稳定版本的 Chromium/Chrome
- 日志与监控：`morgan('dev')`（建议按环境切换级别）+ SkyAPM（如配置 `SW_DIRECT_SERVERS`）
