const Queue = require('bull');

// Redis 配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: process.env.REDIS_DB || 0,
  // Redis 连接失败重试配置
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`🔄 Redis 连接失败，${delay}ms 后重试 (第 ${times} 次)`);
    return delay;
  },
  maxRetriesPerRequest: null, // Bull 队列需要设为 null
  enableReadyCheck: true,      // 启用就绪检查
  lazyConnect: false,          // 立即连接（不是延迟连接）
  // 连接超时
  connectTimeout: 10000,       // 10 秒
  commandTimeout: 5000,        // 命令超时 5 秒
};

// 创建 PDF 生成队列
const pdfQueue = new Queue('pdf-generation', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3, // 失败重试 3 次
    backoff: {
      type: 'exponential',
      delay: 2000, // 首次重试延迟 2s，后续指数增长
    },
    removeOnComplete: 100, // 保留最近 100 个已完成任务
    removeOnFail: 200, // 保留最近 200 个失败任务
    timeout: 60000, // 任务超时时间 60 秒
  },
});

// 监听队列事件
pdfQueue.on('completed', (job, result) => {
  console.log(`✅ 任务 ${job.id} 完成: ${result.filePath || 'success'}`);
});

pdfQueue.on('failed', (job, err) => {
  console.error(`❌ 任务 ${job.id} 失败 (尝试 ${job.attemptsMade}/${job.opts.attempts}):`, err.message);
});

pdfQueue.on('stalled', (job) => {
  console.warn(`⚠️  任务 ${job.id} 超时，准备重试...`);
});

pdfQueue.on('error', (error) => {
  console.error('🔴 队列错误:', error);
  // Redis 连接错误处理
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    console.error('❌ Redis 连接失败，请检查 Redis 服务是否运行');
    console.error('💡 解决方案：');
    console.error('   1. 检查 Redis 是否启动: redis-cli ping');
    console.error('   2. 检查 Redis 配置是否正确');
    console.error('   3. 检查防火墙/网络连接');
  }
});

// Redis 连接监听
pdfQueue.on('ready', () => {
  console.log('✅ Redis 队列连接成功');
});

pdfQueue.on('waiting', (jobId) => {
  console.log(`⏳ 任务 ${jobId} 等待处理...`);
});

// 队列健康检查（包含 Redis 连接状态）
async function checkQueueHealth() {
  try {
    // 测试 Redis 连接
    const redisClient = pdfQueue.client;
    if (!redisClient || !redisClient.status || redisClient.status !== 'ready') {
      return {
        healthy: false,
        error: 'Redis 未连接',
        redisStatus: redisClient?.status || 'unknown',
        tip: '请检查 Redis 服务是否运行: redis-cli ping'
      };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      pdfQueue.getWaitingCount(),
      pdfQueue.getActiveCount(),
      pdfQueue.getCompletedCount(),
      pdfQueue.getFailedCount(),
    ]);
    
    return {
      healthy: true,
      redisConnected: true,
      waiting,
      active,
      completed,
      failed,
      total: waiting + active,
    };
  } catch (error) {
    // Redis 连接错误
    if (error.code === 'ECONNREFUSED') {
      return {
        healthy: false,
        redisConnected: false,
        error: 'Redis 连接被拒绝',
        message: error.message,
        tip: '请启动 Redis: redis-server'
      };
    }
    
    return {
      healthy: false,
      redisConnected: false,
      error: error.message,
    };
  }
}

// 清理过期任务
async function cleanOldJobs() {
  try {
    await pdfQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 清理 24 小时前的已完成任务
    await pdfQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 清理 7 天前的失败任务
    console.log('🧹 旧任务清理完成');
  } catch (error) {
    console.error('清理任务失败:', error);
  }
}

// 每天凌晨 2 点清理
setInterval(cleanOldJobs, 24 * 60 * 60 * 1000);

module.exports = {
  pdfQueue,
  checkQueueHealth,
  cleanOldJobs,
};

