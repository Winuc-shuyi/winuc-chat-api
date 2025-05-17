import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup } from '../contexts/GroupContext';
import { useAuth } from '../contexts/AuthContext';
import { useFriend } from '../contexts/FriendContext';
import { motion } from 'framer-motion';

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { friends } = useFriend();
  const { 
    getGroupDetail, 
    updateGroup, 
    deleteGroup,
    addMemberToGroup,
    removeMemberFromGroup,
    setGroupAdmin,
    removeGroupAdmin
  } = useGroup();
  
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // 编辑表单数据
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    isPublic: true
  });
  
  // 待添加成员
  const [memberToAdd, setMemberToAdd] = useState('');
  
  // 待操作成员
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedAction, setSelectedAction] = useState('');
  
  // 加载群组详情
  useEffect(() => {
    const fetchGroupDetail = async () => {
      setLoading(true);
      setError('');
      
      try {
        const data = await getGroupDetail(groupId);
        setGroupData(data);
        setEditData({
          name: data.group.name,
          description: data.group.description || '',
          isPublic: data.group.isPublic
        });
      } catch (err) {
        setError('加载群组详情失败');
        console.error('加载群组详情失败:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (groupId) {
      fetchGroupDetail();
    }
  }, [groupId, getGroupDetail]);
  
  // 处理更新群组信息
  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    
    try {
      await updateGroup(groupId, editData);
      // 重新加载群组信息
      const data = await getGroupDetail(groupId);
      setGroupData(data);
      setIsEditing(false);
    } catch (err) {
      setError('更新群组信息失败');
      console.error('更新群组信息失败:', err);
    }
  };
  
  // 处理删除群组
  const handleDeleteGroup = async () => {
    try {
      await deleteGroup(groupId);
      navigate('/groups');
    } catch (err) {
      setError('删除群组失败');
      console.error('删除群组失败:', err);
    }
  };
  
  // 处理添加成员
  const handleAddMember = async () => {
    if (!memberToAdd) return;
    
    try {
      await addMemberToGroup(groupId, memberToAdd);
      setShowAddMemberModal(false);
      setMemberToAdd('');
      
      // 重新加载群组信息
      const data = await getGroupDetail(groupId);
      setGroupData(data);
    } catch (err) {
      setError('添加成员失败');
      console.error('添加成员失败:', err);
    }
  };
  
  // 确认操作成员
  const confirmMemberAction = (member, action) => {
    setSelectedMember(member);
    setSelectedAction(action);
    setShowConfirmModal(true);
  };
  
  // 执行成员操作
  const handleMemberAction = async () => {
    try {
      if (selectedAction === 'remove') {
        await removeMemberFromGroup(groupId, selectedMember.user._id);
      } else if (selectedAction === 'promote') {
        await setGroupAdmin(groupId, selectedMember.user._id);
      } else if (selectedAction === 'demote') {
        await removeGroupAdmin(groupId, selectedMember.user._id);
      }
      
      setShowConfirmModal(false);
      
      // 重新加载群组信息
      const data = await getGroupDetail(groupId);
      setGroupData(data);
    } catch (err) {
      setError(`操作失败: ${err.message}`);
      console.error('操作失败:', err);
    }
  };
  
  // 获取成员显示名称
  const getMemberDisplayName = (member) => {
    const user = member.user;
    return member.nickname || user.username || '未知用户';
  };
  
  // 返回聊天
  const handleBackToChat = () => {
    navigate(`/group/${groupId}`);
  };
  
  // 获取角色显示文本
  const getRoleText = (role) => {
    switch (role) {
      case 'creator':
        return '创建者';
      case 'admin':
        return '管理员';
      default:
        return '成员';
    }
  };
  
  // 检查当前用户是否是创建者
  const isCreator = groupData?.isCreator || false;
  
  // 检查当前用户是否是管理员
  const isAdmin = groupData?.isAdmin || false;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-lg text-primary-600">加载中...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => navigate('/groups')}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
        >
          返回群组列表
        </button>
      </div>
    );
  }
  
  if (!groupData || !groupData.group) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">群组不存在或已被删除</div>
        <button
          onClick={() => navigate('/groups')}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
        >
          返回群组列表
        </button>
      </div>
    );
  }
  
  const { group } = groupData;
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center">
        <button
          onClick={handleBackToChat}
          className="mr-2 p-2 rounded-full hover:bg-secondary-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-secondary-800">群组详情</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* 标签页头部 */}
        <div className="flex border-b border-secondary-200">
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'info'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
            onClick={() => setActiveTab('info')}
          >
            群组信息
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'members'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
            onClick={() => setActiveTab('members')}
          >
            成员管理
            <span className="ml-1 text-xs">({group.members ? group.members.length : 0})</span>
          </button>
        </div>
        
        <div className="p-4">
          {/* 群组信息标签页 */}
          {activeTab === 'info' && (
            <div>
              {isEditing ? (
                <form onSubmit={handleUpdateGroup}>
                  <div className="mb-4">
                    <label className="block text-secondary-700 text-sm font-medium mb-1">
                      群组名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
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
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="w-full p-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      maxLength={200}
                    />
                  </div>
                  
                  {isCreator && (
                    <div className="mb-4">
                      <label className="block text-secondary-700 text-sm font-medium mb-1">
                        群组类型
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={editData.isPublic}
                            onChange={() => setEditData({ ...editData, isPublic: true })}
                            className="mr-1.5"
                          />
                          <span>公开群组（可被搜索）</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={!editData.isPublic}
                            onChange={() => setEditData({ ...editData, isPublic: false })}
                            className="mr-1.5"
                          />
                          <span>私密群组</span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditData({
                          name: group.name,
                          description: group.description || '',
                          isPublic: group.isPublic
                        });
                      }}
                      className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-100"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                    >
                      保存
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="mb-6 flex items-center">
                    <div className="h-16 w-16 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-xl">
                      {group.name.substring(0, 2)}
                    </div>
                    <div className="ml-4">
                      <h2 className="text-xl font-semibold text-secondary-800">{group.name}</h2>
                      <div className="flex items-center text-sm text-secondary-500 mt-1">
                        <span className="mr-3">
                          <span className="font-medium">{group.members ? group.members.length : 0}</span> 位成员
                        </span>
                        <span className="mr-3">
                          {group.isPublic ? '公开群组' : '私密群组'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-md font-medium mb-2">群组介绍</h3>
                    <p className="text-secondary-600 border-l-4 border-secondary-200 pl-3 py-2">
                      {group.description || '暂无介绍'}
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-md font-medium mb-2">创建时间</h3>
                    <p className="text-secondary-600">
                      {new Date(group.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  {(isCreator || isAdmin) && (
                    <div className="flex space-x-2 mt-8">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                      >
                        编辑群组信息
                      </button>
                      {isCreator && (
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          解散群组
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* 成员管理标签页 */}
          {activeTab === 'members' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">成员列表</h2>
                {(isCreator || isAdmin) && (
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 text-sm"
                  >
                    添加成员
                  </button>
                )}
              </div>
              
              <div className="border border-secondary-200 rounded-md overflow-hidden">
                {group.members && group.members.length > 0 ? (
                  <div className="divide-y divide-secondary-200">
                    {group.members.map((member) => (
                      <motion.div
                        key={member.user._id}
                        className="p-3 flex items-center justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                            {getMemberDisplayName(member).substring(0, 2)}
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-secondary-800">
                              {getMemberDisplayName(member)}
                              {member.user._id === currentUser._id && <span className="ml-2 text-xs text-primary-500">(我)</span>}
                            </p>
                            <p className="text-xs text-secondary-500 flex items-center">
                              <span className={`px-1.5 py-0.5 rounded text-xs mr-2 ${
                                member.role === 'creator' 
                                  ? 'bg-red-100 text-red-600' 
                                  : member.role === 'admin' 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : 'bg-secondary-100 text-secondary-600'
                              }`}>
                                {getRoleText(member.role)}
                              </span>
                              {member.joinedAt && (
                                <span>加入于 {new Date(member.joinedAt).toLocaleDateString()}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        {/* 成员操作按钮 */}
                        {(isCreator || (isAdmin && member.role !== 'admin' && member.role !== 'creator')) && 
                         member.user._id !== currentUser._id && (
                          <div className="flex">
                            {isCreator && member.role !== 'creator' && member.role !== 'admin' && (
                              <button
                                onClick={() => confirmMemberAction(member, 'promote')}
                                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                              >
                                设为管理员
                              </button>
                            )}
                            
                            {isCreator && member.role === 'admin' && (
                              <button
                                onClick={() => confirmMemberAction(member, 'demote')}
                                className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 mr-2"
                              >
                                取消管理员
                              </button>
                            )}
                            
                            {(isCreator || (isAdmin && member.role !== 'admin' && member.role !== 'creator')) && (
                              <button
                                onClick={() => confirmMemberAction(member, 'remove')}
                                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                移出群组
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-secondary-500">
                    <p>暂无成员</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 添加成员弹窗 */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4">添加群组成员</h3>
            
            <div className="mb-4">
              <label className="block text-secondary-700 text-sm font-medium mb-1">
                选择好友添加到群组
              </label>
              <select
                value={memberToAdd}
                onChange={(e) => setMemberToAdd(e.target.value)}
                className="w-full p-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- 选择好友 --</option>
                {friends.filter(friend => 
                  !group.members.some(member => 
                    member.user._id === friend.id || member.user === friend.id
                  )
                ).map(friend => (
                  <option key={friend.id} value={friend.id}>
                    {friend.nickname || friend.username}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMemberToAdd('');
                }}
                className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-100"
              >
                取消
              </button>
              <button
                onClick={handleAddMember}
                disabled={!memberToAdd}
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:bg-primary-300"
              >
                添加
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* 成员操作确认弹窗 */}
      {showConfirmModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-2">
              {selectedAction === 'remove' ? '移出成员' : 
               selectedAction === 'promote' ? '设置管理员' : '取消管理员'}
            </h3>
            <p className="mb-4 text-secondary-600">
              {selectedAction === 'remove' && `确定要将成员 ${getMemberDisplayName(selectedMember)} 移出群组吗？`}
              {selectedAction === 'promote' && `确定要将成员 ${getMemberDisplayName(selectedMember)} 设置为管理员吗？`}
              {selectedAction === 'demote' && `确定要取消 ${getMemberDisplayName(selectedMember)} 的管理员身份吗？`}
            </p>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-100"
              >
                取消
              </button>
              <button
                onClick={handleMemberAction}
                className={`px-4 py-2 text-white rounded-md ${
                  selectedAction === 'remove' ? 'bg-red-500 hover:bg-red-600' : 
                  selectedAction === 'promote' ? 'bg-blue-500 hover:bg-blue-600' : 
                  'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                确认
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* 删除群组确认弹窗 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-2 text-red-500">解散群组</h3>
            <p className="mb-2 text-secondary-600">
              确定要解散群组 <span className="font-medium">{group.name}</span> 吗？
            </p>
            <p className="mb-4 text-red-500 text-sm">
              注意：此操作不可逆，解散后所有群组消息将被永久删除！
            </p>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-100"
              >
                取消
              </button>
              <button
                onClick={handleDeleteGroup}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                确认解散
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail; 