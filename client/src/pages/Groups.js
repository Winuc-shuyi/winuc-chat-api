import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../contexts/GroupContext';
import { useFriend } from '../contexts/FriendContext';
import { motion } from 'framer-motion';

const Groups = () => {
  const navigate = useNavigate();
  const { 
    groups, 
    loading, 
    createGroup, 
    refreshGroups,
    searchGroups,
    joinGroup,
    leaveGroup
  } = useGroup();
  
  const { friends } = useFriend();
  
  const [activeTab, setActiveTab] = useState('myGroups');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // 新群组表单数据
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    isPublic: true,
    initialMembers: []
  });
  
  // 处理创建群组
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    try {
      await createGroup(newGroupData);
      setShowCreateModal(false);
      setNewGroupData({
        name: '',
        description: '',
        isPublic: true,
        initialMembers: []
      });
      refreshGroups();
    } catch (err) {
      console.error('创建群组失败:', err);
    }
  };
  
  // 处理搜索
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    
    setSearchLoading(true);
    try {
      const results = await searchGroups(searchKeyword);
      setSearchResults(results);
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      setSearchLoading(false);
    }
  };
  
  // 处理加入群组
  const handleJoinGroup = async (groupId) => {
    try {
      await joinGroup(groupId);
      // 刷新搜索结果
      await handleSearch();
      refreshGroups();
    } catch (err) {
      console.error('加入群组失败:', err);
    }
  };
  
  // 处理退出群组
  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      await leaveGroup(selectedGroup._id);
      setShowConfirmModal(false);
      setSelectedGroup(null);
      refreshGroups();
    } catch (err) {
      console.error('退出群组失败:', err);
    }
  };
  
  // 确认退出群组
  const confirmLeaveGroup = (group) => {
    setSelectedGroup(group);
    setShowConfirmModal(true);
  };
  
  // 进入群聊
  const enterGroupChat = (groupId) => {
    navigate(`/group/${groupId}`);
  };
  
  // 处理勾选/取消勾选好友
  const handleToggleFriend = (friendId) => {
    setNewGroupData(prev => {
      const initialMembers = [...prev.initialMembers];
      const index = initialMembers.indexOf(friendId);
      
      if (index > -1) {
        initialMembers.splice(index, 1);
      } else {
        initialMembers.push(friendId);
      }
      
      return { ...prev, initialMembers };
    });
  };
  
  // 在切换标签页时清空搜索
  useEffect(() => {
    setSearchKeyword('');
    setSearchResults([]);
  }, [activeTab]);
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* 标签页头部 */}
        <div className="flex border-b border-secondary-200">
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'myGroups'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
            onClick={() => setActiveTab('myGroups')}
          >
            我的群组
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'search'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
            onClick={() => setActiveTab('search')}
          >
            查找群组
          </button>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="py-8 text-center text-secondary-500">
              <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>加载中...</p>
            </div>
          ) : (
            <>
              {/* 我的群组标签页 */}
              {activeTab === 'myGroups' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">我的群组</h2>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 text-sm"
                    >
                      创建新群组
                    </button>
                  </div>
                  
                  {groups.length === 0 ? (
                    <div className="text-center py-12 bg-secondary-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-secondary-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-secondary-600 mb-2">你还没有加入任何群组</p>
                      <p className="text-secondary-500 text-sm mb-4">创建一个新群组或搜索已有群组加入</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                      >
                        创建新群组
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groups.map(group => (
                        <motion.div
                          key={group._id}
                          className="border border-secondary-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="p-4 border-b border-secondary-100">
                            <div className="flex items-center">
                              <div className="h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-lg">
                                {group.name.substring(0, 2)}
                              </div>
                              <div className="ml-3 flex-1">
                                <h3 className="font-semibold text-secondary-800">{group.name}</h3>
                                <p className="text-xs text-secondary-500">
                                  {group.members ? `${group.members.length} 位成员` : '加载中...'}
                                </p>
                              </div>
                              <div className="text-xs px-2 py-1 bg-secondary-100 rounded-full text-secondary-700">
                                {group.isPublic ? '公开' : '私密'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3 text-sm text-secondary-600">
                            <p className="line-clamp-2 h-10">{group.description || '暂无群组介绍'}</p>
                          </div>
                          
                          <div className="p-3 border-t border-secondary-100 bg-secondary-50 flex justify-between">
                            <button
                              onClick={() => enterGroupChat(group._id)}
                              className="px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 text-sm"
                            >
                              进入群聊
                            </button>
                            <button
                              onClick={() => confirmLeaveGroup(group)}
                              className="px-3 py-1.5 border border-red-500 text-red-500 rounded-md hover:bg-red-50 text-sm"
                            >
                              退出群组
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* 查找群组标签页 */}
              {activeTab === 'search' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">查找群组</h2>
                  
                  <div className="mb-6">
                    <div className="flex">
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="输入群组名称搜索"
                        className="flex-1 p-2 border border-secondary-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={searchLoading || !searchKeyword.trim()}
                        className="bg-primary-500 text-white px-4 py-2 rounded-r-md hover:bg-primary-600 disabled:bg-primary-300"
                      >
                        {searchLoading ? '搜索中...' : '搜索'}
                      </button>
                    </div>
                    
                    <p className="text-xs text-secondary-500 mt-1">搜索公开的群组以加入</p>
                  </div>
                  
                  {/* 搜索结果 */}
                  {searchResults.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium mb-2 pb-2 border-b border-secondary-200">搜索结果</h3>
                      
                      <div className="space-y-4 mt-4">
                        {searchResults.map((group) => (
                          <motion.div
                            key={group._id}
                            className="p-4 border border-secondary-200 rounded-lg"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-lg">
                                  {group.name.substring(0, 2)}
                                </div>
                                <div className="ml-3">
                                  <h3 className="font-semibold text-secondary-800">{group.name}</h3>
                                  <p className="text-xs text-secondary-500">
                                    {group.members ? `${group.members.length} 位成员` : '加载中...'}
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                {/* 检查用户是否已经在群组中 */}
                                {groups.some(g => g._id === group._id) ? (
                                  <button
                                    onClick={() => enterGroupChat(group._id)}
                                    className="px-3 py-1.5 bg-secondary-500 text-white rounded-md hover:bg-secondary-600 text-sm"
                                  >
                                    已加入
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleJoinGroup(group._id)}
                                    className="px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 text-sm"
                                  >
                                    加入群组
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <p className="mt-2 text-sm text-secondary-600">
                              {group.description || '暂无群组介绍'}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {searchKeyword && searchResults.length === 0 && !searchLoading && (
                    <div className="text-center py-8 bg-secondary-50 rounded-lg">
                      <p className="text-secondary-600">未找到相关群组</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* 创建群组弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4">创建新群组</h3>
            
            <form onSubmit={handleCreateGroup}>
              <div className="mb-4">
                <label className="block text-secondary-700 text-sm font-medium mb-1">
                  群组名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newGroupData.name}
                  onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                  className="w-full p-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  maxLength={30}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-secondary-700 text-sm font-medium mb-1">
                  群组介绍
                </label>
                <textarea
                  value={newGroupData.description}
                  onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                  className="w-full p-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  maxLength={200}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-secondary-700 text-sm font-medium mb-1">
                  群组类型
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={newGroupData.isPublic}
                      onChange={() => setNewGroupData({ ...newGroupData, isPublic: true })}
                      className="mr-1.5"
                    />
                    <span>公开群组（可被搜索）</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!newGroupData.isPublic}
                      onChange={() => setNewGroupData({ ...newGroupData, isPublic: false })}
                      className="mr-1.5"
                    />
                    <span>私密群组</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-secondary-700 text-sm font-medium mb-2">
                  选择要添加到群组的好友
                </label>
                <div className="max-h-40 overflow-y-auto border border-secondary-300 rounded-md p-2">
                  {friends.length === 0 ? (
                    <p className="text-center text-secondary-500 py-2">暂无好友</p>
                  ) : (
                    <div className="space-y-2">
                      {friends.map(friend => (
                        <div key={friend.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`friend-${friend.id}`}
                            checked={newGroupData.initialMembers.includes(friend.id)}
                            onChange={() => handleToggleFriend(friend.id)}
                            className="mr-2"
                          />
                          <label htmlFor={`friend-${friend.id}`} className="flex items-center cursor-pointer">
                            <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm">
                              {friend.nickname.substring(0, 2)}
                            </div>
                            <span className="ml-2">{friend.nickname}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newGroupData.name.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:bg-primary-300"
                >
                  创建
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      
      {/* 确认退出群组弹窗 */}
      {showConfirmModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-2">退出群组</h3>
            <p className="mb-4 text-secondary-600">
              确定要退出群组 <span className="font-medium">{selectedGroup.name}</span> 吗？退出后将不再接收该群组的消息。
            </p>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-100"
              >
                取消
              </button>
              <button
                onClick={handleLeaveGroup}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                确认退出
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Groups; 