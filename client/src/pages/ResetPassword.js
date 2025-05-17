import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { resetPassword } = useAuth();
  const { token } = useParams();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 表单验证
    if (!password || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    if (password.length < 6) {
      setError('密码长度至少为6个字符');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      await resetPassword(token, password);
      
      // 重置成功，重定向到首页
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '重置密码失败，请重试');
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
            重置密码
          </h3>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-2">
                新密码
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="设置新密码（至少6个字符）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-2">
                确认新密码
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '处理中...' : '重置密码'}
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

export default ResetPassword; 