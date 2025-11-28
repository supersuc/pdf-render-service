const request = require('request');
const config = require('../common/config');
const fn = require('../common/function');
let upDingDing = function (err, req, originOpts) {
  let errorTxt = err;
  try {
    errorTxt = JSON.stringify(err);
  } catch (e) {
  
  }
  
  let url = '';
  let userInfo = '';
  let contentType = '';
  let userAgent = '';
  let method = 'get';
  let params = '';
  let cookies = '';
  let referer = '';
  let otherParam = '';
  try {
    url = req.url|| req.path;
    contentType = req.headers['content-type'];
    userAgent = req.headers['user-agent'];
    params = req.params ? JSON.stringify(req.params.params) : req.body;
    method = req.method.toLowerCase();
    cookies = JSON.stringify(req.cookies);
    referer = req.headers.referer;
    otherParam = `
          \n ##### method: ${method}
      `;
    if (method == 'post') {
      otherParam = `
          \n ##### method: ${method}
          \n ##### 参数: ${params}
          `
    }
    if (req.session && req.session.user) {
      userInfo = `\n ##### 用户信息: ${JSON.stringify(req.session.user)}`
    }
  } catch (e) {
    console.log(e);
  }
  let content = `
    \n #### 接口异常
    \n ##### 系统: ${config.dingDing.system}
    \n ##### 接口: ${url}
    \n ##### content-type: ${contentType}
    ${otherParam}
    \n ##### 错误信息: ${errorTxt}
    ${userInfo}
    \n ##### cookies: ${cookies}
    \n ##### user-agent: ${userAgent}
    \n ##### referer: ${referer}
    \n ##### 时间: ${fn.dateFormat(new Date())}
  `;
  let opts = {
    method: 'post',
    url: config.dingDing.path,
    json: true,
    headers: {
      'content-type': 'application/json'
    },
    body: {
      "msgtype": "markdown",
      "markdown": {
        "title": '接口异常',
        "text": content
      },
      "at": {
        "isAtAll": true
      }
    }
  };
  request(opts, function (err, response, body) {
    if (err || !response || response.statusCode != 200) {
      console.log('上报异常：');
      console.log(err || response);
    } else {
      console.log('上报成功');
    }
  })
}
module.exports = upDingDing;
