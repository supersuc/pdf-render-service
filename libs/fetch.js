const request = require('request');
const upDingDing = require('../libs/dingding');
const fetch = function (opts, req) {
  console.log('----访问地址----');
  console.log(opts.url);
  return new Promise(resolve => {
    request(opts,  (err, response, body) => {
      let data = {};
      if (err || !response || !response.statusCode) {
        console.log('接口异常：');
        console.log(err || response);
        let errObj = body || err;
        let res = response;
        try {
          if (response) {
            res = response.request
          }
          upDingDing(errObj, res, response);
        } catch (e) {
          console.log(e);
        }
        data = {
          status: false,
          code: -2,
          msg: '请求异常',
          error: errObj
        }
      } else {
        data = body;
        // if (data.code != '0' || data.flag == false) {
        //   upDingDing(data, response.request, response);
        // }
      }
      resolve(data)
    })
  })
}
module.exports = fetch;
