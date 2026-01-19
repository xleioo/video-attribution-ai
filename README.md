# Elixir Short Video Attribution AI

一个基于 AI 的短视频归因分析系统，采用前后端分离架构，帮助分析视频内容标签和性能指标。

## 项目架构

本项目采用前后端分离的架构设计：

- **前端**：React + TypeScript + Vite
- **后端**：Node.js + Express + MySQL
- **AI服务**：Google Gemini API

## 功能特性

- 📊 **数据分析仪表板** - 展示视频性能指标和分析结果
- 🏷️ **智能标签系统** - 多维度视频内容标签分类
- 🎬 **视频分析工具** - 使用 AI 自动分析视频内容
- ⚙️ **配置管理** - 灵活的项目、标签和 API 配置管理
- 📈 **数据可视化** - 丰富的图表展示和分析报告

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- MySQL >= 5.7
- npm 或 yarn

### 1. 克隆项目

```bash
git clone <repository-url>
cd elixir-short-video-attribution-ai
```

### 2. 后端设置

#### 2.1 安装后端依赖

```bash
cd backend
npm install
```

#### 2.2 配置后端环境变量

编辑 `backend/.env` 文件：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=short_video_attribution

# 服务器配置
PORT=3001
NODE_ENV=development

# CORS 配置
FRONTEND_URL=http://localhost:3000
```

#### 2.3 初始化数据库

```bash
npm run init-db
```

此命令会自动：
- 创建数据库
- 创建所有必需的表
- 插入初始标签数据

#### 2.4 启动后端服务

```bash
npm run dev
```

后端服务将在 `http://localhost:3001` 启动。

### 3. 前端设置

#### 3.1 返回项目根目录并安装前端依赖

```bash
cd ..
npm install
```

#### 3.2 配置前端环境变量

编辑 `.env.local` 文件：

```bash
# Gemini API Key（可选，也可以在设置页面配置）
GEMINI_API_KEY=your_gemini_api_key

# 后端API地址
VITE_API_BASE_URL=http://localhost:3001
```

#### 3.3 启动前端服务

```bash
npm run dev
```

前端应用将在 `http://localhost:3000` 启动。

## 项目结构

```
elixir-short-video-attribution-ai/
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由
│   │   ├── scripts/        # 脚本（如数据库初始化）
│   │   └── server.js       # 服务器入口
│   ├── .env                # 后端环境变量
│   ├── package.json
│   └── README.md           # 后端文档
│
├── components/             # 前端组件
│   └── Sidebar.tsx
├── pages/                  # 前端页面
│   ├── Dashboard.tsx
│   ├── Report.tsx
│   ├── Settings.tsx
│   └── VideoPlayground.tsx
├── services/               # 前端服务
│   ├── apiService.ts       # 后端 API 调用
│   └── geminiService.ts    # Gemini AI 服务
├── App.tsx                 # 前端主应用
├── constants.ts            # 常量定义
├── types.ts                # TypeScript 类型定义
├── .env.local              # 前端环境变量
├── package.json
├── vite.config.ts
└── README.md               # 主文档
```

## 使用说明

### 1. 配置 API Key

访问设置页面，输入你的 Gemini API Key。API Key 也可以通过后端的 API 配置管理进行统一管理。

### 2. 管理标签分类

在设置页面可以查看和管理标签分类。标签数据存储在数据库中，支持：
- 查看所有标签分类
- 添加新的标签分类
- 编辑现有标签
- 删除标签分类

### 3. 分析视频

在视频分析工具页面：
1. 输入视频链接或上传视频
2. 系统会使用 AI 自动分析视频内容
3. 生成标签和分析报告

### 4. 查看分析报告

在仪表板和报告页面可以查看：
- 视频性能指标
- 标签分布
- 数据可视化图表
- 归因分析结果

## API 文档

详细的后端 API 文档请查看 [backend/README.md](./backend/README.md)

主要 API 端点：
- `GET /api/projects` - 获取所有项目
- `GET /api/tags` - 获取所有标签分类
- `GET /api/config` - 获取 API 配置
- `GET /health` - 健康检查

## 开发指南

### 前端开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 后端开发

```bash
cd backend

# 安装依赖
npm install

# 启动开发服务器（热重载）
npm run dev

# 启动生产服务器
npm start

# 初始化/重置数据库
npm run init-db
```

## 技术栈

### 前端
- React 19
- TypeScript
- Vite
- Lucide React（图标）
- Recharts（图表）

### 后端
- Node.js
- Express.js
- MySQL
- mysql2（Promise 支持）
- CORS
- dotenv

### AI 服务
- Google Gemini API

## 常见问题

### 数据库连接失败

1. 确保 MySQL 服务已启动
2. 检查 `backend/.env` 中的数据库配置
3. 确保数据库用户有足够的权限

### 前端无法连接后端

1. 确认后端服务已启动（`http://localhost:3001`）
2. 检查 `.env.local` 中的 `VITE_API_BASE_URL` 配置
3. 查看浏览器控制台的 CORS 错误

### AI 分析失败

1. 确认 Gemini API Key 已正确配置
2. 检查 API Key 是否有效且有足够的配额
3. 查看浏览器控制台和后端日志

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

ISC

## 相关链接

- [Google Gemini API 文档](https://ai.google.dev/docs)
- [React 文档](https://react.dev/)
- [Express.js 文档](https://expressjs.com/)
- [MySQL 文档](https://dev.mysql.com/doc/)
