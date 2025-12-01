# 📄 PDF Service

一个**简单易用**的 HTML 转 PDF 服务，基于 Node.js + Puppeteer 实现。

## ✨ 特点

- 🚀 **简单** - 只需 4 个核心依赖，代码清晰易懂
- 📦 **开箱即用** - 克隆即可运行，无需复杂配置
- 🎨 **模板化** - 使用 EJS 模板，灵活定制 PDF 样式
- ⚡ **高性能** - 浏览器复用，支持高并发
- 🔧 **易扩展** - 添加新模板只需创建 HTML 文件

## 📋 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

服务将在 http://localhost:3000 启动

### 3. 测试 API

```bash
# 运行测试脚本
npm test
```

测试完成后，查看 `output/` 目录中生成的 PDF 和 HTML 文件。

## 🔌 API 使用

### 生成 PDF

**接口**: `POST /pdf/generate`

**PowerShell 示例**（推荐）:

```powershell
$json = '{"template":"invoice","data":{"invoiceNumber":"INV-001","date":"2024-01-15","companyName":"我的公司","companyAddress":"公司地址","companyPhone":"010-12345678","customerName":"客户名称","items":[{"name":"服务项目","quantity":1,"price":10000}],"subtotal":10000,"total":10000}}'

Invoke-RestMethod -Uri http://localhost:3000/pdf/generate `
  -Method POST `
  -ContentType "application/json" `
  -Body $json `
  -OutFile my-invoice.pdf
```

**Linux/Mac 示例**:

```bash
curl -X POST http://localhost:3000/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template": "invoice",
    "data": {
      "invoiceNumber": "INV-001",
      "date": "2024-01-15",
      "companyName": "我的公司",
      "companyAddress": "公司地址",
      "companyPhone": "010-12345678",
      "customerName": "客户名称",
      "items": [
        {"name": "服务项目", "quantity": 1, "price": 10000}
      ],
      "subtotal": 10000,
      "total": 10000
    }
  }' \
  --output invoice.pdf
```

### 预览 HTML（调试用）

**接口**: `POST /pdf/preview`

```bash
curl -X POST http://localhost:3000/pdf/preview \
  -H "Content-Type: application/json" \
  -d @test/invoice-data.json \
  > preview.html
```

在浏览器中打开 `preview.html` 查看效果。

## 📁 项目结构

```
simple-pdf-service/
├── app.js                  # 主应用
├── routes/
│   ├── pdf.js             # PDF 生成路由
│   └── health.js          # 健康检查
├── views/                 # EJS 模板
│   ├── invoice.html       # 发票模板
│   └── report.html        # 报告模板
├── test/                  # 测试文件
│   ├── invoice-data.json  # 发票测试数据
│   ├── report-data.json   # 报告测试数据
│   └── test-api.js        # 测试脚本
├── output/                # 生成的 PDF 输出目录
└── package.json
```

## 🎨 自定义模板

### 1. 创建模板

在 `views/` 目录下创建新的 `.html` 文件，例如 `my-template.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title><%= title %></title>
  <style>
    body { font-family: Arial; padding: 40px; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1><%= title %></h1>
  <p><%= content %></p>
</body>
</html>
```

### 2. 使用模板

```bash
curl -X POST http://localhost:3000/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template": "my-template",
    "data": {
      "title": "我的文档",
      "content": "这是内容"
    }
  }' \
  --output my-doc.pdf
```

## 🔧 配置

### 设置 Chromium 路径（可选）

如果系统中已安装 Chrome/Chromium，可以设置环境变量：

**Windows**:
```cmd
set CHROMIUM_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
npm start
```

**Mac/Linux**:
```bash
export CHROMIUM_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
npm start
```

如果不设置，Puppeteer 会自动下载 Chromium。

## 📊 内置模板说明

### 1. 发票模板 (invoice)

适用于生成发票、账单等财务文档。

**数据结构**:
```json
{
  "invoiceNumber": "发票号",
  "date": "日期",
  "companyName": "公司名称",
  "companyAddress": "公司地址",
  "companyPhone": "公司电话",
  "customerName": "客户名称",
  "customerAddress": "客户地址",
  "items": [
    {"name": "项目", "quantity": 数量, "price": 单价}
  ],
  "subtotal": 小计,
  "tax": 税费,
  "total": 总计,
  "notes": "备注"
}
```

### 2. 报告模板 (report)

适用于生成数据报告、统计表格等。

**数据结构**:
```json
{
  "title": "报告标题",
  "subtitle": "副标题",
  "summary": [
    {"label": "标签", "value": "数值"}
  ],
  "columns": [
    {"key": "字段名", "label": "列名", "align": "left|right"}
  ],
  "data": [
    {"字段名": "值"}
  ]
}
```

## 🐛 常见问题

### Q: 找不到 Chromium？

**A**: 有两种解决方案：
1. 等待 Puppeteer 自动下载（首次启动会下载）
2. 设置系统 Chrome 路径（见"配置"章节）

### Q: 端口被占用？

**A**: 修改 app.js 中的 `PORT` 变量，或使用环境变量：
```bash
PORT=3001 npm start
```

### Q: PDF 中文显示乱码？

**A**: 确保模板中使用中文字体：
```css
body {
  font-family: 'Microsoft YaHei', 'SimHei', Arial, sans-serif;
}
```

## 🚀 生产部署

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start app.js --name pdf-service

# 查看日志
pm2 logs pdf-service

# 重启服务
pm2 restart pdf-service
```

## 📈 性能优化

本服务已内置以下优化：

- ✅ 浏览器实例复用（全局单例）
- ✅ 自动重启机制（超过 5000 次生成后重启浏览器）
- ✅ 页面及时关闭（防止内存泄漏）
- ✅ 优雅关闭（SIGINT 信号处理）

## 📝 开发建议

### 添加新功能

1. **添加水印**: 在模板中添加水印 div
2. **支持多种格式**: 在 `pdf()` 方法中修改 format 参数
3. **添加认证**: 在 app.js 中添加认证中间件
4. **限流**: 可集成 `express-rate-limit`

### 代码改进方向

- [ ] 添加请求日志记录
- [ ] 实现任务队列（高并发场景）
- [ ] 添加 PDF 缓存机制
- [ ] 支持异步生成（Webhook 回调）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

---

**作者**: suchao
**邮箱**: 1032790481@qq.com
