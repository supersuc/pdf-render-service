const express = require('express');
const fs = require('fs');
const router = express.Router();
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const utils = require('../libs/utils');
const renderFileFn = utils.promisify(ejs.renderFile, ejs);
const {inPort, maxCount} = require('../common/config');
const qLimit = require('../libs/queueLimit')
const MAX_COUNT = maxCount || 5000;
const { performance }  = require('node:perf_hooks');
let count = 0;
let browser = null;
let oldBrowser = null;

class QueueManager {
  constructor(opts) {
    this.queue = [];
    this.concurrence = opts.concurrence;
    this.limit = qLimit(this.concurrence);
  }
  addTask(taskFn, context) {
    this.queue.push({
      execute: taskFn,
      context
    })
    this.run();
  }
  async run() {
    const ps = Promise.all(this.queue.map(task => this.limit(task.execute, task.context)));
    this.queue.length = 0;
    return ps;
  }
}

const init = async () => {
  browser = await puppeteer.launch({
    headless: true,
    // devtools: true,
    executablePath: process.env.CHROMIUM_PATH,
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--disable-extensions',
      '--single-process',
      '--no-zygote',
      '-–no-first-run',
      '--font-render-hinting=none'
    ]
  });
  if (browser) {
    browser.once('disconnected', () => {
      console.log('Chromium is disconnected')
      recreateBrowser();
    })
  }
}

const recreateBrowser = async () => {
  console.log('重新启动浏览器')
  count = 0;
  oldBrowser = browser;
  await init();
  oldBrowser.removeAllListeners('disconnected');
  const pages = await oldBrowser.pages();
  if (pages.length === 1) {
    await oldBrowser.close.catch(() => {
      console.log('关闭浏览器失败');
    });
  } else {
    oldBrowser.on('targetdestroyed', async () => {
      const pages = await oldBrowser.pages();
      if (pages.length === 1) {
        await oldBrowser.close().catch(() => {
          console.log('关闭浏览器失败');
        });
      }
    })
  }
}

const queueManager = new QueueManager({
  concurrence:50
});

(async () => {
  await init();
  queueManager.run();
})();

const exportPdf = async ({req, res}) => {

  try {
      function groupByDate(data) {
          const groupedData = {};

          data.forEach(item => {

              const date = item.time.split(' ')[0];
              if (!groupedData[date]) {
                  groupedData[date] = [];
              }
              //客户数据使用的事name字段
              if(Array.isArray(item.data)){
                  item.data.forEach((itemSon)=>{
                      groupedData[date].push(Object.assign({},{first:itemSon.first?item.first:false,time:itemSon.arrivedTime,type:itemSon.name},itemSon))
                  })
              }else{
                  if(item.data){
                      //兼容报备删除的arriveTime是取的报备时间,修正为报备过期时间
                      if(item.typeName === 'CHANNEL_REPORT_DELETE'){
                          groupedData[date].push(Object.assign({},{first:item.first?item.first:false,time:item.expire,type:item.name,arrivedTime:item.expire}))
                      }else{
                          let obj = JSON.parse(JSON.stringify(item.data))
                          obj.type = item.name
                          groupedData[date].push(Object.assign({},{first:item.first?item.first:false,time:item.time,type:item.name,last:item.last?item.last:false},obj))
                      }
                  }else{
                      groupedData[date].push(Object.assign({},
                          {first:item.first?item.first:false,time:item.time,type:item.name,last:item.last?item.last:false,arrivedTime:item.time,}
                      ))
                  }

              }
              // groupedData[date].push(item);
          });

          const result = Object.keys(groupedData).map(date => ({
              date,
              items: groupedData[date].sort((a,b)=>new Date(b.time) - new Date(a.time))
          }));
          console.log(result);
          return result;
      }
    let t1, t2;
    let footerTemplate = `<div style="width: 100%;text-align: center;margin: 10px auto 0;color: black;font-weight: 300;font-size: 10px;">
                            <span>第 <span class="pageNumber"></span></span>
                            <span> / </span
                            <span><span class="totalPages"></span> 页</span>
                         </div>`;
    const pdfConfig = {
      format: 'A4',
      headerTemplate: '',
      footerTemplate,
      scale: 1,
      displayHeaderFooter: true,
      printBackground: true,
      margin: {
          top: 0,
          bottom: 40
      }
    };
    const pageName = req.body.page;
    if (!pageName) {
      return res.render('error', {
        code: '-1'
      });
    }
    const tplPath = path.join(process.cwd(), `./views/${pageName}.html`)
    const SITE_URL = `http://localhost:${inPort}`;
    t1 = performance.now();
    const page = await browser.newPage();
    t2 = performance.now();
    console.log('新建TAB页', t2 - t1, 'ms')

    page.on('error', () => {
      console.log('页面崩溃了...')
    })

    await page.setViewport({
      width: 1200,
      height: 1697
    });
    const reqType = typeof req.body.content;
    const contentParse = reqType == 'string' ? JSON.parse(decodeURIComponent(req.body.content)) : req.body.content;
      console.log(contentParse);
      let isParse = req.body.parse || false;
      console.log(req.body.parse,isParse);
    //   if (isParse) {
    //   contentParse.trackList = await groupByDate(contentParse.trackList);
    // }
    const pageData = Object.assign({}, contentParse, { SITE_URL });
    // t1 = performance.now();
    const content = await renderFileFn(tplPath, pageData, {})
    // t2 = performance.now();
    // console.log('EJS组装页面HTML', t2 - t1, 'ms')
    t1 = performance.now();
    await page.setContent(content, {
        waitUntil: 'networkidle0'
    });
    t2 = performance.now();
    console.log('Chrome渲染页面', t2 - t1, 'ms')
    t1 = performance.now();
    const pdfBuffer = await page.pdf(pdfConfig);
    t2 = performance.now();
    console.log('生成PDF', t2 - t1, 'ms')
    // t1 = performance.now();
    await page.close();
    // t2 = performance.now();
    // console.log('关闭TAB页', t2 - t1, 'ms')
    res.set({
      'Content-Type': 'application/pdf'
    })
    res.send(pdfBuffer);
  } catch (error) {
    console.log(error);
    res.json({
      code: 1,
      msg: '操作失败,请稍后重新尝试'
    })
  }
}

router.get('/template', async (req, res, next) => {
  const tpl = req.query.name;
  try {
    const data = fs.readFileSync(`${path.join(__dirname, `../views/${tpl}.html`)}`, 'utf8')
      res.send(data);
  } catch (err) {
    console.error(err)
  }
})
router.post('/export', async function(req, res, next) {
  count ++;
  if (count > MAX_COUNT) {
    t1 = performance.now();
    await recreateBrowser();
    t2 = performance.now();
    console.log('打开浏览器', t2 - t1, 'ms');
  }
  queueManager.addTask(exportPdf, {req, res})
})

module.exports = router;
