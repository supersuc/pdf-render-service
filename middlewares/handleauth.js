const url = require('url');
const path = require('path');
const config = require('../common/config');
const whiteList = require('../common/withe_url')(config.basePath);
const {timeOut} = require('../common/msg');

module.exports = (req, res, next) => {
  const sessions = req.session;
  // 未登录不做拦截
  const noLogin = whiteList.noLogin;
  const noLoginUrl = noLogin.url;
  const noLoginCatalog = noLogin.catalog;

  const pathname = url.parse(req.url).pathname;
  const parentPath = path.dirname(pathname);

  const noLoginIsInPath = noLoginCatalog.some(function (item) {
    return parentPath.indexOf(item) == 0;
  });
  // 无需登录
  if (noLoginUrl[pathname] || noLoginIsInPath) {
    next();
    return;
  }
  if (sessions.user) {
    next();
  } else {
    return res.json({
      code: "-1001",
      msg: timeOut
    });
  }
}