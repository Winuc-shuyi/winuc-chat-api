import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const Profile = () => {
  const { currentUser, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 表单验证
    if (!username.trim() || !email.trim()) {
      setError('用户名和邮箱不能为空');
      return;
    }
    
    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // 这里应该调用API更新用户信息
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('个人资料更新成功');
      setIsEditing(false);
    } catch (error) {
      setError('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // 表单验证
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('请填写所有密码字段');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('新密码与确认密码不一致');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('新密码长度至少为6个字符');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // 调用修改密码API
      await changePassword(currentPassword, newPassword);
      
      // 清空密码字段
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setSuccess('密码修改成功');
      setIsChangingPassword(false);
    } catch (err) {
      setError(err.response?.data?.message || '密码修改失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.div 
      className="container mx-auto max-w-3xl py-8 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-secondary-800 mb-6">个人资料</h2>
          
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
          
          <div className="mb-8 flex items-center">
            <div className="h-24 w-24 rounded-full bg-primary-500 flex items-center justify-center text-white text-4xl font-bold">
              {username.substring(0, 2).toUpperCase()}
            </div>
            <div className="ml-6">
              <h3 className="text-xl font-semibold text-secondary-800">{username}</h3>
              <p className="text-secondary-500">{email}</p>
            </div>
          </div>
          
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-secondary-700 mb-1">
                    用户名
                  </label>
                  <input
                    type="text"
                    id="username"
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                    电子邮箱
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-secondary-700 mb-1">
                    个人简介
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="介绍一下你自己..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50"
                    disabled={loading}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </form>
          ) : isChangingPassword ? (
            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                    当前密码
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                    新密码
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                    确认新密码
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50"
                    disabled={loading}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? '处理中...' : '修改密码'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-secondary-500">用户名</h4>
                <p className="text-secondary-800">{username}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-secondary-500">电子邮箱</h4>
                <p className="text-secondary-800">{email}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-secondary-500">个人简介</h4>
                <p className="text-secondary-800">{bio || '暂无简介'}</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setIsChangingPassword(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                >
                  编辑资料
                </button>
                
                <button
                  onClick={() => {
                    setIsChangingPassword(true);
                    setIsEditing(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="px-4 py-2 bg-secondary-200 text-secondary-700 rounded-md hover:bg-secondary-300"
                >
                  修改密码
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Profile; 