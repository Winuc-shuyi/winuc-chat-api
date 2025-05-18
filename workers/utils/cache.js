/**
 * 缓存工具模块
 * 提供KV缓存相关功能，优化性能
 */

// 默认缓存过期时间（秒）
const DEFAULT_TTL = 60 * 30; // 30分钟

/**
 * 从KV缓存获取数据
 * @param {Object} env - 环境变量
 * @param {string} key - 缓存键
 * @param {boolean} isJson - 是否为JSON数据
 * @return {Promise<*>} 缓存数据或null
 */
async function getCache(env, key, isJson = true) {
  try {
    if (!env.CHAT_CACHE) return null;
    
    const cachedData = await env.CHAT_CACHE.get(key, isJson ? 'json' : 'text');
    return cachedData;
  } catch (error) {
    console.error(`获取缓存错误(${key}):`, error);
    return null;
  }
}

/**
 * 将数据存入KV缓存
 * @param {Object} env - 环境变量
 * @param {string} key - 缓存键
 * @param {*} data - 要缓存的数据
 * @param {number} ttl - 过期时间（秒）
 * @return {Promise<boolean>} 是否成功
 */
async function setCache(env, key, data, ttl = DEFAULT_TTL) {
  try {
    if (!env.CHAT_CACHE) return false;
    
    const options = { expirationTtl: ttl };
    
    if (typeof data === 'string') {
      await env.CHAT_CACHE.put(key, data, options);
    } else {
      await env.CHAT_CACHE.put(key, JSON.stringify(data), options);
    }
    
    return true;
  } catch (error) {
    console.error(`设置缓存错误(${key}):`, error);
    return false;
  }
}

/**
 * 从KV缓存删除数据
 * @param {Object} env - 环境变量
 * @param {string} key - 缓存键
 * @return {Promise<boolean>} 是否成功
 */
async function deleteCache(env, key) {
  try {
    if (!env.CHAT_CACHE) return false;
    
    await env.CHAT_CACHE.delete(key);
    return true;
  } catch (error) {
    console.error(`删除缓存错误(${key}):`, error);
    return false;
  }
}

/**
 * 批量删除指定前缀的缓存
 * @param {Object} env - 环境变量
 * @param {string} prefix - 缓存键前缀
 * @return {Promise<{total: number, deleted: number}>} 结果
 */
async function deleteByPrefix(env, prefix) {
  try {
    if (!env.CHAT_CACHE) return { total: 0, deleted: 0 };
    
    let total = 0;
    let deleted = 0;
    
    const keys = await env.CHAT_CACHE.list({ prefix });
    total = keys.keys.length;
    
    const deletePromises = keys.keys.map(async key => {
      try {
        await env.CHAT_CACHE.delete(key.name);
        deleted++;
        return true;
      } catch {
        return false;
      }
    });
    
    await Promise.all(deletePromises);
    
    return { total, deleted };
  } catch (error) {
    console.error(`批量删除缓存错误(${prefix}):`, error);
    return { total: 0, deleted: 0 };
  }
}

/**
 * 带缓存的数据获取（缓存优先，缓存未命中则从源获取并缓存）
 * @param {Object} env - 环境变量
 * @param {string} key - 缓存键
 * @param {Function} fetchFunction - 数据获取函数
 * @param {number} ttl - 缓存过期时间（秒）
 * @return {Promise<*>} 数据
 */
async function getCachedData(env, key, fetchFunction, ttl = DEFAULT_TTL) {
  // 尝试从缓存获取
  const cachedData = await getCache(env, key);
  
  if (cachedData) {
    return cachedData;
  }
  
  // 缓存未命中，从源获取
  try {
    const freshData = await fetchFunction();
    
    // 异步缓存数据（不阻塞响应）
    setCache(env, key, freshData, ttl).catch(err => {
      console.error(`缓存数据失败(${key}):`, err);
    });
    
    return freshData;
  } catch (error) {
    console.error(`获取源数据失败(${key}):`, error);
    throw error;
  }
}

/**
 * 生成用户相关的缓存键
 * @param {string} userId - 用户ID
 * @param {string} type - 缓存类型
 * @param {string} [subId] - 子ID
 * @return {string} 缓存键
 */
function userCacheKey(userId, type, subId = '') {
  return `user:${userId}:${type}${subId ? `:${subId}` : ''}`;
}

/**
 * 生成群组相关的缓存键
 * @param {string} groupId - 群组ID
 * @param {string} type - 缓存类型
 * @return {string} 缓存键
 */
function groupCacheKey(groupId, type) {
  return `group:${groupId}:${type}`;
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteByPrefix,
  getCachedData,
  userCacheKey,
  groupCacheKey,
  DEFAULT_TTL
}; 