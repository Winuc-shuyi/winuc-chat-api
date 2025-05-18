# WinUC Chat API C++客户端接入指南

本指南将帮助C++开发者接入WinUC Chat API，实现聊天功能。

## 目录

- [概述](#概述)
- [环境准备](#环境准备)
- [认证流程](#认证流程)
- [消息收发](#消息收发)
- [长轮询实现](#长轮询实现)
- [好友管理](#好友管理)
- [群组功能](#群组功能)
- [通知系统](#通知系统)
- [示例代码](#示例代码)
- [常见问题](#常见问题)

## 概述

WinUC Chat API是一个基于RESTful的聊天服务端API，C++客户端可以通过HTTP请求与服务端进行交互。本API使用长轮询机制实现实时通信，无需WebSocket。主要功能包括：

- 用户认证（注册、登录）
- 消息发送和接收（私聊、群聊）
- 好友管理（添加、删除、查询）
- 群组管理（创建、加入、退出）
- 通知系统（消息通知、好友请求等）
- 长轮询获取实时消息

API基础URL: `https://[your-domain]/api`

## 环境准备

### 依赖库

建议使用以下C++库来简化API调用：

- [cpr](https://github.com/libcpr/cpr) - 用于HTTP请求
- [nlohmann/json](https://github.com/nlohmann/json) - 用于JSON处理
- [openssl](https://www.openssl.org/) - 用于SSL/TLS支持
- [spdlog](https://github.com/gabime/spdlog) - 可选，用于日志记录

### 安装依赖

#### 使用vcpkg

```bash
vcpkg install cpr nlohmann-json openssl spdlog
```

#### 使用CMake

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.15)
project(winuc_chat_client)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(cpr REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(spdlog REQUIRED) # 可选

add_executable(chat_client main.cpp)

target_link_libraries(chat_client PRIVATE 
    cpr::cpr 
    nlohmann_json::nlohmann_json 
    OpenSSL::SSL 
    OpenSSL::Crypto
    spdlog::spdlog # 可选
)
```

## 认证流程

### 1. 注册用户

```cpp
#include <cpr/cpr.h>
#include <nlohmann/json.hpp>
#include <iostream>

using json = nlohmann::json;

bool registerUser(const std::string& apiUrl, const std::string& username, 
                 const std::string& email, const std::string& password) {
    // 构建请求体
    json requestBody = {
        {"username", username},
        {"email", email},
        {"password", password}
    };
    
    // 发送POST请求
    cpr::Response r = cpr::Post(
        cpr::Url{apiUrl + "/auth/register"},
        cpr::Header{{"Content-Type", "application/json"}},
        cpr::Body{requestBody.dump()}
    );
    
    // 处理响应
    if (r.status_code == 201) {
        json response = json::parse(r.text);
        std::cout << "注册成功！用户ID: " << response["data"]["user"]["_id"] << std::endl;
        std::cout << "认证令牌: " << response["data"]["token"] << std::endl;
        return true;
    } else {
        try {
            json error = json::parse(r.text);
            std::cerr << "注册失败: " << error["message"] << std::endl;
        } catch (...) {
            std::cerr << "注册失败: " << r.status_code << " - " << r.text << std::endl;
        }
        return false;
    }
}
```

### 2. 用户登录

```cpp
std::string login(const std::string& apiUrl, const std::string& email, const std::string& password) {
    // 构建请求体
    json requestBody = {
        {"email", email},
        {"password", password}
    };
    
    // 发送POST请求
    cpr::Response r = cpr::Post(
        cpr::Url{apiUrl + "/auth/login"},
        cpr::Header{{"Content-Type", "application/json"}},
        cpr::Body{requestBody.dump()}
    );
    
    // 处理响应
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        std::string token = response["data"]["token"];
        std::cout << "登录成功！" << std::endl;
        
        // 保存用户信息
        if (response["data"].contains("user")) {
            auto& user = response["data"]["user"];
            std::cout << "欢迎回来，" << user["username"].get<std::string>() << std::endl;
        }
        
        return token;
    } else {
        try {
            json error = json::parse(r.text);
            std::cerr << "登录失败: " << error["message"] << std::endl;
        } catch (...) {
            std::cerr << "登录失败: " << r.status_code << " - " << r.text << std::endl;
        }
        return "";
    }
}
```

### 3. 通用认证请求

封装一个通用的认证请求函数，使用Bearer Token进行认证:

```cpp
cpr::Response authenticatedRequest(const std::string& url, const std::string& method, 
                                  const std::string& token, const json& body = {}) {
    cpr::Header headers = {
        {"Content-Type", "application/json"},
        {"Authorization", "Bearer " + token}
    };
    
    if (method == "GET") {
        return cpr::Get(
            cpr::Url{url},
            headers
        );
    } else if (method == "POST") {
        return cpr::Post(
            cpr::Url{url},
            headers,
            cpr::Body{body.dump()}
        );
    } else if (method == "PUT") {
        return cpr::Put(
            cpr::Url{url},
            headers,
            cpr::Body{body.dump()}
        );
    } else if (method == "DELETE") {
        return cpr::Delete(
            cpr::Url{url},
            headers
        );
    } else if (method == "PATCH") {
        return cpr::Patch(
            cpr::Url{url},
            headers,
            cpr::Body{body.dump()}
        );
    }
    
    throw std::invalid_argument("不支持的HTTP方法");
}
```

### 4. 获取当前用户信息

```cpp
json getCurrentUser(const std::string& apiUrl, const std::string& token) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/auth/me", 
        "GET", 
        token
    );
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        return response["data"]["user"];
    } else {
        std::cerr << "获取用户信息失败: " << r.status_code << std::endl;
        return json();
    }
}
```

## 消息收发

### 发送私聊消息

```cpp
bool sendPrivateMessage(const std::string& apiUrl, const std::string& token, 
                      const std::string& content, const std::string& receiverId) {
    json messageBody = {
        {"content", content},
        {"receiver", receiverId}
    };
    
    cpr::Response r = authenticatedRequest(
        apiUrl + "/messages/send", 
        "POST", 
        token, 
        messageBody
    );
    
    if (r.status_code == 201) {
        json response = json::parse(r.text);
        std::cout << "消息发送成功，ID: " << response["data"]["message"]["_id"] << std::endl;
        return true;
    } else {
        try {
            json error = json::parse(r.text);
            std::cerr << "消息发送失败: " << error["message"] << std::endl;
        } catch (...) {
            std::cerr << "消息发送失败: " << r.status_code << " - " << r.text << std::endl;
        }
        return false;
    }
}
```

### 获取私聊历史消息

```cpp
std::vector<json> getPrivateMessages(const std::string& apiUrl, const std::string& token, 
                                    const std::string& userId, int page = 1, int limit = 20) {
    std::string url = apiUrl + "/messages/private/" + userId + 
                      "?page=" + std::to_string(page) + 
                      "&limit=" + std::to_string(limit);
                      
    cpr::Response r = authenticatedRequest(url, "GET", token);
    
    std::vector<json> messageList;
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        auto& messages = response["data"]["messages"];
        
        std::cout << "共有 " << messages.size() << " 条消息" << std::endl;
        
        for (const auto& msg : messages) {
            messageList.push_back(msg);
            // 输出消息
            std::string sender = msg["sender"]["username"];
            std::string content = msg["content"];
            std::string time = msg["createdAt"];
            
            std::cout << "[" << time << "] " << sender << ": " << content << std::endl;
        }
    } else {
        std::cerr << "获取消息失败: " << r.status_code << " - " << r.text << std::endl;
    }
    
    return messageList;
}

### 发送群组消息

```cpp
bool sendGroupMessage(const std::string& apiUrl, const std::string& token, 
                     const std::string& content, const std::string& groupId) {
    json messageBody = {
        {"content", content},
        {"groupId", groupId}
    };
    
    cpr::Response r = authenticatedRequest(
        apiUrl + "/messages/group/send", 
        "POST", 
        token, 
        messageBody
    );
    
    if (r.status_code == 201) {
        json response = json::parse(r.text);
        std::cout << "群组消息发送成功，ID: " << response["data"]["message"]["_id"] << std::endl;
        return true;
    } else {
        try {
            json error = json::parse(r.text);
            std::cerr << "群组消息发送失败: " << error["message"] << std::endl;
        } catch (...) {
            std::cerr << "群组消息发送失败: " << r.status_code << " - " << r.text << std::endl;
        }
        return false;
    }
}
```

### 获取群组历史消息

```cpp
std::vector<json> getGroupMessages(const std::string& apiUrl, const std::string& token, 
                                 const std::string& groupId, int page = 1, int limit = 20) {
    std::string url = apiUrl + "/messages/group/" + groupId + 
                     "?page=" + std::to_string(page) + 
                     "&limit=" + std::to_string(limit);
                     
    cpr::Response r = authenticatedRequest(url, "GET", token);
    
    std::vector<json> messageList;
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        auto& messages = response["data"]["messages"];
        
        std::cout << "共有 " << messages.size() << " 条群组消息" << std::endl;
        
        for (const auto& msg : messages) {
            messageList.push_back(msg);
            // 输出消息
            std::string sender = msg["sender"]["username"];
            std::string content = msg["content"];
            std::string time = msg["createdAt"];
            
            std::cout << "[" << time << "] " << sender << ": " << content << std::endl;
        }
    } else {
        std::cerr << "获取群组消息失败: " << r.status_code << " - " << r.text << std::endl;
    }
    
    return messageList;
}

## 好友管理

### 获取好友列表

```cpp
std::vector<json> getFriendsList(const std::string& apiUrl, const std::string& token) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/friends", 
        "GET", 
        token
    );
    
    std::vector<json> friendsList;
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        auto& friends = response["data"]["friends"];
        
        std::cout << "共有 " << friends.size() << " 个好友" << std::endl;
        
        for (const auto& friend_obj : friends) {
            friendsList.push_back(friend_obj);
            std::cout << "ID: " << friend_obj["_id"] << ", 用户名: " 
                     << friend_obj["username"] << ", 状态: " 
                     << friend_obj["status"] << std::endl;
        }
    } else {
        std::cerr << "获取好友列表失败: " << r.status_code << " - " << r.text << std::endl;
    }
    
    return friendsList;
}
```

### 发送好友请求

```cpp
bool sendFriendRequest(const std::string& apiUrl, const std::string& token, 
                      const std::string& userId) {
    json requestBody = {
        {"userId", userId}
    };
    
    cpr::Response r = authenticatedRequest(
        apiUrl + "/friends/request", 
        "POST", 
        token, 
        requestBody
    );
    
    if (r.status_code == 200 || r.status_code == 201) {
        std::cout << "好友请求发送成功" << std::endl;
        return true;
    } else {
        try {
            json error = json::parse(r.text);
            std::cerr << "好友请求发送失败: " << error["message"] << std::endl;
        } catch (...) {
            std::cerr << "好友请求发送失败: " << r.status_code << " - " << r.text << std::endl;
        }
        return false;
    }
}
```

### 获取待处理的好友请求

```cpp
std::vector<json> getPendingFriendRequests(const std::string& apiUrl, const std::string& token) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/friends/requests/pending", 
        "GET", 
        token
    );
    
    std::vector<json> requestsList;
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        auto& requests = response["data"]["requests"];
        
        std::cout << "共有 " << requests.size() << " 个待处理好友请求" << std::endl;
        
        for (const auto& req : requests) {
            requestsList.push_back(req);
            std::string sender = req["sender"]["username"];
            std::string requestId = req["_id"];
            std::string createdAt = req["createdAt"];
            
            std::cout << "请求ID: " << requestId << ", 发送者: " 
                     << sender << ", 时间: " << createdAt << std::endl;
        }
    } else {
        std::cerr << "获取好友请求失败: " << r.status_code << " - " << r.text << std::endl;
    }
    
    return requestsList;
}
```

### 接受好友请求

```cpp
bool acceptFriendRequest(const std::string& apiUrl, const std::string& token, 
                        const std::string& requestId) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/friends/requests/" + requestId + "/accept", 
        "POST", 
        token
    );
    
    if (r.status_code == 200) {
        std::cout << "已接受好友请求" << std::endl;
        return true;
    } else {
        std::cerr << "接受好友请求失败: " << r.status_code << " - " << r.text << std::endl;
        return false;
    }
}
```

### 拒绝好友请求

```cpp
bool rejectFriendRequest(const std::string& apiUrl, const std::string& token, 
                        const std::string& requestId) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/friends/requests/" + requestId + "/reject", 
        "POST", 
        token
    );
    
    if (r.status_code == 200) {
        std::cout << "已拒绝好友请求" << std::endl;
        return true;
    } else {
        std::cerr << "拒绝好友请求失败: " << r.status_code << " - " << r.text << std::endl;
        return false;
    }
}
```

## 群组功能

### 创建群组

```cpp
std::string createGroup(const std::string& apiUrl, const std::string& token, 
                      const std::string& name, const std::string& description = "") {
    json groupData = {
        {"name", name}
    };
    
    if (!description.empty()) {
        groupData["description"] = description;
    }
    
    cpr::Response r = authenticatedRequest(
        apiUrl + "/groups", 
        "POST", 
        token, 
        groupData
    );
    
    if (r.status_code == 201) {
        json response = json::parse(r.text);
        std::string groupId = response["data"]["group"]["_id"];
        std::cout << "群组创建成功，ID: " << groupId << std::endl;
        return groupId;
    } else {
        std::cerr << "创建群组失败: " << r.status_code << " - " << r.text << std::endl;
        return "";
    }
}
```

### 获取群组列表

```cpp
std::vector<json> getUserGroups(const std::string& apiUrl, const std::string& token) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/groups", 
        "GET", 
        token
    );
    
    std::vector<json> groupsList;
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        auto& groups = response["data"]["groups"];
        
        std::cout << "共有 " << groups.size() << " 个群组" << std::endl;
        
        for (const auto& group : groups) {
            groupsList.push_back(group);
            std::cout << "ID: " << group["_id"] << ", 名称: " 
                     << group["name"] << ", 成员数: " 
                     << group["memberCount"] << std::endl;
        }
    } else {
        std::cerr << "获取群组列表失败: " << r.status_code << " - " << r.text << std::endl;
    }
    
    return groupsList;
}
```

### 获取群组详情

```cpp
json getGroupDetails(const std::string& apiUrl, const std::string& token, 
                    const std::string& groupId) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/groups/" + groupId, 
        "GET", 
        token
    );
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        json groupData = response["data"]["group"];
        
        std::cout << "群组名称: " << groupData["name"] << std::endl;
        std::cout << "创建者: " << groupData["creator"]["username"] << std::endl;
        std::cout << "成员数: " << groupData["members"].size() << std::endl;
        
        return groupData;
    } else {
        std::cerr << "获取群组详情失败: " << r.status_code << " - " << r.text << std::endl;
        return json();
    }
}
```

### 邀请用户加入群组

```cpp
bool inviteToGroup(const std::string& apiUrl, const std::string& token, 
                 const std::string& groupId, const std::string& userId) {
    json inviteData = {
        {"userId", userId}
    };
    
    cpr::Response r = authenticatedRequest(
        apiUrl + "/groups/" + groupId + "/invite", 
        "POST", 
        token, 
        inviteData
    );
    
    if (r.status_code == 200) {
        std::cout << "邀请发送成功" << std::endl;
        return true;
    } else {
        std::cerr << "邀请失败: " << r.status_code << " - " << r.text << std::endl;
        return false;
    }
}
```

### 加入群组

```cpp
bool joinGroup(const std::string& apiUrl, const std::string& token, 
              const std::string& groupId) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/groups/" + groupId + "/join", 
        "POST", 
        token
    );
    
    if (r.status_code == 200) {
        std::cout << "成功加入群组" << std::endl;
        return true;
    } else {
        std::cerr << "加入群组失败: " << r.status_code << " - " << r.text << std::endl;
        return false;
    }
}
```

### 退出群组

```cpp
bool leaveGroup(const std::string& apiUrl, const std::string& token, 
               const std::string& groupId) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/groups/" + groupId + "/leave", 
        "POST", 
        token
    );
    
    if (r.status_code == 200) {
        std::cout << "成功退出群组" << std::endl;
        return true;
    } else {
        std::cerr << "退出群组失败: " << r.status_code << " - " << r.text << std::endl;
        return false;
    }
}
```

## 通知系统

### 获取通知列表

```cpp
std::vector<json> getNotifications(const std::string& apiUrl, const std::string& token, 
                                 int page = 1, int limit = 20, bool onlyUnread = false) {
    std::string url = apiUrl + "/notifications?page=" + std::to_string(page) + 
                     "&limit=" + std::to_string(limit);
    
    if (onlyUnread) {
        url += "&isRead=false";
    }
    
    cpr::Response r = authenticatedRequest(url, "GET", token);
    
    std::vector<json> notificationsList;
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        auto& notifications = response["data"]["notifications"];
        int unreadCount = response["data"]["unreadCount"];
        
        std::cout << "共有 " << notifications.size() << " 条通知，" 
                 << unreadCount << " 条未读" << std::endl;
        
        for (const auto& notification : notifications) {
            notificationsList.push_back(notification);
            std::string type = notification["type"];
            std::string content = notification["content"];
            bool isRead = notification["isRead"];
            
            std::cout << "[" << (isRead ? "已读" : "未读") << "] " 
                     << "类型: " << type << ", " 
                     << "内容: " << content << std::endl;
        }
    } else {
        std::cerr << "获取通知失败: " << r.status_code << " - " << r.text << std::endl;
    }
    
    return notificationsList;
}
```

### 获取未读通知数量

```cpp
int getUnreadNotificationCount(const std::string& apiUrl, const std::string& token) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/notifications/unread-count", 
        "GET", 
        token
    );
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        int count = response["data"]["count"];
        std::cout << "有 " << count << " 条未读通知" << std::endl;
        return count;
    } else {
        std::cerr << "获取未读通知数量失败: " << r.status_code << std::endl;
        return 0;
    }
}
```

### 标记通知为已读

```cpp
bool markNotificationAsRead(const std::string& apiUrl, const std::string& token, 
                           const std::string& notificationId) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/notifications/" + notificationId + "/mark-read", 
        "PATCH", 
        token
    );
    
    if (r.status_code == 200) {
        std::cout << "通知已标记为已读" << std::endl;
        return true;
    } else {
        std::cerr << "标记通知已读失败: " << r.status_code << " - " << r.text << std::endl;
        return false;
    }
}
```

### 标记所有通知为已读

```cpp
bool markAllNotificationsAsRead(const std::string& apiUrl, const std::string& token) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/notifications/mark-all-read", 
        "PATCH", 
        token
    );
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        int modifiedCount = response["data"]["modifiedCount"];
        std::cout << "已将 " << modifiedCount << " 条通知标记为已读" << std::endl;
        return true;
    } else {
        std::cerr << "标记所有通知已读失败: " << r.status_code << " - " << r.text << std::endl;
        return false;
    }
}
```

## 长轮询实现

为了实现实时消息接收，需要实现长轮询机制。这是一种客户端保持HTTP连接开放的技术，直到服务器有新消息可用或达到超时时间：

```cpp
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <functional>

class ChatClient {
private:
    std::string apiUrl;
    std::string token;
    std::string sessionId;
    std::thread pollingThread;
    std::atomic<bool> isRunning{false};
    std::mutex mtx;
    std::condition_variable cv;
    
    // 消息回调函数类型
    using MessageCallback = std::function<void(const json&)>;
    using SystemMessageCallback = std::function<void(const json&)>;
    using StatusCallback = std::function<void(const json&)>;
    
    MessageCallback onMessageReceived;
    SystemMessageCallback onSystemMessage;
    StatusCallback onStatusChange;
    
    // 初始化会话
    bool initSession() {
        try {
            cpr::Response r = authenticatedRequest(
                apiUrl + "/poll/register", 
                "POST", 
                token
            );
            
            if (r.status_code == 200) {
                json response = json::parse(r.text);
                sessionId = response["data"]["sessionId"];
                std::cout << "长轮询会话已注册, ID: " << sessionId << std::endl;
                return true;
            } else {
                std::cerr << "注册长轮询会话失败: " << r.status_code << " - " << r.text << std::endl;
                return false;
            }
        } catch (const std::exception& e) {
            std::cerr << "注册会话异常: " << e.what() << std::endl;
            return false;
        }
    }
    
    // 结束会话
    void endSession() {
        if (sessionId.empty()) {
            return;
        }
        
        try {
            json body = {{"sessionId", sessionId}};
            authenticatedRequest(
                apiUrl + "/poll/unregister", 
                "POST", 
                token,
                body
            );
            sessionId.clear();
        } catch (...) {
            // 忽略注销异常
        }
    }
    
    void pollingWorker() {
        // 初始化会话
        if (!initSession()) {
            isRunning = false;
            return;
        }
        
        while (isRunning) {
            try {
                // 设置长轮询超时（单位：毫秒）
                int timeout = 30000;
                
                // 构建轮询URL
                std::string url = apiUrl + "/poll/messages?sessionId=" + sessionId + 
                                 "&timeout=" + std::to_string(timeout);
                
                // 发起长轮询请求
                cpr::Response r = cpr::Get(
                    cpr::Url{url},
                    cpr::Header{{"Authorization", "Bearer " + token}},
                    cpr::Timeout{timeout + 5000}  // 客户端超时比服务端稍长
                );
                
                if (r.status_code == 200) {
                    // 收到新消息
                    json response = json::parse(r.text);
                    
                    // 处理常规消息
                    if (response["data"].contains("messages") && onMessageReceived) {
                        auto& messages = response["data"]["messages"];
                        if (!messages.empty()) {
                            onMessageReceived(messages);
                        }
                    }
                    
                    // 处理系统消息
                    if (response["data"].contains("systemMessages") && onSystemMessage) {
                        auto& systemMsgs = response["data"]["systemMessages"];
                        if (!systemMsgs.empty()) {
                            onSystemMessage(systemMsgs);
                        }
                    }
                    
                    // 处理状态变更通知
                    if (response["data"].contains("notifications") && onStatusChange) {
                        auto& statusChanges = response["data"]["notifications"];
                        if (!statusChanges.empty()) {
                            onStatusChange(statusChanges);
                        }
                    }
                } else if (r.status_code == 204) {
                    // 超时，没有新消息
                    // 可以立即开始下一轮轮询
                } else {
                    // 处理错误
                    std::cerr << "轮询失败: " << r.status_code << " - " << r.text << std::endl;
                    // 错误后短暂延迟再重试
                    std::this_thread::sleep_for(std::chrono::seconds(3));
                }
                
                // 定期发送ping保持连接
                sendPing();
            } catch (const std::exception& e) {
                std::cerr << "轮询异常: " << e.what() << std::endl;
                std::this_thread::sleep_for(std::chrono::seconds(3));
            }
        }
        
        // 会话结束时注销
        endSession();
    }
    
    void sendPing() {
        static auto lastPingTime = std::chrono::steady_clock::now();
        auto now = std::chrono::steady_clock::now();
        
        // 每60秒发送一次ping
        if (std::chrono::duration_cast<std::chrono::seconds>(now - lastPingTime).count() >= 60) {
            try {
                if (!sessionId.empty()) {
                    cpr::Get(
                        cpr::Url{apiUrl + "/poll/ping?sessionId=" + sessionId},
                        cpr::Header{{"Authorization", "Bearer " + token}},
                        cpr::Timeout{5000}
                    );
                    lastPingTime = now;
                }
            } catch (...) {
                // 忽略ping错误
            }
        }
    }
    
    // 设置用户状态
    bool setStatus(const std::string& status) {
        if (sessionId.empty()) {
            std::cerr << "无法设置状态: 会话未初始化" << std::endl;
            return false;
        }
        
        json statusData = {
            {"status", status},
            {"sessionId", sessionId}
        };
        
        cpr::Response r = authenticatedRequest(
            apiUrl + "/poll/status", 
            "POST", 
            token, 
            statusData
        );
        
        return r.status_code == 200;
    }
    
public:
    ChatClient(const std::string& url) : apiUrl(url) {}
    
    ~ChatClient() {
        stop();
    }
    
    void setToken(const std::string& authToken) {
        token = authToken;
    }
    
    void setMessageCallback(MessageCallback callback) {
        onMessageReceived = callback;
    }
    
    void setSystemMessageCallback(SystemMessageCallback callback) {
        onSystemMessage = callback;
    }
    
    void setStatusChangeCallback(StatusCallback callback) {
        onStatusChange = callback;
    }
    
    bool setOnlineStatus() {
        return setStatus("online");
    }
    
    bool setOfflineStatus() {
        return setStatus("offline");
    }
    
    bool setAwayStatus() {
        return setStatus("away");
    }
    
    bool setBusyStatus() {
        return setStatus("busy");
    }
    
    void start() {
        if (!isRunning.exchange(true)) {
            pollingThread = std::thread(&ChatClient::pollingWorker, this);
        }
    }
    
    void stop() {
        if (isRunning.exchange(false)) {
            if (pollingThread.joinable()) {
                pollingThread.join();
            }
        }
    }
    
    // 获取在线好友列表
    std::vector<json> getOnlineFriends() {
        if (sessionId.empty()) {
            std::cerr << "无法获取在线好友: 会话未初始化" << std::endl;
            return {};
        }
        
        cpr::Response r = authenticatedRequest(
            apiUrl + "/poll/online-friends", 
            "GET", 
            token
        );
        
        std::vector<json> friendsList;
        
        if (r.status_code == 200) {
            json response = json::parse(r.text);
            auto& friends = response["data"]["friends"];
            
            for (const auto& friend_obj : friends) {
                friendsList.push_back(friend_obj);
            }
        }
        
        return friendsList;
    }
};
```

## 示例代码

下面是一个完整的示例，展示如何创建简单的C++聊天客户端：

```cpp
#include <iostream>
#include <string>
#include <thread>
#include <cpr/cpr.h>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>

using json = nlohmann::json;

// 在这里包含前面定义的函数和ChatClient类

int main() {
    std::string apiUrl = "http://localhost:3001/api";
    std::string email, password;
    
    spdlog::info("===== WinUC Chat C++客户端 =====");
    std::cout << "请输入电子邮箱: ";
    std::cin >> email;
    std::cout << "请输入密码: ";
    std::cin >> password;
    
    // 登录获取token
    std::string token = login(apiUrl, email, password);
    
    if (token.empty()) {
        spdlog::error("登录失败，程序退出");
        return 1;
    }
    
    // 创建聊天客户端
    ChatClient client(apiUrl);
    client.setToken(token);
    
    // 设置消息接收回调
    client.setMessageCallback([](const json& messages) {
        for (const auto& msg : messages) {
            std::cout << "\n新消息 - " << msg["sender"]["username"].get<std::string>() << ": " 
                     << msg["content"].get<std::string>() << std::endl;
        }
        std::cout << "> " << std::flush;  // 刷新输入提示
    });
    
    // 设置系统消息回调
    client.setSystemMessageCallback([](const json& messages) {
        for (const auto& msg : messages) {
            std::cout << "\n系统消息: " << msg["content"].get<std::string>() << std::endl;
        }
        std::cout << "> " << std::flush;
    });
    
    // 设置状态变更回调
    client.setStatusChangeCallback([](const json& notifications) {
        for (const auto& notification : notifications) {
            std::string userId = notification["userId"];
            std::string status = notification["status"];
            std::cout << "\n用户状态变更 - 用户ID: " << userId 
                     << ", 新状态: " << status << std::endl;
        }
        std::cout << "> " << std::flush;
    });
    
    // 启动消息轮询
    client.start();
    
    // 设置在线状态
    client.setOnlineStatus();
    
    // 获取用户的好友列表
    std::vector<json> friends = getFriendsList(apiUrl, token);
    
    if (friends.empty()) {
        std::cout << "您的好友列表为空，请先添加好友" << std::endl;
    } else {
        std::cout << "选择一个好友进行聊天：" << std::endl;
        for (size_t i = 0; i < friends.size(); ++i) {
            std::cout << i + 1 << ". " << friends[i]["username"].get<std::string>() << std::endl;
        }
    }
    
    // 简单的聊天界面
    std::string userId, messageContent;
    std::cout << "请输入聊天对象的用户ID: ";
    std::cin >> userId;
    std::cin.ignore(); // 清除输入缓冲
    
    std::cout << "开始聊天，输入'exit'退出，输入'!help'查看命令" << std::endl;
    
    while (true) {
        std::cout << "> ";
        std::getline(std::cin, messageContent);
        
        if (messageContent == "exit") {
            break;
        } else if (messageContent == "!help") {
            std::cout << "可用命令:" << std::endl
                     << "  !online - 设置状态为在线" << std::endl
                     << "  !away - 设置状态为离开" << std::endl
                     << "  !busy - 设置状态为忙碌" << std::endl
                     << "  !friends - 显示在线好友" << std::endl
                     << "  !history - 获取历史消息" << std::endl
                     << "  !notifications - 查看通知" << std::endl
                     << "  !exit 或 exit - 退出程序" << std::endl;
        } else if (messageContent == "!online") {
            client.setOnlineStatus();
            std::cout << "状态已设置为在线" << std::endl;
        } else if (messageContent == "!away") {
            client.setAwayStatus();
            std::cout << "状态已设置为离开" << std::endl;
        } else if (messageContent == "!busy") {
            client.setBusyStatus();
            std::cout << "状态已设置为忙碌" << std::endl;
        } else if (messageContent == "!friends") {
            auto onlineFriends = client.getOnlineFriends();
            std::cout << "在线好友：" << onlineFriends.size() << " 人" << std::endl;
            for (const auto& f : onlineFriends) {
                std::cout << "  - " << f["username"].get<std::string>() << " (" 
                         << f["status"].get<std::string>() << ")" << std::endl;
            }
        } else if (messageContent == "!history") {
            getPrivateMessages(apiUrl, token, userId, 1, 10);
        } else if (messageContent == "!notifications") {
            getNotifications(apiUrl, token, 1, 5);
        } else if (!messageContent.empty()) {
            sendPrivateMessage(apiUrl, token, messageContent, userId);
        }
    }
    
    // 设置离线状态
    client.setOfflineStatus();
    
    // 停止消息轮询
    client.stop();
    
    std::cout << "聊天结束，感谢使用！" << std::endl;
    return 0;
}
```

### 构建示例

下面是一个使用CMake构建示例客户端的方法：

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.15)
project(winuc_chat_client VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 添加依赖项
find_package(cpr REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(spdlog REQUIRED)
find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)

# 添加可执行文件
add_executable(chat_client main.cpp)

# 连接库
target_link_libraries(chat_client PRIVATE
    cpr::cpr
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    OpenSSL::SSL
    OpenSSL::Crypto
    Threads::Threads
)

# 设置编译选项
if(MSVC)
    target_compile_options(chat_client PRIVATE /W4)
else()
    target_compile_options(chat_client PRIVATE -Wall -Wextra)
endif()
```

## 常见问题

### 认证问题

**问题**: 认证令牌在每次重启API服务后都会失效
**解决方案**: 实现令牌刷新机制，或在令牌失效时自动重新登录

```cpp
bool refreshToken(const std::string& apiUrl, std::string& token) {
    cpr::Response r = cpr::Post(
        cpr::Url{apiUrl + "/auth/refresh"},
        cpr::Header{{"Authorization", "Bearer " + token}}
    );
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        token = response["data"]["token"];
        return true;
    }
    return false;
}
```

### 网络异常处理

**问题**: 网络不稳定导致长轮询连接频繁断开
**解决方案**: 实现指数退避重连机制

```cpp
// 在ChatClient的pollingWorker方法中添加重试逻辑
int retryCount = 0;
const int maxRetries = 5;

// 在捕获异常后
if (++retryCount <= maxRetries) {
    // 计算指数退避时间 (1s, 2s, 4s, 8s, 16s)
    int sleepTime = 1000 * (1 << (retryCount - 1)); 
    std::this_thread::sleep_for(std::chrono::milliseconds(sleepTime));
    continue; // 重试
} else {
    retryCount = 0; // 重置计数
    // 可能需要重新初始化会话
}
```

### 内存管理

**问题**: 长时间运行后内存占用过高
**解决方案**: 定期清理消息缓存和不再需要的数据

```cpp
// 示例：限制消息历史记录数量
void limitMessageHistory(std::vector<json>& messages, size_t maxSize = 100) {
    if (messages.size() > maxSize) {
        messages.erase(messages.begin(), messages.begin() + (messages.size() - maxSize));
    }
}
```

### 线程安全

**问题**: 多线程访问共享资源导致崩溃
**解决方案**: 使用互斥锁保护共享资源访问

```cpp
// 在ChatClient类中添加
std::mutex messagesMutex;
std::vector<json> cachedMessages;

// 安全添加消息
void addMessage(const json& message) {
    std::lock_guard<std::mutex> lock(messagesMutex);
    cachedMessages.push_back(message);
}

// 安全获取消息
std::vector<json> getMessages() {
    std::lock_guard<std::mutex> lock(messagesMutex);
    return cachedMessages;
}
```

### 消息解析错误

**问题**: 解析服务器返回的JSON数据时出错
**解决方案**: 增加错误处理和数据验证

```cpp
bool parseMessageSafely(const std::string& jsonString, json& result) {
    try {
        result = json::parse(jsonString);
        
        // 验证关键字段
        if (!result.contains("data") || !result["data"].is_object()) {
            return false;
        }
        
        return true;
    } catch (const json::parse_error& e) {
        std::cerr << "JSON解析错误: " << e.what() << std::endl;
        return false;
    } catch (const std::exception& e) {
        std::cerr << "其他错误: " << e.what() << std::endl;
        return false;
    }
}
```

### 并发连接限制

**问题**: 服务器可能限制单个用户的并发连接数
**解决方案**: 使用单一长轮询连接，避免创建多余的连接

```cpp
// 在客户端设计中确保任何时候只有一个活跃的轮询连接
bool ensureSingleConnection() {
    // 简单检查轮询线程是否已在运行
    if (pollingThread.joinable()) {
        return false; // 已存在连接
    }
    return true; // 可以创建新连接
}
```

### 客户端性能优化

**问题**: 在资源受限的设备上性能不佳
**解决方案**: 优化轮询间隔和减少不必要的资源消耗

```cpp
// 动态调整轮询参数
void optimizePollingParameters(int& timeout, int& interval, int messageFrequency) {
    if (messageFrequency > 10) { // 高频消息
        timeout = 10000;  // 10秒
        interval = 500;   // 0.5秒检查一次
    } else if (messageFrequency > 0) { // 中频消息
        timeout = 20000;  // 20秒
        interval = 1000;  // 1秒检查一次
    } else { // 低频或无消息
        timeout = 30000;  // 30秒
        interval = 2000;  // 2秒检查一次
    }
}
```

---

本指南提供了WinUC Chat API的C++接入基础，涵盖了所有主要功能的实现方法。您可以根据实际项目需求进行扩展和优化。如有问题，请参考API文档或联系服务支持。
