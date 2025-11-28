const envType = process.env.node_env_type || 'local';
// const config = require(`../config/${envType}`);
const path = require('path');
const fs = require('fs')
console.log(envType);
let config = {}
try {
  // 本地配置文件
  const baseConfigPath = path.resolve(__dirname, `../config/${envType}.js`);
  // 判断本地配置文件是否存在
  if (fs.existsSync(baseConfigPath)) {
    config = require(baseConfigPath)
  }
  // 配置中心配置文件
  let configData = {}
  const configCenterPath = path.resolve(__dirname, `../center-config/${envType}.js`);
  if (fs.existsSync(configCenterPath)) {
    configData = require(configCenterPath);
  }
  // 配置中心文件覆盖本地配置文件
  config = {...config, ...configData}
} catch (error) {
  console.log(error)
}
module.exports = config;