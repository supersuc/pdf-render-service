if (process.env.SW_DIRECT_SERVERS) {
  require("wxb-skyapm-nodejs").start();
}
const express = require("express");
const path = require("path");
const fs = require("fs");
const logger = require("morgan");
const favicon = require("serve-favicon");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const { project, basePath, redis, inPort } = require("./common/config");
const redisOptions = { ...{}, ...redis };
const cookieSecret = redisOptions.prefix;
const app = express();

// 去除express标识
app.set("x-powered-by", false);
//ejs模板
app.set("views", path.join(__dirname, "views"));
app.engine(".html", require("ejs").__express);
app.set("view engine", "html");
app.use(logger("dev"));
app.locals["SITE_URL"] = `http://localhost:${inPort}`;

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
// app.use(lessMiddleware(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, "public"))); // 公用静态目录
app.use(basePath, express.static(__dirname + "/dist")); // 静态目录
app.use(express.json({ limit: "30mb" }));
app.use(
  express.urlencoded({ extended: true, limit: "30mb", parameterLimit: 50000 })
);
app.use(cookieParser());

// session
app.use(
  session({
    secret: cookieSecret,
    name: "sid_" + cookieSecret,
    resave: true,
    rolling: true,
    saveUninitialized: false,
    store: new RedisStore(redisOptions),
  })
);

// 日志记录
require("wxb-logs-dc")({
  project,
  app,
});

const routerPath = path.join(__dirname, "routes");
for (let item of fs.readdirSync(routerPath)) {
  const tempPath = path.join(__dirname, `routes/${item}`);
  // 只支持router根目录下的映射
  if (fs.statSync(tempPath).isFile() && path.extname(tempPath) === ".js") {
    app.use(
      `${basePath}/${path.basename(item, ".js")}`,
      require(`./routes/${item}`)
    );
  }
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  let err = new Error("Not Found");
  err.status = 404;
  err.message = "页面不存在";
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  return res.json({
    status: err.status,
    msg: err.message,
    error: err,
  });
});

console.log(`启动端口：${inPort}`);
app.listen(inPort);

module.exports = app;
