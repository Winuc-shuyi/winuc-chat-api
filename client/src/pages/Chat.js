import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFriend } from '../contexts/FriendContext';
import { useGroup } from '../contexts/GroupContext';
import { motion } from 'framer-motion';
import * as messageApi from '../api/messageApi';

// 消息气泡组件
const MessageBubble = ({ message, isOwnMessage }) => {
  // 格式化时间
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && (
        <div className="flex-shrink-0 mr-2">
          <img 
            src={message.sender.avatar || '/default-avatar.png'} 
            alt="Avatar" 
            className="w-8 h-8 rounded-full"
          />
        </div>
      )}
      <div className={`max-w-xs rounded-lg p-3 ${
        isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
      }`}>
        <p className="break-words">{message.content}</p>
        <p className={`text-xs mt-1 text-right ${
          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
};

const Chat = () => {
  const { currentUser } = useAuth();
  const { friends, loading: friendsLoading } = useFriend();
  const { groups, loading: groupsLoading } = useGroup();
  const { userId, groupId } = useParams();
  const navigate = useNavigate();
  
  // 检查currentUser是否有效
  useEffect(() => {
    if (!currentUser || !currentUser._id) {
      console.warn('当前用户信息不完整，可能需要重新登录');
    }
  }, [currentUser]);
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [contactType, setContactType] = useState('private'); // 'private' 或 'group'
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messageEndRef = useRef(null);
  const messageListRef = useRef(null);
  
  // 从好友和群组数据生成联系人列表
  useEffect(() => {
    if (!friendsLoading && !groupsLoading && friends && groups) {
      // 处理好友为联系人格式
      const contactsFromFriends = friends.map(friend => ({
        id: friend.id,
        type: 'private',
        name: friend.nickname || friend.username,
        lastMessage: '暂无消息',
        timestamp: '刚刚',
        unread: 0,
        avatar: friend.avatar,
        status: friend.status
      }));
      
      // 处理群组为联系人格式
      const contactsFromGroups = groups.map(group => ({
        id: group._id,
        type: 'group',
        name: group.name,
        lastMessage: '暂无群组消息',
        timestamp: '刚刚',
        unread: 0,
        avatar: group.avatar || null,
        memberCount: group.members ? group.members.length : 0
      }));
      
      // 合并联系人列表
      setContacts([...contactsFromFriends, ...contactsFromGroups]);
      setLoading(false);
    } else if (!friendsLoading && !groupsLoading) {
      setContacts([]);
      setLoading(false);
    }
  }, [friends, groups, friendsLoading, groupsLoading]);
  
  // 当URL参数变化时，更新当前聊天对象
  useEffect(() => {
    if (contacts.length > 0) {
      if (userId) {
        const contact = contacts.find(c => c.id === userId && c.type === 'private');
        if (contact) {
          setActiveContact(contact);
          setContactType('private');
          loadPrivateMessages(userId);
        }
      } else if (groupId) {
        const contact = contacts.find(c => c.id === groupId && c.type === 'group');
        if (contact) {
          setActiveContact(contact);
          setContactType('group');
          loadGroupMessages(groupId);
        }
      } else if (!activeContact) {
        // 默认选择第一个联系人
        setActiveContact(contacts[0]);
        setContactType(contacts[0].type);
        
        if (contacts[0].type === 'private') {
          loadPrivateMessages(contacts[0].id);
        } else {
          loadGroupMessages(contacts[0].id);
        }
      }
    }
  }, [userId, groupId, contacts, activeContact]);
  
  // 加载私聊消息历史
  const loadPrivateMessages = async (userId) => {
    setLoadingMessages(true);
    try {
      const messagesData = await messageApi.getMessageHistory(userId);
      // 确保消息数据有效
      if (Array.isArray(messagesData)) {
        setMessages(messagesData);
      } else {
        console.error('获取的消息数据格式不正确:', messagesData);
        setMessages([]);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // 加载更多私聊历史消息
  const loadMorePrivateMessages = async () => {
    if (messages.length === 0 || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0]; // 获取当前消息列表中最早的消息
      const olderId = oldestMessage._id;
      const olderMessages = await messageApi.loadMoreMessages(activeContact.id, olderId);
      
      if (Array.isArray(olderMessages) && olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
        setHasMoreMessages(olderMessages.length === 20); // 如果返回的消息数量等于限制数，可能还有更多消息
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('加载更多消息失败:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // 加载群组消息历史
  const loadGroupMessages = async (groupId) => {
    setLoadingMessages(true);
    try {
      const messagesData = await messageApi.getGroupMessageHistory(groupId);
      if (Array.isArray(messagesData)) {
        setMessages(messagesData);
      } else {
        console.error('获取的群组消息数据格式不正确:', messagesData);
        setMessages([]);
      }
    } catch (error) {
      console.error('加载群组消息失败:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // 加载更多群组历史消息
  const loadMoreGroupMessages = async () => {
    if (messages.length === 0 || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0]; // 获取当前消息列表中最早的消息
      const olderId = oldestMessage._id;
      const olderMessages = await messageApi.loadMoreGroupMessages(activeContact.id, olderId);
      
      if (Array.isArray(olderMessages) && olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
        setHasMoreMessages(olderMessages.length === 20); // 如果返回的消息数量等于限制数，可能还有更多消息
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('加载更多群组消息失败:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // 处理消息滚动到顶部，加载更多历史消息
  const handleScrollToTop = () => {
    if (hasMoreMessages && !isLoadingMore) {
      if (contactType === 'private') {
        loadMorePrivateMessages();
      } else {
        loadMoreGroupMessages();
      }
    }
  };
  
  // 滚动到最新消息
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 选择联系人
  const handleSelectContact = (contact) => {
    setActiveContact(contact);
    setContactType(contact.type);
    
    // 更新URL，不触发页面刷新
    if (contact.type === 'private') {
      navigate(`/chat/${contact.id}`, { replace: true });
      loadPrivateMessages(contact.id);
    } else {
      navigate(`/group/${contact.id}`, { replace: true });
      loadGroupMessages(contact.id);
    }
  };
  
  // 发送消息
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    try {
      if (contactType === 'private') {
        // 发送私聊消息
        const sentMessage = await messageApi.sendMessage(activeContact.id, message);
        
        // 验证返回的消息对象有效性
        if (sentMessage && sentMessage._id) {
          // 确保消息有正确的发送者信息
          const messageToAdd = {
            ...sentMessage,
            sender: sentMessage.sender || {
              _id: currentUser._id,
              username: currentUser.username,
              avatar: currentUser.avatar
            }
          };
          setMessages(prev => [...prev, messageToAdd]);
        } else {
          console.error('发送消息返回的数据无效:', sentMessage);
        }
      } else {
        // 发送群组消息
        const sentMessage = await messageApi.sendGroupMessage(activeContact.id, message);
        
        // 验证返回的消息对象有效性
        if (sentMessage && sentMessage._id) {
          // 确保消息有正确的发送者信息
          const messageToAdd = {
            ...sentMessage,
            sender: sentMessage.sender || {
              _id: currentUser._id,
              username: currentUser.username,
              avatar: currentUser.avatar
            }
          };
          setMessages(prev => [...prev, messageToAdd]);
        } else {
          console.error('发送群组消息返回的数据无效:', sentMessage);
        }
      }
      
      setMessage('');
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };
  
  // 进入群组详情
  const handleViewGroupDetails = () => {
    if (contactType === 'group' && activeContact) {
      navigate(`/group-detail/${activeContact.id}`);
    }
  };
  
  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // 格式化好友在线状态
  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return '在线';
      case 'busy':
        return '忙碌';
      case 'away':
        return '离开';
      default:
        return '离线';
    }
  };
  
  // 获取状态颜色
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-red-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-lg text-primary-600">加载中...</div>
      </div>
    );
  }
  
  return (
    <div className="chat-container flex flex-col h-full">
      {/* 联系人列表 */}
      <div className="w-1/4 border-r border-secondary-200 overflow-y-auto">
        <div className="p-4 border-b border-secondary-200">
          <h2 className="text-lg font-semibold text-secondary-800">聊天列表</h2>
        </div>
        
        {contacts.length === 0 ? (
          <div className="p-4 text-center text-secondary-500">
            <p>暂无联系人</p>
            <p className="text-sm mt-2">去"好友"或"群组"页面添加联系人开始聊天</p>
          </div>
        ) : (
          <div className="divide-y divide-secondary-200">
            {contacts.map(contact => (
              <div 
                key={`${contact.type}-${contact.id}`}
                className={`p-4 cursor-pointer hover:bg-secondary-100 ${
                  activeContact?.id === contact.id && activeContact?.type === contact.type
                    ? 'bg-secondary-100' 
                    : ''
                }`}
                onClick={() => handleSelectContact(contact)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                        {contact.name.substring(0, 2)}
                      </div>
                      {contact.type === 'private' && (
                        <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${getStatusColor(contact.status)} border-2 border-white`}></div>
                      )}
                      {contact.type === 'group' && (
                        <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-secondary-700 border-2 border-white flex items-center justify-center">
                          <span className="text-white text-xs">{contact.memberCount || 0}</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <p className="font-medium text-secondary-800">{contact.name}</p>
                        {contact.type === 'group' && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">群组</span>
                        )}
                      </div>
                      <p className="text-sm text-secondary-500 truncate w-32">{contact.lastMessage}</p>
                    </div>
                  </div>
                  <div className="text-xs text-secondary-500 flex flex-col items-end">
                    <span>{contact.timestamp}</span>
                    {contact.unread > 0 && (
                      <span className="mt-1 px-2 py-1 bg-primary-500 text-white rounded-full text-xs">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 聊天区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 聊天头部信息 */}
        <div className="chat-header p-3 border-b flex items-center">
          {activeContact && (
            <>
              <div className="avatar-container relative">
                <img 
                  src={contactType === 'private' 
                    ? activeContact.avatar || '/default-avatar.png'
                    : activeContact.avatar || '/default-group.png'
                  } 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full"
                />
                {contactType === 'private' && (
                  <span className={`status-indicator absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                    activeContact.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></span>
                )}
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-lg">
                  {contactType === 'private' ? activeContact.username : activeContact.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {contactType === 'private' 
                    ? (activeContact.status === 'online' ? '在线' : '离线') 
                    : `${activeContact.memberCount || 0} 位成员`
                  }
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* 消息列表 */}
        <div 
          className="message-list flex-1 overflow-y-auto p-4" 
          ref={messageListRef}
          onScroll={(e) => {
            // 当滚动到顶部时加载更多消息
            if (e.target.scrollTop === 0) {
              handleScrollToTop();
            }
          }}
        >
          {isLoadingMore && (
            <div className="text-center py-2">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-500">加载更多消息...</span>
            </div>
          )}
          
          {loadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            messages.length === 0 ? (
              <div className="flex justify-center items-center h-full text-gray-500">
                暂无消息记录
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble 
                  key={message._id} 
                  message={message} 
                  isOwnMessage={message.sender._id === currentUser._id} 
                />
              ))
            )
          )}
        </div>
        
        {/* 输入框 */}
        <div className="p-4 border-t border-secondary-200">
          <form onSubmit={handleSendMessage} className="flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={contactType === 'private' ? '输入消息...' : '发送群组消息...'}
              className="flex-1 p-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              className="ml-2 bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
            >
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat; 