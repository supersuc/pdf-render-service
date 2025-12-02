const Queue = require('bull');

// Redis 配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: process.env.REDIS_DB || 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
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
});

// 队列健康检查
async function checkQueueHealth() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      pdfQueue.getWaitingCount(),
      pdfQueue.getActiveCount(),
      pdfQueue.getCompletedCount(),
      pdfQueue.getFailedCount(),
    ]);
    
    return {
      healthy: true,
      waiting,
      active,
      completed,
      failed,
      total: waiting + active,
    };
  } catch (error) {
    return {
      healthy: false,
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

