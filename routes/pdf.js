const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// 浏览器实例（全局复用）
let browser = null;
let pageCount = 0;
const MAX_PAGES = 5000; // 达到此数量后重启浏览器

// 获取 Chrome 路径（自动检测）
function getChromePath() {
  // 1. 优先使用环境变量
  if (process.env.CHROMIUM_PATH) {
    return process.env.CHROMIUM_PATH;
  }
  
  // 2. Windows 常见路径
  const commonPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  
  for (const chromePath of commonPaths) {
    if (fs.existsSync(chromePath)) {
      console.log(`🔍 找到系统 Chrome: ${chromePath}`);
      return chromePath;
    }
  }
  
  // 3. 如果都没找到，返回 undefined（让 Puppeteer 使用自带的）
  console.log('ℹ️  使用 Puppeteer 内置 Chromium');
  return undefined;
}

// 初始化浏览器
async function initBrowser() {
  if (browser) return browser;
  
  console.log('🌐 启动浏览器...');
  
  const chromePath = getChromePath();
  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  };
  
  if (chromePath) {
    launchOptions.executablePath = chromePath;
  }
  
  browser = await puppeteer.launch(launchOptions);
  
  browser.on('disconnected', () => {
    console.log('⚠️  浏览器断开连接');
    browser = null;
  });
  
  console.log('✅ 浏览器启动成功');
  return browser;
}

// 重启浏览器
async function restartBrowser() {
  console.log('🔄 重启浏览器...');
  if (browser) {
    await browser.close().catch(console.error);
    browser = null;
  }
  pageCount = 0;
  return await initBrowser();
}

/**
 * POST /pdf/generate - 生成 PDF
 * 
 * 请求体：
 * {
 *   "template": "模板名称（不含.html）",
 *   "data": { 模板数据 }
 * }
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { template, data } = req.body;
    
    if (!template) {
      return res.status(400).json({ 
        error: '缺少 template 参数' 
      });
    }
    
    if (!data) {
      return res.status(400).json({ 
        error: '缺少 data 参数' 
      });
    }
    
    // 检查是否需要重启浏览器
    if (pageCount > MAX_PAGES) {
      await restartBrowser();
    }
    
    // 确保浏览器已启动
    const browserInstance = await initBrowser();
    
    // 渲染模板
    const templatePath = path.join(__dirname, '../views', `${template}.html`);
    const html = await ejs.renderFile(templatePath, {
      ...data,
      SITE_URL: req.app.locals.SITE_URL
    });
    
    // 创建页面
    const page = await browserInstance.newPage();
    pageCount++;
    
    await page.setViewport({ width: 1200, height: 1697 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // 生成 PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '',
      footerTemplate: `
        <div style="width:100%; text-align:center; font-size:10px; color:#666;">
          第 <span class="pageNumber"></span> / <span class="totalPages"></span> 页
        </div>
      `,
      margin: { top: '0', bottom: '40px' }
    });
    
    await page.close();
    
    const duration = Date.now() - startTime;
    console.log(`✅ PDF 生成成功: ${template} (${duration}ms)`);
    
    // 返回 PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${template}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ 生成 PDF 失败:', error);
    res.status(500).json({
      error: '生成 PDF 失败',
      message: error.message
    });
  }
});

/**
 * POST /pdf/preview - 预览 HTML（用于调试模板）
 */
router.post('/preview', async (req, res) => {
  try {
    const { template, data } = req.body;
    
    if (!template || !data) {
      return res.status(400).json({ 
        error: '缺少 template 或 data 参数' 
      });
    }
    
    const templatePath = path.join(__dirname, '../views', `${template}.html`);
    const html = await ejs.renderFile(templatePath, {
      ...data,
      SITE_URL: req.app.locals.SITE_URL
    });
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('❌ 预览失败:', error);
    res.status(500).json({
      error: '预览失败',
      message: error.message
    });
  }
});

// 优雅关闭：退出时关闭浏览器
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭浏览器...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

module.exports = router;

