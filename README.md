# 简易聊天软件服务端

## 项目概述

这是一个简易聊天软件的服务端项目，使用稳定的技术栈构建，提供网页访问和API请求功能。项目特点：

- 稳定可靠的技术栈
- RESTful API接口（不使用WebSocket）
- 长轮询机制实现实时通信
- 美观的网页前端界面
- 完整的API文档
- C++客户端接入指南
- 支持CloudFlare部署

## 技术栈

- 后端：Node.js + Express.js
- 数据库：MongoDB
- 前端：React + TailwindCSS + Framer Motion (动画)
- API文档：Swagger/OpenAPI
- 部署：支持CloudFlare Pages/Workers

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
| v0.6.0 | F1 | API文档生成（Swagger/OpenAPI） | 否 |
| v0.6.0 | F2 | C++客户端接入指南编写 | 否 |
| v0.7.0 | G1 | CloudFlare部署配置 | 否 |
| v0.7.0 | G2 | 性能优化与安全加固 | 否 |
| v1.0.0 | H1 | 综合测试与Bug修复 | 是 |
| v1.0.0 | H2 | 正式版本发布 | 否 |

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

- CloudFlare Pages前端部署
- CloudFlare Workers后端部署
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

### 环境变量

项目需要以下环境变量（可在 `.env` 文件中配置）：

- `PORT`：服务器端口号（默认3001）
- `NODE_ENV`：运行环境（development/production）
- `MONGODB_URI`：MongoDB连接字符串
- `JWT_SECRET`：JWT签名密钥
- `JWT_EXPIRES_IN`：JWT过期时间
- `LONG_POLLING_TIMEOUT`：长轮询超时时间（毫秒）
