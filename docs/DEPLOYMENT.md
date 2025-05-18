# WinUC Chat API 部署指南

本文档提供WinUC Chat API v1.0.0在Ubuntu服务器上的详细部署步骤。

## 目录
- [系统要求](#系统要求)
- [环境准备](#环境准备)
- [应用部署](#应用部署)
- [配置Nginx](#配置nginx)
- [配置MongoDB](#配置mongodb)
- [启动应用](#启动应用)
- [SSL配置](#ssl配置)
- [监控与日志](#监控与日志)
- [备份策略](#备份策略)
- [常见问题](#常见问题)

## 系统要求

- Ubuntu 20.04 LTS或更高版本
- Node.js 16.x或更高版本
- MongoDB 4.4或更高版本
- Nginx 1.18或更高版本
- 至少1GB RAM
- 至少20GB可用磁盘空间

## 环境准备

### 安装Node.js
```bash
# 添加Node.js源
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -

# 安装Node.js和npm
sudo apt install -y nodejs

# 验证安装
node -v
npm -v
```

### 安装MongoDB
```bash
# 导入MongoDB公钥
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -

# 添加MongoDB源
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list

# 更新软件包列表
sudo apt update

# 安装MongoDB
sudo apt install -y mongodb-org

# 启动MongoDB服务
sudo systemctl start mongod

# 设置开机自启
sudo systemctl enable mongod

# 验证安装
mongo --eval 'db.runCommand({ connectionStatus: 1 })'
```

### 安装Nginx
```bash
# 安装Nginx
sudo apt install -y nginx

# 启动Nginx服务
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 验证安装
nginx -v
```

### 安装PM2
```bash
# 全局安装PM2
sudo npm install -g pm2

# 设置PM2开机自启
pm2 startup ubuntu
```

## 应用部署

### 下载并解压应用
```bash
# 创建应用目录
sudo mkdir -p /var/www/winuc-chat-api

# 下载发布包
wget https://github.com/yourusername/winuc-chat-api/releases/download/v1.0.0/winuc-chat-api-v1.0.0.tar.gz

# 解压到应用目录
sudo tar -xzf winuc-chat-api-v1.0.0.tar.gz -C /var/www/winuc-chat-api --strip-components=1

# 进入应用目录
cd /var/www/winuc-chat-api

# 安装依赖
npm install --production
```

### 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑环境变量
nano .env
```

`.env`文件内容示例：
```
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/winuc-chat
JWT_SECRET=your_very_secure_jwt_secret_key
JWT_EXPIRES_IN=7d
LONG_POLLING_TIMEOUT=30000
```

## 配置Nginx

创建Nginx配置文件：
```bash
sudo nano /etc/nginx/sites-available/winuc-chat
```

添加以下配置：
```nginx
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    access_log /var/log/nginx/winuc-chat-access.log;
    error_log /var/log/nginx/winuc-chat-error.log;
}
```

启用配置并重启Nginx：
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/winuc-chat /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

## 配置MongoDB

### 创建数据库用户
```bash
# 连接MongoDB
mongo

# 创建数据库和用户
use winuc-chat
db.createUser({
  user: "winuc-api",
  pwd: "your_secure_password",
  roles: [{ role: "readWrite", db: "winuc-chat" }]
})

# 退出
exit
```

### 更新.env文件中的MongoDB URI
```bash
# 编辑.env文件
nano .env
```

修改MONGODB_URI：
```
MONGODB_URI=mongodb://winuc-api:your_secure_password@localhost:27017/winuc-chat
```

## 启动应用

使用PM2启动应用：
```bash
# 进入应用目录
cd /var/www/winuc-chat-api

# 使用PM2启动应用
pm2 start server/server.js --name winuc-chat-api

# 保存PM2配置
pm2 save

# 查看应用状态
pm2 status
```

## SSL配置

使用Certbot安装Let's Encrypt SSL证书：
```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期配置
sudo systemctl status certbot.timer
```

## 监控与日志

### 应用日志
```bash
# 查看PM2日志
pm2 logs winuc-chat-api

# 查看实时日志
pm2 logs winuc-chat-api --lines 200
```

### Nginx日志
```bash
# 访问日志
sudo tail -f /var/log/nginx/winuc-chat-access.log

# 错误日志
sudo tail -f /var/log/nginx/winuc-chat-error.log
```

### MongoDB日志
```bash
# MongoDB日志
sudo tail -f /var/log/mongodb/mongod.log
```

### 系统监控
```bash
# 安装监控工具
sudo apt install -y htop

# 启动监控
htop
```

## 备份策略

### 数据库备份
创建自动备份脚本：
```bash
sudo nano /usr/local/bin/mongodb-backup.sh
```

脚本内容：
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
MONGODB_HOST="localhost"
MONGODB_PORT="27017"
MONGODB_USER="winuc-api"
MONGODB_PASSWORD="your_secure_password"
MONGODB_DB="winuc-chat"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
mongodump --host $MONGODB_HOST --port $MONGODB_PORT --username $MONGODB_USER --password $MONGODB_PASSWORD --db $MONGODB_DB --out $BACKUP_DIR/$DATE

# 压缩备份
tar -czf $BACKUP_DIR/$DATE.tar.gz -C $BACKUP_DIR $DATE

# 删除原始备份目录
rm -rf $BACKUP_DIR/$DATE

# 删除7天前的备份
find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +7 -delete
```

设置权限并创建定时任务：
```bash
# 赋予执行权限
sudo chmod +x /usr/local/bin/mongodb-backup.sh

# 编辑crontab
sudo crontab -e
```

添加定时任务（每天凌晨3点执行）：
```
0 3 * * * /usr/local/bin/mongodb-backup.sh >> /var/log/mongodb-backup.log 2>&1
```

### 应用备份
定期备份应用目录：
```bash
sudo nano /usr/local/bin/app-backup.sh
```

脚本内容：
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/winuc-chat-api"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
APP_DIR="/var/www/winuc-chat-api"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
tar -czf $BACKUP_DIR/app-$DATE.tar.gz -C $APP_DIR .

# 删除30天前的备份
find $BACKUP_DIR -type f -name "app-*.tar.gz" -mtime +30 -delete
```

设置权限并创建定时任务：
```bash
# 赋予执行权限
sudo chmod +x /usr/local/bin/app-backup.sh

# 编辑crontab
sudo crontab -e
```

添加定时任务（每周日凌晨4点执行）：
```
0 4 * * 0 /usr/local/bin/app-backup.sh >> /var/log/app-backup.log 2>&1
```

## 常见问题

### 应用无法启动
1. 检查环境变量是否正确配置
2. 确认MongoDB数据库是否运行
3. 查看PM2日志寻找错误信息
```bash
pm2 logs winuc-chat-api
```

### 无法连接到数据库
1. 确认MongoDB服务正在运行
```bash
sudo systemctl status mongod
```
2. 检查MongoDB连接字符串是否正确
3. 验证数据库用户名和密码

### 网站无法访问
1. 检查Nginx配置
```bash
sudo nginx -t
```
2. 确认应用正在运行
```bash
pm2 status
```
3. 检查服务器防火墙设置
```bash
sudo ufw status
```

### 性能问题
1. 增加服务器资源（CPU/内存）
2. 优化MongoDB索引
3. 启用Nginx缓存
4. 调整Node.js内存限制
```bash
pm2 restart winuc-chat-api --node-args="--max-old-space-size=2048"
``` 