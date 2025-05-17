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

  useEffect(() => {
    // 检查本地存储中是否有用户令牌
    const token = localStorage.getItem('token');
    
    if (token) {
      // 如果有令牌，验证其有效性
      axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        setCurrentUser(response.data.user);
        setIsAuthenticated(true);
        setLoading(false);
      })
      .catch(err => {
        // 令牌无效，清除本地存储
        localStorage.removeItem('token');
        setIsAuthenticated(false);
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
      
      // 将令牌保存到本地存储
      localStorage.setItem('token', response.data.data.token);
      
      // 设置当前用户
      setCurrentUser(response.data.data.user);
      setIsAuthenticated(true);
      setError('');
      return response.data.data.user;
    } catch (err) {
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
      
      // 将令牌保存到本地存储
      localStorage.setItem('token', response.data.data.token);
      
      // 设置当前用户
      setCurrentUser(response.data.data.user);
      setIsAuthenticated(true);
      setError('');
      return response.data.data.user;
    } catch (err) {
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