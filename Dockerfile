# Dockerfile

FROM node:18-alpine

# 安装 Chromium（Alpine Linux 专用）
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

# 设置 Puppeteer 使用系统 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROMIUM_PATH=/usr/bin/chromium-browser

WORKDIR /app

# 复制项目文件
COPY package*.json ./
RUN npm install --production

COPY . .

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["npm", "start"]

