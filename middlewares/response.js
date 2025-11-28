/**
 * 处理请求
 * @param req
 * @param res
 * @param next
 */
module.exports = (req, res, next) => {
  // set headers
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'content-type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  if(req.method == 'OPTIONS') {
    return res.json({})
  }
  next();
}