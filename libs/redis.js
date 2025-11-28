const config = require('./../common/config');
const ioredis = require('ioredis');

const client = new ioredis(config.redis);
client.on('error', function (err) {
	console.log(err);
});
module.exports = client;
