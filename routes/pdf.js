const express = require('express');
const router = express.Router();
const { generatePDF, renderHTML } = require('../libs/pdf-generator');
const { pdfQueue, checkQueueHealth } = require('../libs/queue-manager');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

/**
 * POST /pdf/generate - 生成 PDF
 * @body {string} template - 模板名称 (invoice/report)
 * @body {object} data - 模板数据
 * @body {object} [options] - PDF 生成选项（可选）
 * @returns {Buffer} PDF 文件流
 */
router.post('/generate', async function(req, res, next) {
  const startTime = Date.now();
  
  try {
    const { template, data, options } = req.body;
    
    // 参数验证
    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TEMPLATE',
        message: '缺少 template 参数',
        example: { template: 'invoice', data: { invoiceNumber: 'INV-001' } }
      });
  }
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATA',
        message: 'data 参数必须是对象',
        example: { template: 'invoice', data: { invoiceNumber: 'INV-001' } }
      });
  }
    
    // 生成临时文件
    const tempPath = path.join(__dirname, '../output', `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`);
    
    const result = await generatePDF({
      template,
      data,
      outputPath: tempPath,
      pdfOptions: options
    });
    
    if (result.success) {
      const duration = Date.now() - startTime;
      
      // 返回 PDF 文件流
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${template}-${Date.now()}.pdf"`);
      res.setHeader('X-Generation-Time', `${result.duration}ms`);
      
      res.sendFile(result.filePath, (err) => {
        // 清理临时文件
        if (fs.existsSync(result.filePath)) {
          fs.unlinkSync(result.filePath);
        }
        
        if (err) {
          console.error('发送文件失败:', err);
        } else {
          console.log(`✅ [${duration}ms] PDF 已发送: ${template}`);
        }
    });
  } else {
      res.status(500).json({
        success: false,
        error: 'PDF_GENERATION_FAILED',
        message: result.error,
        template: template
      });
    }
    
  } catch (error) {
    console.error('❌ 生成 PDF 异常:', error);
    
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /pdf/preview - 预览 HTML（用于调试模板）
 * @body {string} template - 模板名称
 * @body {object} data - 模板数据
 * @returns {HTML} HTML 页面
 */
router.post('/preview', async function(req, res, next) {
  try {
    const { template, data } = req.body;
    
    // 参数验证
    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TEMPLATE',
        message: '缺少 template 参数'
      });
    }
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATA',
        message: 'data 参数必须是对象'
      });
              }
    
    const html = await renderHTML({ template, data });
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    
  } catch (error) {
    console.error('❌ 预览失败:', error);
    res.status(500).json({
      success: false,
      error: 'PREVIEW_FAILED',
      message: error.message
    });
  }
});

/**
 * GET /pdf/templates - 获取可用模板列表
 */
router.get('/templates', (req, res) => {
  res.json({
    success: true,
    data: {
      templates: [
        {
          name: 'invoice',
          description: '发票模板',
          requiredFields: ['invoiceNumber', 'date', 'companyName', 'customerName', 'items', 'subtotal', 'total']
        },
        {
          name: 'report',
          description: '报告模板',
          requiredFields: ['title', 'columns', 'data']
        }
      ]
    }
  });
});

/**
 * POST /pdf/generate-async - 异步生成 PDF（返回任务 ID）
 * @body {string} template - 模板名称
 * @body {object} data - 模板数据
 * @body {object} [options] - PDF 生成选项（可选）
 * @body {number} [priority] - 任务优先级 1-10，数字越小优先级越高（可选）
 * @returns {Object} 任务信息
 */
router.post('/generate-async', async (req, res) => {
  try {
    const { template, data, options, priority } = req.body;
    
    // 参数验证
    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TEMPLATE',
        message: '缺少 template 参数',
        example: { template: 'invoice', data: { invoiceNumber: 'INV-001' } }
      });
    }
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATA',
        message: 'data 参数必须是对象',
        example: { template: 'invoice', data: { invoiceNumber: 'INV-001' } }
      });
    }
    
    // 检查 Redis 连接状态
    const queueHealth = await checkQueueHealth();
    if (!queueHealth.healthy || !queueHealth.redisConnected) {
      return res.status(503).json({
        success: false,
        error: 'REDIS_UNAVAILABLE',
        message: 'Redis 队列服务不可用',
        details: queueHealth.error || 'Redis 未连接',
        tip: '请检查 Redis 服务是否运行: redis-cli ping',
        fallback: '可以使用同步接口: POST /pdf/generate'
      });
    }
    
    // 生成任务 ID
    const taskId = `pdf-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    // 添加到队列
    const job = await pdfQueue.add(
      {
        taskId,
        template,
        data,
        options,
      },
      {
        priority: priority || 5, // 默认优先级 5
        jobId: taskId,
      }
    );
    
    // 获取队列状态
    const queueStatus = await checkQueueHealth();
    
    console.log(`✅ 任务 ${taskId} 已加入队列，当前排队: ${queueStatus.waiting}`);
    
    res.json({
      success: true,
      data: {
        taskId,
        status: 'queued',
        message: '任务已加入队列',
        queuePosition: queueStatus.waiting + queueStatus.active,
        statusUrl: `/pdf/task/${taskId}`,
        downloadUrl: `/pdf/download/${taskId}`,
        estimatedTime: '2-5秒',
      },
    });
  } catch (error) {
    console.error('❌ 添加任务失败:', error);
    
    // Redis 连接错误
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({
        success: false,
        error: 'REDIS_CONNECTION_ERROR',
        message: '无法连接到 Redis 服务',
        tip: '请检查 Redis 是否启动: redis-server',
        fallback: '可以使用同步接口: POST /pdf/generate'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'QUEUE_ERROR',
      message: error.message,
    });
  }
});

/**
 * GET /pdf/task/:taskId - 查询任务状态
 * @param {string} taskId - 任务 ID
 * @returns {Object} 任务状态信息
 */
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const job = await pdfQueue.getJob(taskId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'TASK_NOT_FOUND',
        message: '任务不存在或已过期',
        tip: '已完成的任务会在 24 小时后自动清理',
      });
    }
    
    const state = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;
    
    const statusMap = {
      waiting: {
        status: 'waiting',
        message: '排队中...',
        progress: 0,
      },
      active: {
        status: 'processing',
        message: '生成中...',
        progress: progress || 50,
      },
      completed: {
        status: 'completed',
        message: '已完成',
        progress: 100,
        result: result
          ? {
              filePath: result.filePath,
              fileSize: result.fileSize,
              duration: result.duration,
            }
          : null,
        downloadUrl: `/pdf/download/${taskId}`,
      },
      failed: {
        status: 'failed',
        message: '生成失败',
        error: job.failedReason,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      },
    };
    
    res.json({
      success: true,
      data: {
        taskId,
        ...statusMap[state],
        createdAt: job.timestamp,
        processedAt: job.processedOn || null,
        finishedAt: job.finishedOn || null,
      },
    });
  } catch (error) {
    console.error('❌ 查询任务失败:', error);
    res.status(500).json({
      success: false,
      error: 'QUERY_ERROR',
      message: error.message,
    });
  }
});

/**
 * GET /pdf/download/:taskId - 下载生成的 PDF
 * @param {string} taskId - 任务 ID
 * @returns {File} PDF 文件
 */
router.get('/download/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const job = await pdfQueue.getJob(taskId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'TASK_NOT_FOUND',
        message: '任务不存在或已过期',
      });
    }
    
    const state = await job.getState();
    
    if (state === 'waiting' || state === 'active') {
      return res.status(400).json({
        success: false,
        error: 'NOT_READY',
        message: `任务尚未完成，当前状态: ${state}`,
        statusUrl: `/pdf/task/${taskId}`,
      });
    }
    
    if (state === 'failed') {
      return res.status(500).json({
        success: false,
        error: 'GENERATION_FAILED',
        message: '任务执行失败',
        reason: job.failedReason,
      });
    }
    
    const { filePath, template } = job.returnvalue;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'FILE_NOT_FOUND',
        message: 'PDF 文件不存在（可能已被清理）',
      });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${taskId}.pdf"`);
    res.setHeader('X-Task-ID', taskId);
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('❌ 下载失败:', error);
    res.status(500).json({
      success: false,
      error: 'DOWNLOAD_ERROR',
      message: error.message,
    });
  }
});

/**
 * GET /pdf/queue/status - 获取队列状态
 * @returns {Object} 队列统计信息
 */
router.get('/queue/status', async (req, res) => {
  try {
    const status = await checkQueueHealth();
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('❌ 查询队列状态失败:', error);
    res.status(500).json({
      success: false,
      error: 'QUEUE_STATUS_ERROR',
      message: error.message,
    });
  }
});

module.exports = router;
