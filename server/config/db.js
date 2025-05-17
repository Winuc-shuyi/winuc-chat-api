const mongoose = require('mongoose');

// MongoDB连接函数
const connectDB = async () => {
  try {
    const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/winuc-chat';
    
    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB连接成功: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`MongoDB连接错误: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 