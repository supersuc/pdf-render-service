module.exports = {
  apps: [
    {
      name: "pdf-service",
      script: "./app.js",
      instances: 2, // 集群模式，2个实例
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        CHROMIUM_PATH:
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        CHROMIUM_PATH:
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
