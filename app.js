const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 配置 - 允许前端跨域访问
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // 生产环境建议设置具体域名
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求限流 - 防止滥用
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 30, // 最多30个请求
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试',
    retryAfter: '1分钟'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 中间件
app.use(morgan("dev"));
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use('/pdf', limiter); // 只对 PDF 接口限流

// 设置 EJS 模板引擎
app.set("views", path.join(__dirname, "views"));
app.engine(".html", require("ejs").__express);
app.set("view engine", "html");

// 传递 SITE_URL 给所有模板
app.locals.SITE_URL = `http://localhost:${PORT}`;

// 路由
app.use("/pdf", require("./routes/pdf"));
app.use("/health", require("./routes/health"));

// 首页
app.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      name: "PDF Render Service",
      version: "2.0.0",
      description: "企业级 HTML 转 PDF 服务",
      endpoints: {
        generate: {
          method: "POST",
          path: "/pdf/generate",
          description: "生成 PDF 文件"
        },
        preview: {
          method: "POST",
          path: "/pdf/preview",
          description: "预览 HTML（调试用）"
        },
        health: {
          method: "GET",
          path: "/health",
          description: "健康检查"
        }
      },
      rateLimit: "30 requests/min",
      docs: "https://github.com/supersuc/pdf-render-service"
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "接口不存在",
    path: req.url,
    tip: "请查看 GET / 获取可用接口列表"
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error("错误:", err);
  res.status(500).json({
    success: false,
    error: "服务器内部错误",
    message: process.env.NODE_ENV === 'production' ? '请联系管理员' : err.message
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 PDF 服务已启动!`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📚 查看 README.md 了解使用方法\n`);
});

module.exports = app;
