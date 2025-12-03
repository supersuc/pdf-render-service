const express = require('express');
const router = express.Router();

/**
 * GET /health - 健康检查
 */
router.get('/', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  res.json({
    status: 'ok',
    uptime: `${Math.floor(uptime)}秒`,
    memory: {
      rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,        // 总内存
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB` // 堆内存
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

