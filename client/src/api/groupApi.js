import axios from 'axios';

// 获取请求头配置
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

// 获取用户所在的群组列表
export const getUserGroups = async () => {
  try {
    const response = await axios.get('/api/groups', getAuthConfig());
    return response.data.data.groups;
  } catch (error) {
    console.error('获取群组列表失败', error);
    throw error;
  }
};

// 创建新群组
export const createGroup = async (data) => {
  try {
    const response = await axios.post('/api/groups', data, getAuthConfig());
    return response.data.data.group;
  } catch (error) {
    console.error('创建群组失败', error);
    throw error;
  }
};

// 获取群组详情
export const getGroupDetail = async (groupId) => {
  try {
    const response = await axios.get(`/api/groups/${groupId}`, getAuthConfig());
    return response.data.data;
  } catch (error) {
    console.error('获取群组详情失败', error);
    throw error;
  }
};

// 更新群组信息
export const updateGroup = async (groupId, data) => {
  try {
    const response = await axios.put(`/api/groups/${groupId}`, data, getAuthConfig());
    return response.data.data.group;
  } catch (error) {
    console.error('更新群组失败', error);
    throw error;
  }
};

// 删除群组
export const deleteGroup = async (groupId) => {
  try {
    const response = await axios.delete(`/api/groups/${groupId}`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('删除群组失败', error);
    throw error;
  }
};

// 添加成员到群组
export const addMemberToGroup = async (groupId, userId, nickname = '') => {
  try {
    const response = await axios.post(
      `/api/groups/${groupId}/members`,
      { userId, nickname },
      getAuthConfig()
    );
    return response.data.data.group;
  } catch (error) {
    console.error('添加成员失败', error);
    throw error;
  }
};

// 从群组移除成员
export const removeMemberFromGroup = async (groupId, userId) => {
  try {
    const response = await axios.delete(
      `/api/groups/${groupId}/members/${userId}`,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('移除成员失败', error);
    throw error;
  }
};

// 加入群组
export const joinGroup = async (groupId) => {
  try {
    const response = await axios.post(
      `/api/groups/${groupId}/join`,
      {},
      getAuthConfig()
    );
    return response.data.data.group;
  } catch (error) {
    console.error('加入群组失败', error);
    throw error;
  }
};

// 退出群组
export const leaveGroup = async (groupId) => {
  try {
    const response = await axios.post(
      `/api/groups/${groupId}/leave`,
      {},
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('退出群组失败', error);
    throw error;
  }
};

// 设置群组管理员
export const setGroupAdmin = async (groupId, userId) => {
  try {
    const response = await axios.post(
      `/api/groups/${groupId}/admins/${userId}`,
      {},
      getAuthConfig()
    );
    return response.data.data.group;
  } catch (error) {
    console.error('设置管理员失败', error);
    throw error;
  }
};

// 移除群组管理员
export const removeGroupAdmin = async (groupId, userId) => {
  try {
    const response = await axios.delete(
      `/api/groups/${groupId}/admins/${userId}`,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('移除管理员失败', error);
    throw error;
  }
};

// 搜索群组
export const searchGroups = async (keyword) => {
  try {
    const response = await axios.get(
      `/api/groups/search?keyword=${keyword}`,
      getAuthConfig()
    );
    return response.data.data.groups;
  } catch (error) {
    console.error('搜索群组失败', error);
    throw error;
  }
};

// 获取群组消息历史
export const getGroupMessageHistory = async (groupId, limit = 50, skip = 0) => {
  try {
    const response = await axios.get(
      `/api/messages/group/history/${groupId}?limit=${limit}&skip=${skip}`,
      getAuthConfig()
    );
    return response.data.data.messages;
  } catch (error) {
    console.error('获取群组消息历史失败', error);
    throw error;
  }
};

// 发送群组消息
export const sendGroupMessage = async (groupId, content, type = 'text', metadata = {}) => {
  try {
    const response = await axios.post(
      '/api/messages/group/send',
      { groupId, content, type, metadata },
      getAuthConfig()
    );
    return response.data.data.message;
  } catch (error) {
    console.error('发送群组消息失败', error);
    throw error;
  }
}; 