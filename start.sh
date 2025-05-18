#!/bin/bash

# 设置颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 输出彩色信息
info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# 检查PM2是否已安装
if ! command -v pm2 &> /dev/null; then
  info "正在安装PM2..."
  npm install -g pm2 || error "PM2安装失败"
fi

# 检查serve是否已安装
if ! command -v serve &> /dev/null; then
  info "正在安装serve..."
  npm install -g serve || error "serve安装失败"
fi

# 安装项目依赖
info "安装项目依赖..."
npm run install:all || error "依赖安装失败"

# 构建客户端
info "构建客户端应用..."
npm run build || error "客户端构建失败"

# 使用PM2启动应用
info "启动应用..."
npm run pm2:start || error "应用启动失败"

info "应用启动成功！"
info "API服务器: http://localhost:3001"
info "Web客户端: http://localhost:3000"
info "API文档: http://localhost:3001/api-docs"
info ""
info "查看应用状态: npm run pm2:status"
info "查看应用日志: npm run pm2:logs"
info "停止应用: npm run pm2:stop" 
