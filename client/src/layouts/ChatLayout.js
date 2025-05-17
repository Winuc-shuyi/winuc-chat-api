import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const ChatLayout = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="flex h-screen bg-secondary-100">
      {/* 侧边栏 */}
      <motion.div 
        className={`bg-white shadow-lg flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out`}
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* 顶部标题和切换按钮 */}
        <div className="p-4 border-b border-secondary-200 flex items-center justify-between">
          {isSidebarOpen ? (
            <h1 className="text-primary-600 font-bold text-xl">WinUC 聊天</h1>
          ) : (
            <h1 className="text-primary-600 font-bold text-xl">WC</h1>
          )}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="text-secondary-500 hover:text-secondary-700"
          >
            {isSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        
        {/* 用户信息 */}
        <div className="p-4 border-b border-secondary-200">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
              {currentUser?.username?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            {isSidebarOpen && (
              <div className="ml-3">
                <p className="text-secondary-800 font-medium">{currentUser?.username || '用户'}</p>
                <p className="text-secondary-500 text-sm truncate">{currentUser?.email || 'user@example.com'}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 导航菜单 */}
        <nav className="flex-grow p-4">
          <ul className="space-y-2">
            <li>
              <Link 
                to="/chat" 
                className={`flex items-center p-2 rounded-md ${
                  location.pathname === '/chat' || location.pathname.startsWith('/chat/') || location.pathname.startsWith('/group/') 
                    ? 'bg-primary-100 text-primary-600' 
                    : 'text-secondary-700 hover:bg-secondary-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {isSidebarOpen && <span className="ml-3">聊天</span>}
              </Link>
            </li>
            <li>
              <Link 
                to="/friends" 
                className={`flex items-center p-2 rounded-md ${
                  location.pathname === '/friends' ? 'bg-primary-100 text-primary-600' : 'text-secondary-700 hover:bg-secondary-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {isSidebarOpen && <span className="ml-3">好友</span>}
              </Link>
            </li>
            <li>
              <Link 
                to="/groups" 
                className={`flex items-center p-2 rounded-md ${
                  location.pathname === '/groups' || location.pathname.startsWith('/group-detail/') 
                    ? 'bg-primary-100 text-primary-600' 
                    : 'text-secondary-700 hover:bg-secondary-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isSidebarOpen && <span className="ml-3">群组</span>}
              </Link>
            </li>
            <li>
              <Link 
                to="/profile" 
                className={`flex items-center p-2 rounded-md ${
                  location.pathname === '/profile' ? 'bg-primary-100 text-primary-600' : 'text-secondary-700 hover:bg-secondary-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {isSidebarOpen && <span className="ml-3">个人资料</span>}
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* 底部退出按钮 */}
        <div className="p-4 border-t border-secondary-200">
          <button 
            onClick={handleLogout}
            className="flex items-center text-secondary-700 hover:text-secondary-900 w-full p-2 rounded-md hover:bg-secondary-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isSidebarOpen && <span className="ml-3">退出登录</span>}
          </button>
        </div>
      </motion.div>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <motion.main 
          className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};

export default ChatLayout; 