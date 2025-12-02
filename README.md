# 📄 PDF Render Service

> 企业级 HTML 转 PDF 微服务 - 专为前端开发者设计

一个轻量、高效的 PDF 生成服务，通过简单的 HTTP 接口即可将结构化数据转换为精美的 PDF 文档。

---

## ✨ 特性

- 🚀 **开箱即用** - 简单的 REST API，无需复杂配置
- 🎨 **模板化设计** - 内置发票、报告等常用模板
- ⚡ **高性能** - 浏览器实例复用，支持并发请求
- 🔄 **异步队列** - Redis + Bull 队列，支持高并发和任务追踪（v2.0）
- 🔒 **生产级** - PM2 集群模式 + 请求限流保护
- 🌐 **跨域支持** - 开箱即用的 CORS 配置
- 📊 **统一响应** - 标准化的 JSON 错误处理

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 Redis（v2.0 新增，队列功能需要）

```bash
# Windows: 下载 Redis 后运行 redis-server.exe
# Docker: docker run -d -p 6379:6379 --name redis redis:alpine
# Linux: sudo service redis-server start
```

### 3. 启动服务

**开发模式**（热重载）：
```bash
# 终端 1: 启动 API
npm run dev

# 终端 2: 启动 Worker（队列消费者）
npm run worker:dev
```

**生产模式**（PM2，推荐）：
```bash
npm start  # 自动启动 API + Worker
```

### 4. 测试接口

```bash
npm test          # 测试基础 API
npm run test:queue  # 测试队列功能（v2.0）
```

---

## 📡 API 接口

### 基础信息

- **Base URL**: `http://localhost:3000`
- **请求限流**: 30 次/分钟
- **Content-Type**: `application/json`

---

### 1. 🏠 获取服务信息

```http
GET /
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "name": "PDF Render Service",
    "version": "2.0.0",
    "endpoints": {
      "generate": {
        "method": "POST",
        "path": "/pdf/generate"
      }
    }
  }
}
```

---

### 2. 📄 生成 PDF

```http
POST /pdf/generate
Content-Type: application/json
```

**请求体**：

```json
{
  "template": "invoice",
  "data": {
    "invoiceNumber": "INV-2024-001",
    "date": "2024-12-01",
    "companyName": "科技有限公司",
    "companyAddress": "北京市朝阳区",
    "companyPhone": "010-12345678",
    "customerName": "张三",
    "items": [
      {
        "name": "网站开发服务",
        "quantity": 1,
        "price": 50000
      }
    ],
    "subtotal": 50000,
    "tax": 3000,
    "total": 53000
  },
  "options": {
    "format": "A4",
    "margin": {
      "top": "20mm",
      "bottom": "20mm"
    }
  }
}
```

**响应**：

- **成功**: 返回 PDF 文件流（`Content-Type: application/pdf`）
- **失败**: 返回 JSON 错误信息

```json
{
  "success": false,
  "error": "MISSING_TEMPLATE",
  "message": "缺少 template 参数"
}
```

**响应头**：

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-1733011234567.pdf"
X-Generation-Time: 1456ms
```

---

### 3. 🔍 预览 HTML（调试用）

```http
POST /pdf/preview
Content-Type: application/json
```

**请求体**：

```json
{
  "template": "invoice",
  "data": {
    "invoiceNumber": "INV-001",
    "customerName": "张三"
  }
}
```

**响应**: 返回渲染后的 HTML 页面（可在浏览器中直接查看）

---

### 4. 📋 获取模板列表

```http
GET /pdf/templates
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "name": "invoice",
        "description": "发票模板",
        "requiredFields": ["invoiceNumber", "customerName", "items", "total"]
      },
      {
        "name": "report",
        "description": "报告模板",
        "requiredFields": ["title", "columns", "data"]
      }
    ]
  }
}
```

---

## 🆕 异步队列接口（v2.0）

### 5. 🔄 异步生成 PDF（推荐）

适用于高并发场景，API 立即返回，后台异步生成。

```http
POST /pdf/generate-async
Content-Type: application/json
```

**请求体**：

```json
{
  "template": "invoice",
  "data": {
    "invoiceNumber": "INV-001",
    "customerName": "张三",
    "items": [{"name": "商品", "quantity": 1, "price": 100}],
    "total": 100
  },
  "priority": 5  // 可选，1-10，数字越小优先级越高
}
```

**响应**：

```json
{
  "success": true,
  "data": {
    "taskId": "pdf-1733123456789-abc123",
    "status": "queued",
    "message": "任务已加入队列",
    "queuePosition": 1,
    "statusUrl": "/pdf/task/pdf-1733123456789-abc123",
    "downloadUrl": "/pdf/download/pdf-1733123456789-abc123",
    "estimatedTime": "2-5秒"
  }
}
```

---

### 6. 📊 查询任务状态

```http
GET /pdf/task/:taskId
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "taskId": "pdf-1733123456789-abc123",
    "status": "completed",  // waiting/processing/completed/failed
    "message": "已完成",
    "progress": 100,
    "result": {
      "filePath": "output/pdf-xxx.pdf",
      "fileSize": 66125,
      "duration": 2648
    },
    "downloadUrl": "/pdf/download/pdf-1733123456789-abc123",
    "createdAt": 1733123456789,
    "finishedAt": 1733123459234
  }
}
```

---

### 7. 📥 下载生成的 PDF

```http
GET /pdf/download/:taskId
```

**响应**：PDF 文件流

---

### 8. 📈 队列状态

```http
GET /pdf/queue/status
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "healthy": true,
    "waiting": 5,    // 排队中
    "active": 2,     // 处理中
    "completed": 123,// 已完成
    "failed": 3,     // 失败
    "total": 7       // 总计
  }
}
```

---

## 🎯 前端集成示例

### JavaScript（原生）

```javascript
async function generatePDF() {
  const response = await fetch('http://localhost:3000/pdf/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template: 'invoice',
      data: {
        invoiceNumber: 'INV-001',
        date: '2024-12-01',
        companyName: '我的公司',
        customerName: '张三',
        items: [{ name: '服务费', quantity: 1, price: 10000 }],
        subtotal: 10000,
        total: 10000
      }
    })
  });

  if (response.ok) {
    // 下载 PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice.pdf';
    a.click();
  } else {
    const error = await response.json();
    console.error('生成失败:', error.message);
  }
}
```

---

### React

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function PDFGenerator() {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:3000/pdf/generate',
        {
          template: 'invoice',
          data: {
            invoiceNumber: 'INV-001',
            customerName: '张三',
            items: [{ name: '商品A', quantity: 2, price: 100 }],
            total: 200
          }
        },
        {
          responseType: 'blob' // 重要：接收二进制数据
        }
      );

      // 下载文件
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('生成失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={loading}>
      {loading ? '生成中...' : '生成 PDF'}
    </button>
  );
}

export default PDFGenerator;
```

---

### Vue 3

```vue
<template>
  <button @click="generatePDF" :disabled="loading">
    {{ loading ? '生成中...' : '生成 PDF' }}
  </button>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const loading = ref(false);

const generatePDF = async () => {
  loading.value = true;
  try {
    const response = await axios.post(
      'http://localhost:3000/pdf/generate',
      {
        template: 'invoice',
        data: {
          invoiceNumber: 'INV-001',
          customerName: '李四',
          items: [{ name: '产品B', quantity: 1, price: 500 }],
          total: 500
        }
      },
      { responseType: 'blob' }
    );

    // 触发下载
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice.pdf';
    a.click();
  } catch (error) {
    console.error('生成失败:', error);
  } finally {
    loading.value = false;
  }
};
</script>
```

---

## 📝 数据模板

### Invoice（发票）

```json
{
  "template": "invoice",
  "data": {
    "invoiceNumber": "INV-2024-001",
    "date": "2024-12-01",
    "companyName": "北京科技有限公司",
    "companyAddress": "北京市朝阳区XXX街道",
    "companyPhone": "010-12345678",
    "customerName": "客户名称",
    "items": [
      {
        "name": "商品/服务名称",
        "quantity": 数量,
        "price": 单价
      }
    ],
    "subtotal": 小计,
    "tax": 税费（可选）,
    "total": 总计
  }
}
```

### Report（报告）

```json
{
  "template": "report",
  "data": {
    "title": "数据报告",
    "subtitle": "2024年度",
    "generatedAt": "2024-12-01",
    "summary": [
      { "label": "总收入", "value": "¥1,000,000" },
      { "label": "总支出", "value": "¥500,000" }
    ],
    "columns": [
      { "key": "date", "label": "日期", "align": "left" },
      { "key": "amount", "label": "金额", "align": "right" }
    ],
    "data": [
      { "date": "2024-01-01", "amount": "¥10,000" }
    ]
  }
}
```

---

## 🎨 自定义模板

### 1. 创建模板文件

在 `views/` 目录下创建 `my-template.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title><%= title %></title>
    <style>
      body {
        font-family: "Microsoft YaHei", Arial, sans-serif;
        padding: 40px;
      }
      h1 {
        color: #333;
      }
    </style>
  </head>
  <body>
    <h1><%= title %></h1>
    <p><%= content %></p>
  </body>
</html>
```

### 2. 使用自定义模板

```javascript
fetch('http://localhost:3000/pdf/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: 'my-template', // 模板名称（不含 .html）
    data: {
      title: '我的文档',
      content: '这是内容'
    }
  })
});
```

---

## ⚙️ PM2 生产部署

### 启动服务

```bash
npm start
# 或
pm2 start pm2.config.js --env production
```

### 管理命令

```bash
# 查看状态
pm2 list

# 监控
pm2 monit

# 重启
npm run restart

# 停止
npm run stop

# 查看日志
npm run logs
```

### 配置说明

编辑 `pm2.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'pdf-render-service',
    script: 'app.js',
    instances: 'max',        // CPU 核心数
    exec_mode: 'cluster',    // 集群模式
    max_memory_restart: '1G', // 内存限制
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      CORS_ORIGIN: 'https://yourdomain.com' // 生产环境域名
    }
  }]
};
```

---

## 🔧 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `CHROMIUM_PATH` | Chrome 路径 | 自动检测 |
| `CORS_ORIGIN` | 允许的跨域来源 | `*` |

**示例**：

```bash
# Windows
set PORT=8080 && npm run dev

# Linux/Mac
PORT=8080 npm run dev
```

---

## ❓ 常见问题

### Q1: CORS 跨域错误？

**A**: 已内置 CORS 支持。生产环境建议在 `pm2.config.js` 中设置 `CORS_ORIGIN` 为具体域名：

```javascript
env_production: {
  CORS_ORIGIN: 'https://yourdomain.com'
}
```

---

### Q2: 请求被限流？

**A**: 默认 API 限流 30 次/分钟（防止滥用）。实际处理能力取决于 Worker 配置：

**当前配置**（2 Worker × 5并发）：
- 实际处理能力：~230 个/分钟
- 单次生成：2.6秒

**提升并发能力**：
1. **增加 Worker 实例**（推荐）：
   ```javascript
   // pm2.config.js
   {
     name: 'pdf-worker',
     instances: 4,  // 从 2 改为 4
   }
   ```
   处理能力：230 → 460 个/分钟

2. **增加 Worker 并发数**：
   ```javascript
   // workers/pdf-worker.js
   pdfQueue.process(10, async (job) => {  // 从 5 改为 10
     // ...
   });
   ```
   处理能力：230 → 460 个/分钟

3. **调整 API 限流**（如果确实需要）：
   ```javascript
   // app.js
   const limiter = rateLimit({
     windowMs: 1 * 60 * 1000,
     max: 100  // 根据实际需求调整
   });
   ```

---

### Q3: PDF 中文显示异常？

**A**: 确保模板中指定了中文字体：

```css
body {
  font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
}
```

---

### Q4: Chrome 找不到？

**A**: 设置环境变量：

```bash
# Windows
set CHROMIUM_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# Linux
export CHROMIUM_PATH=/usr/bin/google-chrome
```

或在 `pm2.config.js` 中配置：

```javascript
env: {
  CHROMIUM_PATH: 'D:\\Chrome\\chrome.exe'
}
```

---

### Q5: 如何在新窗口预览 PDF？

**A**: 使用 `window.open()` 打开 Blob URL：

```javascript
const blob = await response.blob();
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
```

---

## 📦 项目结构

```
pdf-render-service/
├── app.js                  # 主应用
├── pm2.config.js           # PM2 配置（支持 API + Worker）
├── package.json
├── routes/
│   ├── pdf.js              # PDF 生成路由（同步 + 异步）
│   └── health.js           # 健康检查
├── libs/
│   ├── pdf-generator.js    # 核心 PDF 生成逻辑
│   └── queue-manager.js    # 队列管理器（v2.0）
├── workers/
│   └── pdf-worker.js       # Worker 进程（v2.0）
├── views/
│   ├── invoice.html        # 发票模板
│   └── report.html         # 报告模板
├── test/
│   ├── test-api.js         # API 测试
│   ├── test-queue.js       # 队列测试（v2.0）
│   ├── invoice-data.json   # 测试数据
│   └── report-data.json
└── output/                 # 临时输出目录
```

---

## 🔒 安全建议

1. **生产环境设置具体的 CORS 域名**
2. **使用 HTTPS**
3. **添加 API Key 认证**（如需要）
4. **调整请求限流策略**
5. **定期更新依赖包**

---

## 📊 性能指标

### 同步模式（v1.0）
- **API 响应时间**: 3-5秒（包含 PDF 生成）
- **并发能力**: 5 req/min
- **适用场景**: 单个 PDF 生成

### 异步模式（v2.0，推荐）
- **API 响应时间**: < 100ms（立即返回任务 ID）
- **PDF 生成时间**: ~2.6秒/个（后台异步）
- **实际处理能力**: 
  - 当前配置（2 Worker × 5并发）：~230 个/分钟
  - 可扩展至：460+ 个/分钟（4 Worker）
- **API 限流**: 30 req/min（防止滥用，可调整）
- **内存占用**: ~50MB/实例
- **浏览器复用**: ✅ 自动管理
- **适用场景**: 高并发、批量生成

### 技术优势
- ✅ Redis 队列削峰填谷
- ✅ 任务失败自动重试（3次）
- ✅ 实时任务状态追踪
- ✅ Worker 可横向扩展

---

## 📄 License

MIT © suchao

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**💡 提示**: 如需更多帮助，请查看 `test/test-api.js` 中的完整测试示例。
