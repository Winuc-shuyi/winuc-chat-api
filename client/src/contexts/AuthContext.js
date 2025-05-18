import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 验证用户数据的完整性，确保包含必要的字段
  const validateAndSetUser = (user) => {
    if (!user) {
      console.error('收到无效的用户数据');
      return null;
    }

    // 确保用户对象中有_id字段
    if (!user._id) {
      // 如果没有_id但有id字段，创建_id
      if (user.id) {
        user = { ...user, _id: user.id };
        console.log('已从id创建_id字段');
      } else {
        console.error('用户数据缺少ID字段');
      }
    }

    // 确保其他重要字段存在
    if (!user.username) {
      console.warn('用户数据缺少username字段');
      // 使用email前缀作为用户名，如果有email的话
      if (user.email) {
        const emailPrefix = user.email.split('@')[0];
        user.username = emailPrefix || '用户';
        console.log('已从email创建username字段:', user.username);
      } else {
        user.username = '用户_' + Math.floor(Math.random() * 1000);
        console.log('已创建随机username:', user.username);
      }
    }

    // 确保所有对象都是可安全序列化的
    if (user._id && typeof user._id === 'object') {
      // 确保MongoDB ObjectId可以被正确转换为字符串
      try {
        const idStr = user._id.toString();
        if (idStr) {
          user._id = idStr;
          console.log('已将_id对象转换为字符串');
        }
      } catch (error) {
        console.error('无法将_id转换为字符串:', error);
        // 如果toString失败，尝试使用替代方法
        if (user._id.$oid) {
          user._id = user._id.$oid;
          console.log('使用$oid获取ID字符串');
        } else {
          // 最后尝试JSON序列化
          try {
            const idJson = JSON.stringify(user._id);
            user._id = idJson;
            console.log('使用JSON序列化ID对象');
          } catch (jsonError) {
            console.error('JSON序列化ID失败，创建新ID');
            user._id = 'user_' + Date.now();
          }
        }
      }
    }

    // 打印最终用户数据以便调试
    console.log('验证后的用户数据:', {
      _id: user._id,
      username: user.username,
      hasIdObject: typeof user._id === 'object',
      idType: typeof user._id
    });

    return user;
  };

  useEffect(() => {
    // 检查本地存储中是否有用户令牌
    const token = localStorage.getItem('token');
    
    if (token) {
      // 如果有令牌，验证其有效性
      axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        // 验证并设置用户数据
        const validatedUser = validateAndSetUser(response.data.user);
        if (validatedUser) {
          setCurrentUser(validatedUser);
        setIsAuthenticated(true);
        } else {
          throw new Error('用户数据无效');
        }
      })
      .catch(err => {
        // 令牌无效，清除本地存储
        console.error('验证用户令牌时出错:', err);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // 登录函数
  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });
      
      // 验证并设置用户数据
      const userData = response.data.data.user;
      const validatedUser = validateAndSetUser(userData);
      
      if (!validatedUser) {
        throw new Error('登录成功但返回了无效的用户数据');
      }
      
      // 将令牌保存到本地存储
      localStorage.setItem('token', response.data.data.token);
      
      // 设置当前用户
      setCurrentUser(validatedUser);
      setIsAuthenticated(true);
      setError('');
      return validatedUser;
    } catch (err) {
      console.error('登录失败:', err);
      setError(err.response?.data?.message || '登录失败，请重试');
      throw err;
    }
  };

  // 注册函数
  const register = async (username, password, email) => {
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        password,
        email
      });
      
      // 验证并设置用户数据
      const userData = response.data.data.user;
      const validatedUser = validateAndSetUser(userData);
      
      if (!validatedUser) {
        throw new Error('注册成功但返回了无效的用户数据');
      }
      
      // 将令牌保存到本地存储
      localStorage.setItem('token', response.data.data.token);
      
      // 设置当前用户
      setCurrentUser(validatedUser);
      setIsAuthenticated(true);
      setError('');
      return validatedUser;
    } catch (err) {
      console.error('注册失败:', err);
      setError(err.response?.data?.message || '注册失败，请重试');
      throw err;
    }
  };

  // 忘记密码函数
  const forgotPassword = async (email) => {
    try {
      const response = await axios.post('/api/auth/forgot-password', {
        email
      });
      
      setError('');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || '发送重置邮件失败，请重试');
      throw err;
    }
  };
  
  // 重置密码函数
  const resetPassword = async (resetToken, password) => {
    try {
      const response = await axios.put(`/api/auth/reset-password/${resetToken}`, {
        password
      });
      
      // 重置成功后直接登录
      if (response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
        
        // 获取用户信息
        const userResponse = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${response.data.data.token}` }
        });
        
        setCurrentUser(userResponse.data.data.user);
        setIsAuthenticated(true);
      }
      
      setError('');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || '重置密码失败，请重试');
      throw err;
    }
  };
  
  // 更改密码函数
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.put('/api/auth/change-password', 
        {
          currentPassword,
          newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // 更新token
      localStorage.setItem('token', response.data.data.token);
      
      setError('');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || '修改密码失败，请重试');
      throw err;
    }
  };

  // 登出函数
  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 调用登出API
      if (token) {
        await axios.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('登出时发生错误:', err);
    } finally {
      // 无论API调用是否成功，都清除本地存储和状态
      localStorage.removeItem('token');
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    forgotPassword,
    resetPassword,
    changePassword,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 