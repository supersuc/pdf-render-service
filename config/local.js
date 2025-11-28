// 基础配置
const project = "wxb-forward-pdf";
const basePath = "";
const moduleId = "5e5fb34e74c140009a591140";
const inPort = 3001;
const serviceDomain = `https://wxb-forward-pdf.dev.wangxiaobao.com`;

// 前辍
const dingDing = {
  system: project,
  path: "https://oapi.dingtalk.com/robot/send?access_token=6f6d1282e8c4589a4351665d642c6e8346555f123e4d81478ad86214256ecde2",
};

const redis = {
  host: `redis-dev.intra.wangxiaobao.com`,
  port: 6379,
  db: 13,
  ttl: 43200,
  prefix: `${project}:`,
  password: "dpZp8VmY2cdjx",
};

module.exports = {
  inPort,
  moduleId,
  serviceDomain,
  project,
  dingDing,
  basePath,
  redis,
  maxCount: 5000,
  proxyTable: {},
};
