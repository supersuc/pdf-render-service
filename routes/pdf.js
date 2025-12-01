const express = require('express');
const router = express.Router();
const { generatePDF, renderHTML } = require('../libs/pdf-generator');
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
          console.log(`✅ [${Date.now() - startTime}ms] PDF 已发送: ${template}`);
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

module.exports = router;
