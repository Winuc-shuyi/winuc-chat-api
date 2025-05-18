require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

// 导入路由
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const messageRoutes = require('./routes/message.routes');
const pollRoutes = require('./routes/poll.routes');
const friendRoutes = require('./routes/friend.routes');
const groupRoutes = require('./routes/group.routes');
const notificationRoutes = require('./routes/notification.routes');

// 导入错误处理中间件
const errorHandler = require('./middlewares/error');

// 导入长轮询管理器和消息队列
const PollManager = require('./utils/PollManager');
const MessageQueue = require('./models/MessageQueue');

// 将MessageQueue模型设为全局对象，方便在路由中使用
global.MessageQueue = MessageQueue;

// Swagger文档
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 配置Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WinUC Chat API',
      version: '0.1.0',
      description: '简易聊天软件服务端API文档',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./models/*.js', './routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(compression());

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/poll', pollRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

// API文档路由
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// 前端静态文件服务（生产环境）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// 404处理
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 错误处理中间件
app.use(errorHandler);

// 定时任务
function setupScheduledTasks() {
  console.log('设置定时任务...');
  
  // 每小时清理过期的长轮询会话
  setInterval(async () => {
    try {
      const cleanedCount = await PollManager.cleanupExpiredSessions();
      if (cleanedCount > 0) {
        console.log(`清理了 ${cleanedCount} 个过期会话`);
      }
    } catch (err) {
      console.error('清理过期会话失败:', err);
    }
  }, 60 * 60 * 1000); // 每小时执行一次
  
  // 每天清理已发送的旧消息
  setInterval(async () => {
    try {
      await MessageQueue.cleanupDeliveredMessages();
      console.log('已清理旧消息队列');
    } catch (err) {
      console.error('清理旧消息队列失败:', err);
    }
  }, 24 * 60 * 60 * 1000); // 每天执行一次
}

// 连接MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/winuc-chat', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB数据库连接成功');
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`API文档可在 http://localhost:${PORT}/api-docs 访问`);
      
      // 设置定时任务
      setupScheduledTasks();
    });
  })
  .catch((err) => {
    console.error('MongoDB连接失败:', err.message);
  });

module.exports = app; // 用于测试 