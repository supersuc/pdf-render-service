// 基础配置
const project = "wxb-forward-pdf";
const basePath = "";
const inPort = 3001;

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
  project,
  basePath,
  redis,
  maxCount: 5000
};
