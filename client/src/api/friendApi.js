import axios from 'axios';

// 获取请求头配置
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

// 获取好友列表（分组结构）
export const getFriends = async () => {
  try {
    const response = await axios.get('/api/friends', getAuthConfig());
    return response.data.data.friendGroups;
  } catch (error) {
    console.error('获取好友列表失败', error);
    throw error;
  }
};

// 获取好友列表（扁平结构）
export const getFriendsList = async () => {
  try {
    const response = await axios.get('/api/friends/list', getAuthConfig());
    return response.data.data.friends;
  } catch (error) {
    console.error('获取好友列表失败', error);
    throw error;
  }
};

// 发送好友请求
export const sendFriendRequest = async (receiverId, message) => {
  try {
    const response = await axios.post(
      '/api/friends/request',
      { receiverId, message },
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('发送好友请求失败', error);
    throw error;
  }
};

// 获取待处理的好友请求
export const getPendingRequests = async () => {
  try {
    const response = await axios.get('/api/friends/requests/pending', getAuthConfig());
    return response.data.data;
  } catch (error) {
    console.error('获取待处理好友请求失败', error);
    throw error;
  }
};

// 接受好友请求
export const acceptFriendRequest = async (requestId) => {
  try {
    const response = await axios.put(`/api/friends/request/${requestId}/accept`, {}, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('接受好友请求失败', error);
    throw error;
  }
};

// 拒绝好友请求
export const rejectFriendRequest = async (requestId) => {
  try {
    const response = await axios.put(`/api/friends/request/${requestId}/reject`, {}, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('拒绝好友请求失败', error);
    throw error;
  }
};

// 搜索用户
export const searchUsers = async (keyword) => {
  try {
    const response = await axios.get(`/api/friends/search?keyword=${keyword}`, getAuthConfig());
    return response.data.data.users;
  } catch (error) {
    console.error('搜索用户失败', error);
    throw error;
  }
};

// 获取好友分组
export const getFriendGroups = async () => {
  try {
    const response = await axios.get('/api/friends/groups', getAuthConfig());
    return response.data.data.groups;
  } catch (error) {
    console.error('获取好友分组失败', error);
    throw error;
  }
};

// 创建好友分组
export const createFriendGroup = async (name, description) => {
  try {
    const response = await axios.post(
      '/api/friends/groups',
      { name, description },
      getAuthConfig()
    );
    return response.data.data.group;
  } catch (error) {
    console.error('创建好友分组失败', error);
    throw error;
  }
};

// 更新好友信息（昵称、分组）
export const updateFriendInfo = async (friendId, data) => {
  try {
    const response = await axios.put(
      `/api/friends/${friendId}/update`,
      data,
      getAuthConfig()
    );
    return response.data.data.friend;
  } catch (error) {
    console.error('更新好友信息失败', error);
    throw error;
  }
};

// 删除好友
export const removeFriend = async (friendId) => {
  try {
    const response = await axios.delete(`/api/friends/remove/${friendId}`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('删除好友失败', error);
    throw error;
  }
};

// 检查用户是否为好友
export const checkFriendship = async (userId) => {
  try {
    const response = await axios.get(`/api/friends/check/${userId}`, getAuthConfig());
    return response.data.data;
  } catch (error) {
    console.error('检查好友关系失败', error);
    throw error;
  }
}; 