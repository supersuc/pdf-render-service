const http = require("http");
const fs = require("fs");
const path = require("path");

const API_HOST = "localhost";
const API_PORT = 3000;

// 发送 POST 请求
function sendRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      const chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// 测试生成发票 PDF
async function testInvoice() {
  console.log("\n📄 测试生成发票 PDF...");

  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "invoice-data.json"), "utf8")
  );

  try {
    const response = await sendRequest("/pdf/generate", data);

    if (response.statusCode === 200) {
      const outputPath = path.join(__dirname, "../output/invoice.pdf");
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, response.body);
      console.log(`✅ 发票 PDF 生成成功: ${outputPath}`);
    } else {
      console.error(`❌ 失败: HTTP ${response.statusCode}`);
    }
  } catch (error) {
    console.error("❌ 错误:", error.message);
  }
}

// 测试生成报告 PDF
async function testReport() {
  console.log("\n📊 测试生成报告 PDF...");

  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "report-data.json"), "utf8")
  );

  try {
    const response = await sendRequest("/pdf/generate", data);

    if (response.statusCode === 200) {
      const outputPath = path.join(__dirname, "../output/report.pdf");
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, response.body);
      console.log(`✅ 报告 PDF 生成成功: ${outputPath}`);
    } else {
      console.error(`❌ 失败: HTTP ${response.statusCode}`);
    }
  } catch (error) {
    console.error("❌ 错误:", error.message);
  }
}

// 测试预览 HTML
async function testPreview() {
  console.log("\n👀 测试预览 HTML...");

  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "invoice-data.json"), "utf8")
  );

  try {
    const response = await sendRequest("/pdf/preview", data);

    if (response.statusCode === 200) {
      const outputPath = path.join(__dirname, "../output/preview.html");
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, response.body);
      console.log(`✅ HTML 预览生成成功: ${outputPath}`);
    } else {
      console.error(`❌ 失败: HTTP ${response.statusCode}`);
    }
  } catch (error) {
    console.error("❌ 错误:", error.message);
  }
}

// 运行所有测试
async function runTests() {
  console.log("🚀 开始测试 PDF 服务...");
  console.log(`📍 API 地址: http://${API_HOST}:${API_PORT}`);

  await testInvoice();
  await testReport();
  await testPreview();

  console.log("\n✨ 测试完成！请查看 output/ 目录\n");
}

runTests().catch(console.error);
