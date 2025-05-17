import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFriend } from '../contexts/FriendContext';
import { motion } from 'framer-motion';

const Friends = () => {
  const navigate = useNavigate();
  const { 
    friends, 
    friendGroups, 
    pendingRequests, 
    loading, 
    error,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    refreshFriends,
    searchUsers,
    removeFriend
  } = useFriend();
  
  const [activeTab, setActiveTab] = useState('friends');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  
  // 处理搜索
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    
    setSearchLoading(true);
    try {
      const results = await searchUsers(searchKeyword);
      setSearchResults(results);
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      setSearchLoading(false);
    }
  };
  
  // 处理发送好友请求
  const handleSendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId, requestMessage);
      setRequestMessage('');
      // 刷新搜索结果
      await handleSearch();
    } catch (err) {
      console.error('发送请求失败:', err);
    }
  };
  
  // 处理接受好友请求
  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptRequest(requestId);
      refreshFriends();
    } catch (err) {
      console.error('接受请求失败:', err);
    }
  };
  
  // 处理拒绝好友请求
  const handleRejectRequest = async (requestId) => {
    try {
      await rejectRequest(requestId);
      refreshFriends();
    } catch (err) {
      console.error('拒绝请求失败:', err);
    }
  };
  
  // 处理删除好友
  const handleRemoveFriend = async () => {
    if (!selectedFriend) return;
    
    try {
      await removeFriend(selectedFriend.id);
      setShowConfirmModal(false);
      setSelectedFriend(null);
    } catch (err) {
      console.error('删除好友失败:', err);
    }
  };
  
  // 确认删除好友
  const confirmRemoveFriend = (friend) => {
    setSelectedFriend(friend);
    setShowConfirmModal(true);
  };
  
  // 开始聊天
  const startChat = (friendId) => {
    navigate(`/chat/${friendId}`);
  };
  
  // 在组件加载时清空搜索
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
              activeTab === 'friends'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
            onClick={() => setActiveTab('friends')}
          >
            我的好友
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'requests'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
            onClick={() => setActiveTab('requests')}
          >
            好友请求
            {pendingRequests.received.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                {pendingRequests.received.length}
              </span>
            )}
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'search'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
            onClick={() => setActiveTab('search')}
          >
            添加好友
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
              {/* 我的好友标签页 */}
              {activeTab === 'friends' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">我的好友</h2>
                  
                  {friendGroups.length === 0 ? (
                    <p className="text-center py-6 text-secondary-500">暂无好友</p>
                  ) : (
                    <div className="space-y-6">
                      {friendGroups.map((group, groupIndex) => (
                        <div key={group.groupId} className="border border-secondary-200 rounded-md overflow-hidden">
                          <div className="bg-secondary-100 p-3 flex justify-between items-center">
                            <h3 className="font-medium">{group.groupName} ({group.friends.length})</h3>
                          </div>
                          
                          {group.friends.length === 0 ? (
                            <p className="p-4 text-center text-secondary-500">暂无好友在此分组</p>
                          ) : (
                            <div className="divide-y divide-secondary-200">
                              {group.friends.map((friend) => (
                                <motion.div
                                  key={friend.id}
                                  className="p-3 flex items-center justify-between"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="flex items-center">
                                    <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                                      {friend.nickname.substring(0, 2)}
                                    </div>
                                    <div className="ml-3">
                                      <p className="font-medium text-secondary-800">{friend.nickname}</p>
                                      <p className="text-xs text-secondary-500">
                                        {friend.username !== friend.nickname && `(${friend.username})`}
                                        {friend.status === 'online' && (
                                          <span className="ml-2 text-green-500">在线</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex">
                                    <button
                                      onClick={() => startChat(friend.id)}
                                      className="px-3 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 mr-2"
                                    >
                                      发消息
                                    </button>
                                    <button
                                      onClick={() => confirmRemoveFriend(friend)}
                                      className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                    >
                                      删除
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* 好友请求标签页 */}
              {activeTab === 'requests' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">好友请求</h2>
                  
                  {/* 收到的请求 */}
                  <div className="mb-6">
                    <h3 className="text-md font-medium mb-2 pb-2 border-b border-secondary-200">收到的请求</h3>
                    
                    {pendingRequests.received.length === 0 ? (
                      <p className="text-center py-4 text-secondary-500">暂无收到的好友请求</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingRequests.received.map((request) => (
                          <motion.div
                            key={request._id}
                            className="p-3 border border-secondary-200 rounded-md"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                                  {request.sender.username.substring(0, 2)}
                                </div>
                                <div className="ml-3">
                                  <p className="font-medium text-secondary-800">{request.sender.username}</p>
                                  <p className="text-xs text-secondary-500">{request.message}</p>
                                </div>
                              </div>
                              
                              <div className="flex">
                                <button
                                  onClick={() => handleAcceptRequest(request._id)}
                                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 mr-2"
                                >
                                  接受
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(request._id)}
                                  className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  拒绝
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* 发送的请求 */}
                  <div>
                    <h3 className="text-md font-medium mb-2 pb-2 border-b border-secondary-200">发送的请求</h3>
                    
                    {pendingRequests.sent.length === 0 ? (
                      <p className="text-center py-4 text-secondary-500">暂无发送的好友请求</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingRequests.sent.map((request) => (
                          <motion.div
                            key={request._id}
                            className="p-3 border border-secondary-200 rounded-md"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-secondary-500 flex items-center justify-center text-white font-semibold">
                                  {request.receiver.username.substring(0, 2)}
                                </div>
                                <div className="ml-3">
                                  <p className="font-medium text-secondary-800">{request.receiver.username}</p>
                                  <p className="text-xs text-secondary-500">请求已发送，等待对方确认</p>
                                </div>
                              </div>
                              
                              <div className="text-xs text-secondary-500">
                                等待确认
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 添加好友标签页 */}
              {activeTab === 'search' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">查找好友</h2>
                  
                  <div className="mb-6">
                    <div className="flex">
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="输入用户名或邮箱搜索"
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
                    
                    <p className="text-xs text-secondary-500 mt-1">可以通过用户名或邮箱搜索其他用户</p>
                  </div>
                  
                  {/* 搜索结果 */}
                  {searchResults.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium mb-2 pb-2 border-b border-secondary-200">搜索结果</h3>
                      
                      <div className="space-y-3">
                        {searchResults.map((user) => (
                          <motion.div
                            key={user.id}
                            className="p-3 border border-secondary-200 rounded-md"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-secondary-500 flex items-center justify-center text-white font-semibold">
                                  {user.username.substring(0, 2)}
                                </div>
                                <div className="ml-3">
                                  <p className="font-medium text-secondary-800">{user.username}</p>
                                  <p className="text-xs text-secondary-500">{user.email}</p>
                                </div>
                              </div>
                              
                              <div>
                                {user.relation === 'friend' ? (
                                  <button
                                    onClick={() => startChat(user.id)}
                                    className="px-3 py-1 text-xs bg-secondary-500 text-white rounded hover:bg-secondary-600"
                                  >
                                    已是好友
                                  </button>
                                ) : user.relation === 'pending' ? (
                                  <span className="px-3 py-1 text-xs bg-secondary-200 text-secondary-700 rounded">
                                    {user.requestDirection === 'sent' ? '请求已发送' : '等待处理'}
                                  </span>
                                ) : (
                                  <div className="flex flex-col">
                                    <input
                                      type="text"
                                      placeholder="验证消息..."
                                      className="p-1 mb-1 text-xs border border-secondary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                      value={requestMessage}
                                      onChange={(e) => setRequestMessage(e.target.value)}
                                    />
                                    <button
                                      onClick={() => handleSendRequest(user.id)}
                                      className="px-3 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600"
                                    >
                                      添加好友
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* 确认删除好友弹窗 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-2">删除好友</h3>
            <p className="mb-4 text-secondary-600">
              确定要删除好友 <span className="font-medium">{selectedFriend?.nickname || selectedFriend?.username}</span> 吗？删除后需要重新添加才能聊天。
            </p>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-100"
              >
                取消
              </button>
              <button
                onClick={handleRemoveFriend}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                确认删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Friends; 