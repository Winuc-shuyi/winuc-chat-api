import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFound = () => {
  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-center bg-secondary-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-lg w-full text-center">
        <h1 className="text-9xl font-bold text-primary-500">404</h1>
        
        <h2 className="text-2xl md:text-3xl font-semibold text-secondary-800 mb-4">
          页面未找到
        </h2>
        
        <p className="text-secondary-600 mb-8">
          您访问的页面不存在或已被移除。
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link 
            to="/"
            className="bg-primary-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-primary-600 transition duration-200"
          >
            返回首页
          </Link>
          
          <Link 
            to="/chat"
            className="bg-secondary-200 text-secondary-700 font-semibold py-2 px-6 rounded-md hover:bg-secondary-300 transition duration-200"
          >
            进入聊天
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default NotFound; 