# WinUC Chat API C++客户端接入指南

本指南将帮助C++开发者接入WinUC Chat API，实现聊天功能。

## 目录

- [概述](#概述)
- [环境准备](#环境准备)
- [认证流程](#认证流程)
- [消息收发](#消息收发)
- [长轮询实现](#长轮询实现)
- [示例代码](#示例代码)
- [常见问题](#常见问题)

## 概述

WinUC Chat API是一个基于RESTful的聊天服务端API，C++客户端可以通过HTTP请求与服务端进行交互。主要功能包括：

- 用户认证（注册、登录）
- 消息发送和接收（私聊、群聊）
- 好友管理
- 群组管理
- 长轮询获取实时消息

## 环境准备

### 依赖库

建议使用以下C++库来简化API调用：

- [cpr](https://github.com/libcpr/cpr) - 用于HTTP请求
- [nlohmann/json](https://github.com/nlohmann/json) - 用于JSON处理
- [openssl](https://www.openssl.org/) - 用于SSL/TLS支持

### 安装依赖

#### 使用vcpkg

```bash
vcpkg install cpr nlohmann-json openssl
```

#### 使用CMake

```cmake
# CMakeLists.txt
find_package(cpr REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(OpenSSL REQUIRED)

target_link_libraries(your_project PRIVATE cpr::cpr nlohmann_json::nlohmann_json OpenSSL::SSL OpenSSL::Crypto)
```

## 认证流程

### 1. 注册用户

```cpp
#include <cpr/cpr.h>
#include <nlohmann/json.hpp>
#include <iostream>

using json = nlohmann::json;

void registerUser(const std::string& apiUrl, const std::string& username, 
                 const std::string& email, const std::string& password) {
    // 构建请求体
    json requestBody = {
        {"username", username},
        {"email", email},
        {"password", password}
    };
    
    // 发送POST请求
    cpr::Response r = cpr::Post(
        cpr::Url{apiUrl + "/api/auth/register"},
        cpr::Header{{"Content-Type", "application/json"}},
        cpr::Body{requestBody.dump()}
    );
    
    // 处理响应
    if (r.status_code == 201) {
        json response = json::parse(r.text);
        std::cout << "注册成功！用户ID: " << response["data"]["user"]["id"] << std::endl;
        std::cout << "认证令牌: " << response["data"]["token"] << std::endl;
    } else {
        std::cerr << "注册失败: " << r.status_code << " - " << r.text << std::endl;
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
        cpr::Url{apiUrl + "/api/auth/login"},
        cpr::Header{{"Content-Type", "application/json"}},
        cpr::Body{requestBody.dump()}
    );
    
    // 处理响应
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        std::string token = response["data"]["token"];
        std::cout << "登录成功！" << std::endl;
        return token;
    } else {
        std::cerr << "登录失败: " << r.status_code << " - " << r.text << std::endl;
        return "";
    }
}
```

### 3. 认证请求

所有需要认证的请求都需要在Header中添加Bearer Token：

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
    }
    
    throw std::invalid_argument("Unsupported HTTP method");
}
```

## 消息收发

### 发送消息

```cpp
void sendMessage(const std::string& apiUrl, const std::string& token, 
                const std::string& content, const std::string& receiverId) {
    json messageBody = {
        {"content", content},
        {"receiver", receiverId}
    };
    
    cpr::Response r = authenticatedRequest(
        apiUrl + "/api/messages/send", 
        "POST", 
        token, 
        messageBody
    );
    
    if (r.status_code == 201) {
        std::cout << "消息发送成功" << std::endl;
    } else {
        std::cerr << "消息发送失败: " << r.status_code << " - " << r.text << std::endl;
    }
}
```

### 获取历史消息

```cpp
void getPrivateMessages(const std::string& apiUrl, const std::string& token, 
                        const std::string& userId) {
    cpr::Response r = authenticatedRequest(
        apiUrl + "/api/messages/private/" + userId, 
        "GET", 
        token
    );
    
    if (r.status_code == 200) {
        json response = json::parse(r.text);
        auto messages = response["data"]["messages"];
        
        std::cout << "共有 " << messages.size() << " 条消息" << std::endl;
        for (const auto& msg : messages) {
            std::cout << msg["sender"]["username"] << ": " << msg["content"] << std::endl;
        }
    } else {
        std::cerr << "获取消息失败: " << r.status_code << " - " << r.text << std::endl;
    }
}
```

## 长轮询实现

为了实现实时消息接收，需要实现长轮询机制：

```cpp
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>

class ChatClient {
private:
    std::string apiUrl;
    std::string token;
    std::thread pollingThread;
    std::atomic<bool> isRunning{false};
    std::mutex mtx;
    std::condition_variable cv;
    
    // 消息回调函数类型
    using MessageCallback = std::function<void(const json&)>;
    MessageCallback onMessageReceived;
    
    void pollingWorker() {
        while (isRunning) {
            try {
                // 设置长轮询超时（单位：毫秒）
                int timeout = 30000;
                
                cpr::Response r = cpr::Get(
                    cpr::Url{apiUrl + "/api/poll/messages?timeout=" + std::to_string(timeout)},
                    cpr::Header{{"Authorization", "Bearer " + token}},
                    cpr::Timeout{timeout + 5000}  // 客户端超时比服务端稍长
                );
                
                if (r.status_code == 200) {
                    // 收到新消息
                    json response = json::parse(r.text);
                    auto messages = response["data"]["messages"];
                    
                    // 调用回调函数处理消息
                    if (onMessageReceived && !messages.empty()) {
                        onMessageReceived(messages);
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
                
                // 发送ping保持连接
                sendPing();
            } catch (const std::exception& e) {
                std::cerr << "轮询异常: " << e.what() << std::endl;
                std::this_thread::sleep_for(std::chrono::seconds(3));
            }
        }
    }
    
    void sendPing() {
        try {
            cpr::Get(
                cpr::Url{apiUrl + "/api/poll/ping"},
                cpr::Header{{"Authorization", "Bearer " + token}},
                cpr::Timeout{5000}
            );
        } catch (...) {
            // 忽略ping错误
        }
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
};
```

## 示例代码

完整示例代码展示如何使用上述组件创建一个简单的C++聊天客户端：

```cpp
#include <iostream>
#include <string>
#include <thread>
#include <cpr/cpr.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// 在这里包含上面定义的ChatClient类

int main() {
    std::string apiUrl = "http://localhost:3001";
    std::string email, password;
    
    std::cout << "===== WinUC Chat C++客户端 =====" << std::endl;
    std::cout << "请输入电子邮箱: ";
    std::cin >> email;
    std::cout << "请输入密码: ";
    std::cin >> password;
    
    // 登录获取token
    std::string token = login(apiUrl, email, password);
    
    if (token.empty()) {
        std::cerr << "登录失败，程序退出" << std::endl;
        return 1;
    }
    
    // 创建聊天客户端
    ChatClient client(apiUrl);
    client.setToken(token);
    
    // 设置消息接收回调
    client.setMessageCallback([](const json& messages) {
        for (const auto& msg : messages) {
            std::cout << "\n新消息 - " << msg["sender"]["username"] << ": " 
                     << msg["content"] << std::endl;
        }
        std::cout << "> " << std::flush;  // 刷新输入提示
    });
    
    // 启动消息轮询
    client.start();
    
    // 简单的聊天界面
    std::string userId, messageContent;
    std::cout << "请输入聊天对象的用户ID: ";
    std::cin >> userId;
    
    std::cout << "开始聊天，输入'exit'退出" << std::endl;
    
    while (true) {
        std::cout << "> ";
        std::getline(std::cin, messageContent);
        
        if (messageContent == "exit") {
            break;
        }
        
        if (!messageContent.empty()) {
            sendMessage(apiUrl, token, messageContent, userId);
        }
    }
    
    // 停止消息轮询
    client.stop();
    
    std::cout << "聊天结束，感谢使用！" << std::endl;
    return 0;
}
```

## 常见问题

### SSL证书验证

当连接到HTTPS服务时，您可能需要处理SSL证书验证：

```cpp
// 设置SSL验证选项
cpr::SslOptions sslOpts = cpr::Ssl(
    cpr::ssl::VerifyPeer{true},
    cpr::ssl::VerifyHost{true},
    cpr::ssl::CaPath{"/path/to/ca/certificates"}
);

// 在请求中使用
cpr::Response r = cpr::Get(
    cpr::Url{url},
    headers,
    sslOpts
);
```

### 内存管理

在处理大量消息时，注意适当清理不再需要的消息数据，避免内存泄漏。

### 线程安全

在多线程环境中使用API客户端时，确保对共享资源的访问是线程安全的。

### 错误处理

实现全面的错误处理机制，包括网络异常、服务器错误和认证失效等情况。

---

本指南提供了WinUC Chat API的C++接入基础，您可以根据实际项目需求进行扩展和优化。如有问题，请参考API文档或联系服务支持。 