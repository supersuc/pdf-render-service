const { pdfQueue } = require('../libs/queue-manager');
const { generatePDF } = require('../libs/pdf-generator');
const path = require('path');
const fs = require('fs');

console.log('🚀 PDF Worker 启动中...');
console.log(`📍 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
console.log(`🔧 并发数: 5`);

// 处理 PDF 生成任务
pdfQueue.process(5, async (job) => {
  const { taskId, template, data, options } = job.data;
  const startTime = Date.now();
  
  console.log(`🔄 [${taskId}] 开始处理 - 模板: ${template}`);
  
  // 更新进度：10%
  await job.progress(10);
  
  try {
    // 生成输出路径
    const outputPath = path.join(
      process.cwd(),
      'output',
      `${taskId}.pdf`
    );
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 更新进度：30%
    await job.progress(30);
    
    console.log(`📝 [${taskId}] 渲染模板...`);
    
    // 生成 PDF
    const result = await generatePDF({
      template,
      data,
      outputPath,
      pdfOptions: options,
    });
    
    // 更新进度：90%
    await job.progress(90);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // 获取文件信息
    const stats = fs.statSync(outputPath);
    const fileSize = stats.size;
    const duration = Date.now() - startTime;
    
    // 更新进度：100%
    await job.progress(100);
    
    console.log(`✅ [${taskId}] 完成 - 耗时: ${duration}ms, 大小: ${(fileSize / 1024).toFixed(2)}KB`);
    
    return {
      success: true,
      taskId,
      filePath: outputPath,
      fileSize,
      duration,
      template,
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error(`❌ [${taskId}] 失败 - ${error.message}`);
    
    throw error; // Bull 会处理重试
  }
});

// 监听 Worker 事件
pdfQueue.on('active', (job) => {
  console.log(`▶️  任务 ${job.id} 开始处理...`);
});

pdfQueue.on('completed', (job, result) => {
  console.log(`✅ 任务 ${job.id} 已完成`);
});

pdfQueue.on('failed', (job, err) => {
  console.error(`❌ 任务 ${job.id} 失败 (${job.attemptsMade}/${job.opts.attempts}):`, err.message);
  
  // 如果已达到最大重试次数
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`🔴 任务 ${job.id} 达到最大重试次数，标记为永久失败`);
  }
});

pdfQueue.on('stalled', (job) => {
  console.warn(`⚠️  任务 ${job.id} 超时，准备重试...`);
});

// 优雅退出
process.on('SIGTERM', async () => {
  console.log('📴 收到 SIGTERM 信号，准备关闭...');
  await pdfQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 收到 SIGINT 信号，准备关闭...');
  await pdfQueue.close();
  process.exit(0);
});

console.log('✅ PDF Worker 已启动，等待任务...\n');

