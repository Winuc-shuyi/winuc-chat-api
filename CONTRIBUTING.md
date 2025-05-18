# 贡献指南

👍🎉 首先，感谢您考虑为WinUC Chat API项目做出贡献！🎉👍

以下是关于如何为本项目做出贡献的指南。请花时间阅读，以便您的贡献能够尽快被合并。

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
  - [报告Bug](#报告bug)
  - [请求新功能](#请求新功能)
  - [提交代码](#提交代码)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request流程](#pull-request流程)
- [开发设置](#开发设置)
- [项目结构](#项目结构)

## 行为准则

本项目采用[贡献者公约](CODE_OF_CONDUCT.md)作为行为准则。参与本项目意味着您将遵守该准则。请向项目维护者报告不可接受的行为。

## 如何贡献

### 报告Bug

Bug是项目中不符合预期的行为。报告Bug有助于使项目更加稳定。

- 使用Bug报告模板创建Issue
- 描述Bug以及复现步骤
- 如果可能，提供截图或视频
- 确保描述清晰，便于开发者理解和解决问题

### 请求新功能

您可以通过创建Issue来请求新功能。

- 使用功能请求模板创建Issue
- 清晰地描述功能及其解决的问题
- 提供尽可能多的上下文信息

### 提交代码

1. Fork本仓库
2. 创建您的特性分支：`git checkout -b feature/amazing-feature`
3. 提交您的更改：`git commit -m 'feat: 添加一些Amazing功能'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交Pull Request

## 代码规范

- 使用ES6+语法
- 函数和方法应有注释说明功能和参数
- 代码缩进使用2个空格
- 变量和函数名使用camelCase
- 类名使用PascalCase
- 常量使用UPPER_SNAKE_CASE
- API路由使用kebab-case

## 提交规范

我们使用[约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/)规范，提交信息格式如下：

```
<类型>[可选的作用域]: <描述>

[可选的正文]

[可选的脚注]
```

常用类型:
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 不影响代码含义的更改
- `refactor`: 重构代码
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 工具链相关

## Pull Request流程

1. 确保您的PR包含一个清晰的描述，说明改动的目的和内容
2. 确保您的PR通过了所有CI检查
3. 如果PR解决了某个Issue，请在PR描述中使用"fixes #123"或"closes #123"进行关联
4. 项目维护者会尽快审查您的PR
5. 可能会要求您进行一些修改
6. 一旦通过，您的PR将被合并

## 开发设置

```bash
# 克隆仓库
git clone https://github.com/yourusername/winuc-chat-api.git
cd winuc-chat-api

# 安装依赖
npm run install:all

# 启动开发服务器
npm run dev
```

## 项目结构

```
winuc-chat-api/
├── client/           # 前端React代码
├── server/           # 后端Node.js代码
│   ├── controllers/  # 控制器
│   ├── middleware/   # 中间件
│   ├── models/       # 数据模型
│   ├── routes/       # API路由
│   └── utils/        # 工具函数
├── docs/             # 文档
├── scripts/          # 构建和部署脚本
└── workers/          # CloudFlare Worker代码
```

感谢您对WinUC Chat API的贡献！ 