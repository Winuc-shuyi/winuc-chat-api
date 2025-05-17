import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import * as friendApi from '../api/friendApi';

const FriendContext = createContext();

export function useFriend() {
  return useContext(FriendContext);
}

export const FriendProvider = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [friends, setFriends] = useState([]);
  const [friendGroups, setFriendGroups] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 强制刷新好友数据
  const refreshFriends = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 加载好友列表数据
  useEffect(() => {
    if (isAuthenticated) {
      const fetchFriendsData = async () => {
        setLoading(true);
        setError('');
        
        try {
          // 获取好友分组数据
          const friendGroupsData = await friendApi.getFriends();
          setFriendGroups(friendGroupsData);
          
          // 获取好友扁平列表
          const friendsListData = await friendApi.getFriendsList();
          setFriends(friendsListData);
          
          // 获取待处理请求
          const pendingRequestsData = await friendApi.getPendingRequests();
          setPendingRequests(pendingRequestsData);
          
        } catch (err) {
          setError('加载好友数据失败');
          console.error('加载好友数据失败:', err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchFriendsData();
    } else {
      // 未登录时清空数据
      setFriends([]);
      setFriendGroups([]);
      setPendingRequests({ received: [], sent: [] });
      setLoading(false);
    }
  }, [isAuthenticated, refreshTrigger]);

  // 添加好友
  const sendFriendRequest = async (receiverId, message = '') => {
    try {
      await friendApi.sendFriendRequest(receiverId, message);
      // 刷新待处理好友请求
      const pendingRequestsData = await friendApi.getPendingRequests();
      setPendingRequests(pendingRequestsData);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '发送好友请求失败');
      throw err;
    }
  };

  // 接受好友请求
  const acceptRequest = async (requestId) => {
    try {
      await friendApi.acceptFriendRequest(requestId);
      refreshFriends();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '接受好友请求失败');
      throw err;
    }
  };

  // 拒绝好友请求
  const rejectRequest = async (requestId) => {
    try {
      await friendApi.rejectFriendRequest(requestId);
      // 更新待处理请求列表
      const pendingRequestsData = await friendApi.getPendingRequests();
      setPendingRequests(pendingRequestsData);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '拒绝好友请求失败');
      throw err;
    }
  };

  // 搜索用户
  const searchUsers = async (keyword) => {
    try {
      return await friendApi.searchUsers(keyword);
    } catch (err) {
      setError(err.response?.data?.message || '搜索用户失败');
      throw err;
    }
  };

  // 创建好友分组
  const createFriendGroup = async (name, description = '') => {
    try {
      await friendApi.createFriendGroup(name, description);
      refreshFriends();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '创建好友分组失败');
      throw err;
    }
  };

  // 更新好友信息
  const updateFriendInfo = async (friendId, data) => {
    try {
      await friendApi.updateFriendInfo(friendId, data);
      refreshFriends();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '更新好友信息失败');
      throw err;
    }
  };

  // 删除好友
  const removeFriend = async (friendId) => {
    try {
      await friendApi.removeFriend(friendId);
      refreshFriends();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '删除好友失败');
      throw err;
    }
  };

  // 检查好友关系
  const checkFriendship = async (userId) => {
    try {
      return await friendApi.checkFriendship(userId);
    } catch (err) {
      setError(err.response?.data?.message || '检查好友关系失败');
      throw err;
    }
  };

  const value = {
    friends,
    friendGroups,
    pendingRequests,
    loading,
    error,
    refreshFriends,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    searchUsers,
    createFriendGroup,
    updateFriendInfo,
    removeFriend,
    checkFriendship
  };

  return (
    <FriendContext.Provider value={value}>
      {children}
    </FriendContext.Provider>
  );
}; 