import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { forgotPassword } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('请输入电子邮箱');
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      // 调用忘记密码接口，不需要使用返回值
      await forgotPassword(email);
      
      // 显示成功信息，在实际应用中应告知用户检查邮箱
      setSuccess('密码重置链接已发送到您的邮箱，请查收');
      
      // 清空输入框
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || '发送重置链接失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center bg-secondary-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-primary-600 text-center mb-6">
            WinUC 聊天
          </h2>
          
          <h3 className="text-xl font-semibold text-secondary-800 text-center mb-8">
            忘记密码
          </h3>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
                电子邮箱
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="输入您注册时使用的邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '处理中...' : '发送重置链接'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ForgotPassword; 