import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { FriendProvider } from './contexts/FriendContext';
import { GroupProvider } from './contexts/GroupContext';
import { AnimatePresence } from 'framer-motion';

// 页面组件
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChatLayout from './layouts/ChatLayout';
import Chat from './pages/Chat';
import Friends from './pages/Friends';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// 保护路由组件
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-xl text-primary-600">加载中...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* 保护路由 */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <FriendProvider>
                <GroupProvider>
                  <ChatLayout />
                </GroupProvider>
              </FriendProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:userId" element={<Chat />} />
          <Route path="group/:groupId" element={<Chat />} />
          <Route path="group-detail/:groupId" element={<GroupDetail />} />
          <Route path="friends" element={<Friends />} />
          <Route path="groups" element={<Groups />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        {/* 404 页面 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App; 