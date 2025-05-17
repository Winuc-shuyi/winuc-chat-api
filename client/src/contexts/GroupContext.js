import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import * as groupApi from '../api/groupApi';

const GroupContext = createContext();

export function useGroup() {
  return useContext(GroupContext);
}

export const GroupProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 强制刷新群组数据
  const refreshGroups = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 加载群组列表数据
  useEffect(() => {
    if (isAuthenticated) {
      const fetchGroupsData = async () => {
        setLoading(true);
        setError('');
        
        try {
          const groupsData = await groupApi.getUserGroups();
          setGroups(groupsData);
        } catch (err) {
          setError('加载群组数据失败');
          console.error('加载群组数据失败:', err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchGroupsData();
    } else {
      // 未登录时清空数据
      setGroups([]);
      setLoading(false);
    }
  }, [isAuthenticated, refreshTrigger]);

  // 创建新群组
  const createGroup = async (data) => {
    try {
      const group = await groupApi.createGroup(data);
      setGroups(prev => [...prev, group]);
      return group;
    } catch (err) {
      setError(err.response?.data?.message || '创建群组失败');
      throw err;
    }
  };

  // 获取群组详情
  const getGroupDetail = async (groupId) => {
    try {
      return await groupApi.getGroupDetail(groupId);
    } catch (err) {
      setError(err.response?.data?.message || '获取群组详情失败');
      throw err;
    }
  };

  // 更新群组信息
  const updateGroup = async (groupId, data) => {
    try {
      const updatedGroup = await groupApi.updateGroup(groupId, data);
      setGroups(prev => 
        prev.map(group => group._id === groupId ? updatedGroup : group)
      );
      return updatedGroup;
    } catch (err) {
      setError(err.response?.data?.message || '更新群组失败');
      throw err;
    }
  };

  // 删除群组
  const deleteGroup = async (groupId) => {
    try {
      await groupApi.deleteGroup(groupId);
      setGroups(prev => prev.filter(group => group._id !== groupId));
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '删除群组失败');
      throw err;
    }
  };

  // 添加成员到群组
  const addMemberToGroup = async (groupId, userId, nickname) => {
    try {
      const updatedGroup = await groupApi.addMemberToGroup(groupId, userId, nickname);
      setGroups(prev => 
        prev.map(group => group._id === groupId ? updatedGroup : group)
      );
      return updatedGroup;
    } catch (err) {
      setError(err.response?.data?.message || '添加成员失败');
      throw err;
    }
  };

  // 从群组移除成员
  const removeMemberFromGroup = async (groupId, userId) => {
    try {
      await groupApi.removeMemberFromGroup(groupId, userId);
      refreshGroups();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '移除成员失败');
      throw err;
    }
  };

  // 加入群组
  const joinGroup = async (groupId) => {
    try {
      const group = await groupApi.joinGroup(groupId);
      setGroups(prev => [...prev, group]);
      return group;
    } catch (err) {
      setError(err.response?.data?.message || '加入群组失败');
      throw err;
    }
  };

  // 退出群组
  const leaveGroup = async (groupId) => {
    try {
      await groupApi.leaveGroup(groupId);
      setGroups(prev => prev.filter(group => group._id !== groupId));
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '退出群组失败');
      throw err;
    }
  };

  // 设置群组管理员
  const setGroupAdmin = async (groupId, userId) => {
    try {
      const updatedGroup = await groupApi.setGroupAdmin(groupId, userId);
      setGroups(prev => 
        prev.map(group => group._id === groupId ? updatedGroup : group)
      );
      return updatedGroup;
    } catch (err) {
      setError(err.response?.data?.message || '设置管理员失败');
      throw err;
    }
  };

  // 移除群组管理员
  const removeGroupAdmin = async (groupId, userId) => {
    try {
      await groupApi.removeGroupAdmin(groupId, userId);
      refreshGroups();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || '移除管理员失败');
      throw err;
    }
  };

  // 搜索群组
  const searchGroups = async (keyword) => {
    try {
      return await groupApi.searchGroups(keyword);
    } catch (err) {
      setError(err.response?.data?.message || '搜索群组失败');
      throw err;
    }
  };

  // 获取群组消息历史
  const getGroupMessageHistory = async (groupId, limit, skip) => {
    try {
      return await groupApi.getGroupMessageHistory(groupId, limit, skip);
    } catch (err) {
      setError(err.response?.data?.message || '获取群组消息历史失败');
      throw err;
    }
  };

  // 发送群组消息
  const sendGroupMessage = async (groupId, content, type, metadata) => {
    try {
      return await groupApi.sendGroupMessage(groupId, content, type, metadata);
    } catch (err) {
      setError(err.response?.data?.message || '发送群组消息失败');
      throw err;
    }
  };

  const value = {
    groups,
    loading,
    error,
    refreshGroups,
    createGroup,
    getGroupDetail,
    updateGroup,
    deleteGroup,
    addMemberToGroup,
    removeMemberFromGroup,
    joinGroup,
    leaveGroup,
    setGroupAdmin,
    removeGroupAdmin,
    searchGroups,
    getGroupMessageHistory,
    sendGroupMessage
  };

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
}; 