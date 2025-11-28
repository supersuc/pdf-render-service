// 白名单
const whiteList = function (basePath) {
  return {
    noLogin: {
      url: {
        [basePath + "/error"]: true,
        [basePath + "/auth/login"]: true,
        [basePath + "/auth/id"]: true,
        [basePath + "/auth/logout"]: true,
      },
      catalog: [
        `${basePath}/martech-cme/draft/v1/getDraft`,
      ],
    },
    noAuthority: {
      url: {
        [basePath + "/user/menu"]: true
      },
      catalog: [
        `${basePath}/martech-cme/draft/v1/getDraft`,
      ]
    }
  }
};
module.exports = whiteList;
