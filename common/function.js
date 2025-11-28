const crypto = require('crypto');
Array.max = function (array) {
  return Math.max.apply(Math, array);
};
Array.min = function (array) {
  return Math.min.apply(Math, array);
};
/**
 * 数组排序
 * @param arr
 * @param type
 * @returns {Array.<T>|void}
 */
const sortBy = function (arr, type) {
  const returnArray = arr.sort(function (a, b) {
    return b[type] - a[type]
  });
  return returnArray;
};

/**
 * dateFormat
 * @param date
 * @param format
 * @returns {*|string|XML|void}
 */
const dateFormat = (date, format) => {
  date = date ? new Date(date) : new Date();
  if (format === undefined) {
    format = 'yyyy-MM-dd hh:mm:ss';
  }
  let map = {
    "M": date.getMonth() + 1, //月份
    "d": date.getDate(), //日
    "h": date.getHours(), //小时
    "m": date.getMinutes(), //分
    "s": date.getSeconds(), //秒
    "q": Math.floor((date.getMonth() + 3) / 3), //季度
    "S": date.getMilliseconds() //毫秒
  };
  format = format.replace(/([yMdhmsqS])+/g, function (all, t) {
    let v = map[t];
    if (v !== undefined) {
      if (all.length > 1) {
        v = '0' + v;
        v = v.substr(v.length - 2);
      }
      return v;
    }
    else if (t === 'y') {
      return (date.getFullYear() + '').substr(4 - all.length);
    }
    return all;
  });
  return format;
};
/**
 *
 * 删除htm标签中的空格
 * @param html
 * @returns {XML|string|*}
 */
const uglifyHtml = (html) => {
  html = html.replace(/[\r\n]/g, '');
  html = html.replace(/>\s+/g, '>');
  html = html.replace(/<\s+/g, '<');
  html = html.replace(/(\/\*\*.*?\*\/)/g, '');
  return html;
};
/**
 * 菜单处理
 * @param sysMenuList
 * @returns {Array}
 */
const handMenu = (sysMenuList) => {
  let tempArr = [];
  let tempObj = {};
  let menuListLen = sysMenuList.length;
  for (let i = 0; i < menuListLen; i++) {
    // console.log(sysMenuList[i].name);
    // 子层级
    if (sysMenuList[i].parentId && tempObj[sysMenuList[i].parentId] && tempObj[sysMenuList[i].parentId]['sub']) {
    } else {
      // 父层级
      tempObj[sysMenuList[i].id] = {
        title: sysMenuList[i].name,
        code: sysMenuList[i].code,
        path: sysMenuList[i].resource,
        menuId: sysMenuList[i].id,
        sub: []
      }
    }
    // tempArr.push(tempObj[sysMenuList[i].id]);
  }
  for (let i = 0; i < menuListLen; i++) {
    // 子层级
    if (sysMenuList[i].parentId && tempObj[sysMenuList[i].parentId] && tempObj[sysMenuList[i].parentId]['sub']) {
      tempObj[sysMenuList[i].parentId]['sub'].push({
        title: sysMenuList[i].name,
        code: sysMenuList[i].code,
        path: sysMenuList[i].resource,
        menuId: sysMenuList[i].id
      });
    }
    // tempArr.push(tempObj[sysMenuList[i].id]);
  }
  // 按接口返回重新排序
  for (let i = 0; i < menuListLen; i++) {
    if (!sysMenuList[i].parentId && tempObj[sysMenuList[i].id]) {
      tempArr.push(tempObj[sysMenuList[i].id]);
    }
  }
  return tempArr;
};
/**
 * 新树
 * @param data
 * @returns {Array}
 */
const toTree =  (data) => {
  var pos = {};
  var tree = [];
  var i = 0;
  var j = 0;
  while (data.length != 0) {
    var tempId = data[i]['id'];
    var tempPid = data[i]['parentId'];
    var tempObj = {
      title: data[i].name,
        code: data[i].code,
        path: data[i].resource,
        menuId: data[i].id,
        sub: []
    };
    // 排除功能权限
    if (data[i].type == 'Function') {
      data.splice(i, 1);
      continue;
    }
    if (data[i].code.indexOf('|') ==-1) {
      tree.push(tempObj);
      pos[tempId] = [tree.length - 1];
      data.splice(i, 1);
      i--;
    } else {
      // 遍历data.length * 4次后删除当前值，说明他没有父级，数据错误 、防止死循环
      if (j > data.length * 4) {
        data.splice(i, 1);
      }
      var posArr = pos[tempPid];
      if (posArr != undefined) {
        var obj = tree[posArr[0]];
        for (var j = 1; j < posArr.length; j++) {
          obj = obj.sub[posArr[j]];
        }
        obj.sub.push(tempObj);
        pos[tempId] = posArr.concat([obj.sub.length - 1]);
        data.splice(i, 1);
        i--;
      }
    }
    i++;
    if (i > data.length - 1) {
      i = 0;
    }
    j++;
  }
  console.log('处理组织执行' + j + '次');
  return tree;
}
/**
 * 获取客户端ip
 * @param req
 * @returns {*|string|(()=>AddressInfo)|string}
 */
const getIp = (req) => {
  let ipStr = req.headers['x-forwarded-for'] ||
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress || '';
  const ipReg = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
  if (ipStr.split(',').length > 1) {
    ipStr = ipStr.split(',')[0]
  }
  if (ipReg.test(ipStr)) {
    ipStr = ipReg.exec(ipStr)[0];
  }
  return ipStr;
};
module.exports = {
  sortBy,
  dateFormat,
  uglifyHtml,
  handMenu,
  getIp,
  toTree
};