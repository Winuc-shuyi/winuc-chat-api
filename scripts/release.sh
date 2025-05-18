#!/bin/bash

# WinUC Chat API 发布脚本
# 此脚本用于创建并发布正式版本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 打印带颜色的信息
info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 获取当前版本
VERSION=$(node -p "require('./package.json').version")
info "准备发布 WinUC Chat API v${VERSION}"

# 检查Git工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
  error "Git工作区不干净，请先提交或暂存更改"
  exit 1
fi

# 运行测试
info "运行测试..."
npm test
if [ $? -ne 0 ]; then
  error "测试失败，发布中止"
  exit 1
fi

# 构建前端
info "构建前端应用..."
npm run build
if [ $? -ne 0 ]; then
  error "前端构建失败，发布中止"
  exit 1
fi

# 创建发布标签
info "创建发布标签 v${VERSION}..."
git tag -a "v${VERSION}" -m "Release v${VERSION}"

# 推送到Git仓库
info "是否推送到Git仓库? (y/n)"
read answer
if [ "$answer" != "${answer#[Yy]}" ]; then
  git push origin "v${VERSION}"
  info "标签已推送到远程仓库"
else
  warn "标签只在本地创建，未推送到远程仓库"
fi

# 创建发布包
info "创建发布包..."
RELEASE_DIR="release/v${VERSION}"
mkdir -p "$RELEASE_DIR"

# 复制必要文件到发布目录
cp -r server "$RELEASE_DIR/"
cp -r client/build "$RELEASE_DIR/client-build"
cp package.json "$RELEASE_DIR/"
cp README.md "$RELEASE_DIR/"
cp CHANGELOG.md "$RELEASE_DIR/"
cp .env.example "$RELEASE_DIR/"

# 为发布创建精简版package.json
node -e "
const pkg = require('./package.json');
const newPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  main: pkg.main,
  scripts: {
    start: pkg.scripts.start,
    'prod:start': pkg.scripts['prod:start']
  },
  dependencies: pkg.dependencies,
  license: pkg.license
};
require('fs').writeFileSync('$RELEASE_DIR/package.json', JSON.stringify(newPkg, null, 2));
"

# 创建发布压缩包
RELEASE_FILENAME="winuc-chat-api-v${VERSION}.tar.gz"
tar -czf "$RELEASE_FILENAME" -C "release" "v${VERSION}"

info "发布包已创建: ${RELEASE_FILENAME}"
info "✨ 正式版本 v${VERSION} 发布完成! ✨" 