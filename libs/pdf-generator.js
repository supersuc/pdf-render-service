const puppeteer = require("puppeteer");
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");

// 浏览器实例（全局复用）
let browser = null;
let pageCount = 0;
const MAX_PAGES = 5000;

/**
 * 获取 Chrome 路径（自动检测）
 */
function getChromePath() {
  if (process.env.CHROMIUM_PATH) {
    return process.env.CHROMIUM_PATH;
  }

  const commonPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
  ];

  for (const chromePath of commonPaths) {
    if (fs.existsSync(chromePath)) {
      console.log(`🔍 找到系统 Chrome: ${chromePath}`);
      return chromePath;
    }
  }

  return undefined;
}

/**
 * 初始化浏览器
 */
async function initBrowser() {
  if (browser) return browser;

  console.log("🌐 启动浏览器...");

  const chromePath = getChromePath();
  const launchOptions = {
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  };

  if (chromePath) {
    launchOptions.executablePath = chromePath;
  }

  browser = await puppeteer.launch(launchOptions);

  browser.on("disconnected", () => {
    console.log("⚠️  浏览器断开连接");
    browser = null;
  });

  console.log("✅ 浏览器启动成功");
  return browser;
}

/**
 * 重启浏览器
 */
async function restartBrowser() {
  console.log("🔄 重启浏览器...");
  if (browser) {
    await browser.close().catch(console.error);
    browser = null;
  }
  pageCount = 0;
  return await initBrowser();
}

/**
 * 关闭浏览器
 */
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    console.log("✅ 浏览器已关闭");
  }
}

/**
 * 生成 PDF
 * @param {Object} options - 生成选项
 * @param {string} options.template - 模板名称（不含.html）
 * @param {Object} options.data - 模板数据
 * @param {string} options.outputPath - 输出文件路径
 * @param {Object} options.pdfOptions - PDF 生成选项（可选）
 * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
 */
async function generatePDF(options) {
  const { template, data, outputPath, pdfOptions = {} } = options;
  const startTime = Date.now();

  try {
    // 检查必需参数
    if (!template) {
      throw new Error("缺少 template 参数");
    }
    if (!data) {
      throw new Error("缺少 data 参数");
    }
    if (!outputPath) {
      throw new Error("缺少 outputPath 参数");
    }

    // 检查是否需要重启浏览器
    if (pageCount > MAX_PAGES) {
      await restartBrowser();
    }

    // 确保浏览器已启动
    const browserInstance = await initBrowser();

    // 渲染模板
    const templatePath = path.join(__dirname, "../views", `${template}.html`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`模板不存在: ${template}.html`);
    }

    const html = await ejs.renderFile(templatePath, {
      ...data,
      SITE_URL: `http://localhost:${process.env.PORT || 3000}`,
    });

    // 创建页面
    const page = await browserInstance.newPage();
    pageCount++;

    await page.setViewport({ width: 1200, height: 1697 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    // 默认 PDF 选项
    const defaultPdfOptions = {
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "",
      footerTemplate: `
        <div style="width: 100%; text-align: center; margin: 10px auto 0; color: #333; font-size: 10px;">
          <span>第 <span class="pageNumber"></span> / <span class="totalPages"></span> 页</span>
        </div>
      `,
      margin: { top: "0px", bottom: "40px", left: "0px", right: "0px" },
    };

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成 PDF
    await page.pdf({
      ...defaultPdfOptions,
      ...pdfOptions,
      path: outputPath,
    });

    await page.close();

    const duration = Date.now() - startTime;
    console.log(
      `✅ PDF 生成成功: ${template} (${duration}ms) -> ${outputPath}`
    );

    return {
      success: true,
      filePath: outputPath,
      duration,
    };
  } catch (error) {
    console.error("❌ 生成 PDF 失败:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 渲染模板为 HTML
 * @param {Object} options - 渲染选项
 * @param {string} options.template - 模板名称
 * @param {Object} options.data - 模板数据
 * @returns {Promise<string>} HTML 内容
 */
async function renderHTML(options) {
  const { template, data } = options;

  try {
    const templatePath = path.join(__dirname, "../views", `${template}.html`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`模板不存在: ${template}.html`);
    }

    const html = await ejs.renderFile(templatePath, {
      ...data,
      SITE_URL: `http://localhost:${process.env.PORT || 3000}`,
    });

    return html;
  } catch (error) {
    console.error("❌ 渲染模板失败:", error);
    throw error;
  }
}

module.exports = {
  generatePDF,
  renderHTML,
  closeBrowser,
};
