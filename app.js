const express = require("express");
const path = require("path");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(morgan("dev"));
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(express.static(path.join(__dirname, "public")));

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
    name: "PDF Service",
    version: "2.0.0",
    description: "简单易用的 HTML 转 PDF 服务",
    endpoints: {
      生成PDF: "POST /pdf/generate",
      预览HTML: "POST /pdf/preview",
      健康检查: "GET /health",
      使用文档: "README.md",
    },
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: "页面不存在",
    path: req.url,
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error("错误:", err);
  res.status(500).json({
    error: "服务器错误",
    message: err.message,
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 PDF 服务已启动!`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📚 查看 README.md 了解使用方法\n`);
});

module.exports = app;
