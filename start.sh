#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Elixir Short Video Attribution AI - 启动脚本${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}\n"

# 检查 MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠️  警告: 未检测到 MySQL 命令，请确保 MySQL 已安装并运行${NC}\n"
fi

# 检查后端目录
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ 后端目录不存在${NC}"
    exit 1
fi

# 检查后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}🔄 后端依赖未安装，正在安装...${NC}"
    cd backend && npm install && cd ..
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 后端依赖安装失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ 后端依赖安装完成${NC}\n"
fi

# 检查前端依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}🔄 前端依赖未安装，正在安装...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 前端依赖安装失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}\n"
fi

# 检查后端环境变量
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  后端 .env 文件不存在，请先配置数据库连接信息${NC}"
    echo -e "${YELLOW}   参考 backend/.env.example 创建 backend/.env 文件${NC}\n"
    exit 1
fi

# 提示数据库初始化
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  重要提示：首次运行需要初始化数据库${NC}"
echo -e "${YELLOW}   请运行: cd backend && npm run init-db${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

read -p "是否已完成数据库初始化？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}正在执行数据库初始化...${NC}"
    cd backend && npm run init-db
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 数据库初始化失败，请检查配置${NC}"
        exit 1
    fi
    cd ..
    echo -e "${GREEN}✅ 数据库初始化完成${NC}\n"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 正在启动服务...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 启动后端服务（后台运行）
echo -e "${BLUE}📡 启动后端服务 (http://localhost:3001)${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ 后端服务已启动 (PID: $BACKEND_PID)${NC}\n"
else
    echo -e "${RED}❌ 后端服务启动失败，请查看 backend.log${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 启动前端服务
echo -e "${BLUE}🌐 启动前端服务 (http://localhost:3000)${NC}"
npm run dev

# 当前端关闭时，同时关闭后端
echo -e "\n${YELLOW}正在关闭服务...${NC}"
kill $BACKEND_PID 2>/dev/null
echo -e "${GREEN}✅ 所有服务已关闭${NC}"
