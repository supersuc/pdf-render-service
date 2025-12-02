/**
 * 队列功能测试
 * 测试异步 PDF 生成流程
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// 测试数据
const testData = {
  invoice: {
    invoiceNumber: 'INV-TEST-001',
    date: '2024-12-01',
    companyName: '测试公司',
    companyAddress: '北京市朝阳区',
    companyPhone: '010-12345678',
    customerName: '张三',
    items: [
      { name: '测试商品 A', quantity: 2, price: 100 },
      { name: '测试商品 B', quantity: 1, price: 200 },
    ],
    subtotal: 400,
    tax: 24,
    total: 424,
  },
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testAsyncGeneration() {
  console.log('\n🧪 测试 1: 异步生成 PDF');
  console.log('=====================================\n');

  try {
    // 1. 提交任务
    console.log('📤 提交任务...');
    const submitResponse = await axios.post(`${BASE_URL}/pdf/generate-async`, {
      template: 'invoice',
      data: testData.invoice,
      priority: 5,
    });

    console.log('✅ 任务已提交:');
    console.log(JSON.stringify(submitResponse.data, null, 2));

    const { taskId } = submitResponse.data.data;

    // 2. 轮询任务状态
    console.log('\n🔄 查询任务状态...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!completed && attempts < maxAttempts) {
      await sleep(1000);
      attempts++;

      const statusResponse = await axios.get(`${BASE_URL}/pdf/task/${taskId}`);
      const { status, progress, message } = statusResponse.data.data;

      console.log(`   [${attempts}] 状态: ${status}, 进度: ${progress}%, ${message}`);

      if (status === 'completed') {
        completed = true;
        console.log('\n✅ 任务完成!');
        console.log(JSON.stringify(statusResponse.data, null, 2));

        // 3. 下载 PDF
        console.log('\n📥 下载 PDF...');
        const downloadResponse = await axios.get(`${BASE_URL}/pdf/download/${taskId}`, {
          responseType: 'arraybuffer',
        });

        const fileSize = downloadResponse.data.byteLength;
        console.log(`✅ PDF 下载成功: ${(fileSize / 1024).toFixed(2)}KB`);
      } else if (status === 'failed') {
        console.error('❌ 任务失败:', statusResponse.data.data.error);
        break;
      }
    }

    if (!completed && attempts >= maxAttempts) {
      console.error('❌ 任务超时');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

async function testQueueStatus() {
  console.log('\n🧪 测试 2: 查询队列状态');
  console.log('=====================================\n');

  try {
    const response = await axios.get(`${BASE_URL}/pdf/queue/status`);
    console.log('队列状态:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ 查询失败:', error.response?.data || error.message);
  }
}

async function testBatchGeneration() {
  console.log('\n🧪 测试 3: 批量提交任务');
  console.log('=====================================\n');

  const tasks = [];
  const taskCount = 3;

  try {
    // 批量提交
    console.log(`📤 提交 ${taskCount} 个任务...\n`);

    for (let i = 1; i <= taskCount; i++) {
      const data = {
        ...testData.invoice,
        invoiceNumber: `INV-BATCH-${i.toString().padStart(3, '0')}`,
      };

      const response = await axios.post(`${BASE_URL}/pdf/generate-async`, {
        template: 'invoice',
        data,
        priority: i, // 不同优先级
      });

      tasks.push({
        index: i,
        taskId: response.data.data.taskId,
      });

      console.log(`✅ [${i}/${taskCount}] 任务 ${response.data.data.taskId} 已提交 (优先级: ${i})`);
    }

    // 查看队列状态
    console.log('\n📊 队列状态:');
    const queueStatus = await axios.get(`${BASE_URL}/pdf/queue/status`);
    console.log(JSON.stringify(queueStatus.data, null, 2));

    // 等待所有任务完成
    console.log('\n⏳ 等待任务完成...\n');

    for (const task of tasks) {
      let completed = false;
      let attempts = 0;

      while (!completed && attempts < 20) {
        await sleep(1000);
        attempts++;

        const statusResponse = await axios.get(`${BASE_URL}/pdf/task/${task.taskId}`);
        const { status, progress } = statusResponse.data.data;

        if (status === 'completed') {
          completed = true;
          console.log(`✅ [${task.index}] 完成`);
        } else if (status === 'failed') {
          console.error(`❌ [${task.index}] 失败`);
          break;
        }
      }
    }

    console.log('\n✅ 批量任务测试完成');
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 开始测试队列功能');
  console.log('=====================================');
  console.log(`📍 服务地址: ${BASE_URL}`);
  console.log(`⚠️  请确保服务和 Redis 已启动\n`);

  try {
    await testAsyncGeneration();
    await sleep(2000);

    await testQueueStatus();
    await sleep(2000);

    await testBatchGeneration();

    console.log('\n\n✨ 所有测试完成！');
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    process.exit(1);
  }
}

// 检查依赖
async function checkServices() {
  try {
    // 检查服务
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ PDF 服务运行中');

    // 检查队列
    await axios.get(`${BASE_URL}/pdf/queue/status`);
    console.log('✅ Redis 队列连接正常\n');

    return true;
  } catch (error) {
    console.error('\n❌ 服务检查失败:');
    if (error.code === 'ECONNREFUSED') {
      console.error('   - PDF 服务未启动，请运行: npm run dev');
    } else if (error.response?.data?.error === 'QUEUE_STATUS_ERROR') {
      console.error('   - Redis 未启动，请运行: redis-server');
    } else {
      console.error('   -', error.message);
    }
    return false;
  }
}

// 主函数
(async () => {
  const servicesReady = await checkServices();
  if (!servicesReady) {
    process.exit(1);
  }

  await runTests();
})();

