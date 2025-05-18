<p align="center">
  <img src="docs/images/logo.png" alt="WinUC Chat API Logo" width="200"/>
</p>

<h1 align="center">WinUC Chat API</h1>

<p align="center">
  <a href="https://github.com/Winuc-shuyi/winuc-chat-api/actions"><img src="https://github.com/Winuc-shuyi/winuc-chat-api/workflows/CI/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/Winuc-shuyi/winuc-chat-api/releases"><img src="https://img.shields.io/github/v/release/Winuc-shuyi/winuc-chat-api" alt="Latest Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Winuc-shuyi/winuc-chat-api" alt="License"></a>
  <a href="https://github.com/Winuc-shuyi/winuc-chat-api/stargazers"><img src="https://img.shields.io/github/stars/Winuc-shuyi/winuc-chat-api" alt="GitHub Stars"></a>
  <a href="https://github.com/Winuc-shuyi/winuc-chat-api/network/members"><img src="https://img.shields.io/github/forks/Winuc-shuyi/winuc-chat-api" alt="GitHub Forks"></a>
  <a href="https://github.com/Winuc-shuyi/winuc-chat-api/issues"><img src="https://img.shields.io/github/issues/Winuc-shuyi/winuc-chat-api" alt="GitHub Issues"></a>
</p>

<p align="center">
  一个简洁、高效的聊天应用服务端 API，采用 Node.js 和 Express 构建，支持实时通信、用户认证和群组聊天。
</p>

<p align="center">
  <a href="#特点">特点</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#文档">文档</a> •
  <a href="#贡献">贡献</a> •
  <a href="#许可证">许可证</a>
</p>

--- 
# 简易聊天软件服务端

## 项目概述

这是一个简易聊天软件的服务端项目，使用稳定的技术栈构建，提供网页访问和API请求功能。项目特点：

- 稳定可靠的技术栈
- RESTful API接口（不使用WebSocket）
- 长轮询机制实现实时通信
- 美观的网页前端界面
- 完整的API文档
- C++客户端接入指南
- 支持Ubuntu服务器直接部署

## 技术栈

- 后端：Node.js + Express.js
- 数据库：MongoDB
- 前端：React + TailwindCSS + Framer Motion (动画)
- API文档：Swagger/OpenAPI
- 部署：支持Ubuntu服务器部署

## 项目规划

| 版本号 | 规划代号 | 内容 | 是否完成 |
|--------|---------|------|---------|
| v0.1.0 | A1 | 项目基础结构搭建（Express服务器、MongoDB连接） | 是 |
| v0.1.0 | A2 | 用户认证系统（注册、登录、JWT） | 是 |
| v0.2.0 | B1 | 消息系统核心功能（发送、接收消息API） | 是 |
| v0.2.0 | B2 | 长轮询机制实现实时通信 | 是 |
| v0.3.0 | C1 | 好友系统（添加、删除、查询） | 是 |
| v0.3.0 | C2 | 群组聊天功能 | 是 |
| v0.4.0 | D1 | 消息历史记录与查询 | 是 |
| v0.4.0 | D2 | 消息通知系统 | 是 |
| v0.5.0 | E1 | 网页前端界面开发（React） | 是 |
| v0.5.0 | E2 | 前端动画与交互体验优化 | 是 |
| v0.6.0 | F1 | API文档生成（Swagger/OpenAPI） | 是 |
| v0.6.0 | F2 | C++客户端接入指南编写 | 是 |
| v0.7.0 | G1 | CloudFlare部署配置 | 是 |
| v0.7.0 | G2 | 性能优化与安全加固 | 是 |
| v1.0.0 | H1 | 综合测试与Bug修复 | 是 |
| v1.0.0 | H2 | 正式版本发布 | 是 |
| v1.1.0 | I1 | 从CloudFlare迁移到Ubuntu服务器部署 | 否 |
| v1.1.0 | I2 | Ubuntu服务器环境优化与监控 | 否 |
| v1.2.0 | J1 | GitHub仓库美化与自定义模板 | 否 |

## 项目修复记录

- 2025-05-11: 修复项目无法启动问题
  - 创建了必要的 `.env` 文件，包含数据库连接和JWT密钥配置
  - 补充安装了所有缺失的依赖项，包括dotenv和服务器相关依赖
  - 为前端添加了必要的文件，包括 `public/index.html` 和 `manifest.json`
  - 创建了缺少的前端文件，包括 `reportWebVitals.js` 和 `AuthContext.js`
  
- 2025-05-11: 修复前端无法使用问题
  - 修复了CSS中的循环依赖问题
  - 创建了TailwindCSS配置和PostCSS配置
  - 添加了所有缺失的页面组件：Login, Register, Chat, Profile, NotFound
  - 创建了聊天布局组件ChatLayout
  - 添加了自定义动画和样式

- 2025-05-17: 修复群组聊天功能问题
  - 修复了前端应用无法编译运行的问题，主要是messageApi.js与Chat.js之间的函数引用问题
  - 解决了消息API使用中的问题，确保getGroupMessageHistory函数可以被正确导出和引用
  - 修复了ESLint警告，删除了未使用的变量和代码

- 2025-05-20: 增强消息历史记录与查询功能
  - 添加了按时间范围查询消息的API
  - 实现了分页加载更多历史消息的功能
  - 优化了消息列表的滚动加载体验
  - 改进了消息气泡组件的UI展示

- 2025-05-27: 完成API文档生成（Swagger/OpenAPI）
  - 完善了所有API路由的Swagger文档注释
  - 添加了详细的请求参数、响应模型和错误描述
  - 为notification.routes.js和poll.routes.js添加了完整的Swagger文档
  - 优化了API文档结构，确保所有API端点都有清晰的描述和示例

- 2025-05-30: 编写C++客户端接入指南
  - 创建了完整的C++客户端API接入文档
  - 实现了所有核心功能的C++调用示例，包括认证、消息收发、好友管理、群组功能等
  - 提供了长轮询机制的C++实现，实现实时消息接收
  - 添加了示例应用程序和CMake构建配置
  - 提供了常见问题解决方案和性能优化建议

- 2025-06-03: 完成性能优化与安全加固
  - 添加了多层次安全防护机制，包括：请求限流、XSS过滤、输入验证、安全响应头
  - 优化了数据库访问性能，添加了高效索引和连接池管理
  - 实现了精细的缓存策略和KV存储支持
  - 添加了完整的性能监控和指标收集系统
  - 加强了请求安全检查和错误处理机制
  - 为Serverless环境优化了代码结构和资源利用

- 2025-06-10: 新增Ubuntu服务器部署需求
  - 不再使用CloudFlare进行项目部署
  - 迁移到Ubuntu服务器直接部署方案
  - 需要调整服务端代码以适应传统服务器环境
  - 添加服务器运维相关配置（Nginx、PM2等）
  - 规划服务器监控和日志管理方案

- 2025-06-25: 正式版本v1.0.0发布
  - 创建详细的CHANGELOG记录版本更新历史
  - 更新版本号至v1.0.0
  - 开发发布脚本实现自动化发布流程
  - 编写完整的Ubuntu服务器部署文档
  - 添加服务器备份策略和监控配置指南
  - 所有功能测试完成并修复已知问题

- 2025-07-05: 新增GitHub仓库美化需求
  - 创建自定义Issue模板，提供预选选项
  - 添加Pull Request模板规范代码贡献
  - 设计项目徽章展示状态信息
  - 完善项目文档结构与导航
  - 添加贡献指南与行为准则
  - 实现自动化GitHub Actions工作流

## 详细功能规划

### 用户系统

- 用户注册与登录
- 个人资料管理
- JWT认证机制
- 权限控制

### 消息系统

- 私聊消息
- 群组消息
- 消息持久化存储
- 消息状态（已发送、已读）
- 消息类型（文本、图片链接）

### 实时通信（长轮询）

- 轮询API设计
- 消息队列实现
- 超时处理
- 高效消息推送

### 好友与群组

- 好友关系管理
- 群组创建与管理
- 群组成员权限

### 前端界面

- 响应式设计
- 美观的UI/UX
- 流畅的动画效果
- 跨设备兼容性

### API文档与接入指南

- RESTful API规范文档
- 接口测试用例
- C++客户端示例代码
- 接入流程详解

### 部署与运维

- Ubuntu服务器部署
- Nginx反向代理配置
- PM2进程管理
- 数据库备份与恢复
- 监控与告警机制

## 系统架构

- 前端与后端分离架构
- RESTful API通信
- 长轮询实现准实时通信
- 数据分层存储
- 缓存策略优化

## 环境设置

### 开发环境

1. 克隆仓库：`git clone https://github.com/yourusername/winuc-chat-api.git`
2. 安装依赖：`npm run install:all`
3. 配置环境变量：复制 `.env.example` 为 `.env` 并填写配置
4. 启动MongoDB：确保MongoDB服务已运行
5. 启动开发服务器：`npm run dev`

### 生产环境 (Ubuntu服务器)

1. 准备Ubuntu服务器环境
   - 安装Node.js (推荐v16+)：`sudo apt update && sudo apt install nodejs npm`
   - 安装MongoDB：`sudo apt install mongodb`
   - 安装Nginx：`sudo apt install nginx`
   - 安装PM2：`sudo npm install -g pm2`

2. 部署应用
   - 克隆仓库：`git clone https://github.com/yourusername/winuc-chat-api.git`
   - 安装依赖：`npm run install:all`
   - 配置环境变量：复制并修改 `.env.example` 为 `.env`
   - 构建前端：`npm run build`
   - 使用PM2启动服务：`pm2 start server.js --name winuc-chat-api`

3. 配置Nginx反向代理
   - 创建Nginx配置文件：`sudo nano /etc/nginx/sites-available/winuc-chat`
   - 添加以下配置：
   ```
   server {
     listen 80;
     server_name your-domain.com;
     
     location / {
       proxy_pass http://localhost:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```
   - 启用站点：`sudo ln -s /etc/nginx/sites-available/winuc-chat /etc/nginx/sites-enabled/`
   - 测试配置：`sudo nginx -t`
   - 重启Nginx：`sudo systemctl restart nginx`

4. 设置自动启动
   - 配置PM2自启动：`pm2 startup`
   - 保存PM2进程列表：`pm2 save`

### 环境变量

项目需要以下环境变量（可在 `.env` 文件中配置）：

- `PORT`：服务器端口号（默认3001）
- `NODE_ENV`：运行环境（development/production）
- `MONGODB_URI`：MongoDB连接字符串
- `JWT_SECRET`：JWT签名密钥
- `JWT_EXPIRES_IN`：JWT过期时间
- `LONG_POLLING_TIMEOUT`：长轮询超时时间（毫秒）
