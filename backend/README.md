# Elixir Short Video Attribution AI - 后端服务

这是一个基于 Node.js + Express + MySQL 的后端 API 服务，为短视频归因分析系统提供数据支持。

## 技术栈

- **Node.js** - JavaScript 运行时
- **Express.js** - Web 框架
- **MySQL** - 关系型数据库
- **mysql2** - MySQL 驱动（支持 Promise）
- **CORS** - 跨域资源共享
- **dotenv** - 环境变量管理

## 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   └── database.js  # 数据库连接配置
│   ├── controllers/     # 控制器层
│   │   ├── projectController.js
│   │   ├── tagController.js
│   │   └── apiConfigController.js
│   ├── models/          # 数据模型层
│   │   ├── projectModel.js
│   │   ├── tagModel.js
│   │   └── apiConfigModel.js
│   ├── routes/          # 路由层
│   │   ├── projectRoutes.js
│   │   ├── tagRoutes.js
│   │   └── apiConfigRoutes.js
│   ├── scripts/         # 脚本文件
│   │   └── initDatabase.js  # 数据库初始化脚本
│   └── server.js        # 服务器入口文件
├── .env                 # 环境变量配置
├── .gitignore
├── package.json
└── README.md
```

## 数据库设计

### 表结构

#### 1. projects（项目表）
```sql
- id: INT (主键，自增)
- name: VARCHAR(255) (项目名称)
- description: TEXT (项目描述)
- status: ENUM('active', 'inactive', 'archived') (状态)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 2. tag_categories（标签分类表）
```sql
- id: VARCHAR(100) (主键)
- name: VARCHAR(255) (分类名称)
- sort_order: INT (排序)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 3. tags（标签表）
```sql
- id: INT (主键，自增)
- category_id: VARCHAR(100) (外键 -> tag_categories.id)
- name: VARCHAR(255) (标签名称)
- sort_order: INT (排序)
- created_at: TIMESTAMP
```

#### 4. api_configs（API配置表）
```sql
- id: INT (主键，自增)
- config_name: VARCHAR(100) (配置名称，唯一)
- api_key: TEXT (API密钥)
- api_endpoint: VARCHAR(500) (API端点)
- provider: VARCHAR(50) (提供商，默认 'gemini')
- is_active: BOOLEAN (是否激活)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 快速开始

### 1. 环境要求

- Node.js >= 16.0.0
- MySQL >= 5.7

### 2. 安装依赖

```bash
cd backend
npm install
```

### 3. 配置环境变量

复制 `.env` 文件并配置数据库连接信息：

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

### 4. 初始化数据库

运行数据库初始化脚本，自动创建数据库、表结构并插入初始数据：

```bash
npm run init-db
```

### 5. 启动服务器

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3001` 启动。

## API 接口文档

### 健康检查

```
GET /health
```

**响应示例：**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-19T10:00:00.000Z"
}
```

### 项目管理 API

#### 获取所有项目
```
GET /api/projects
```

#### 获取单个项目
```
GET /api/projects/:id
```

#### 创建项目
```
POST /api/projects
Content-Type: application/json

{
  "name": "项目名称",
  "description": "项目描述",
  "status": "active"
}
```

#### 更新项目
```
PUT /api/projects/:id
Content-Type: application/json

{
  "name": "新项目名称",
  "description": "新项目描述",
  "status": "active"
}
```

#### 删除项目
```
DELETE /api/projects/:id
```

### 标签管理 API

#### 获取所有标签分类
```
GET /api/tags
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "content_format",
      "name": "内容形式标签",
      "tags": ["榜单推荐", "Vlog日常", "教程/手法"],
      "sort_order": 0
    }
  ]
}
```

#### 获取单个标签分类
```
GET /api/tags/:id
```

#### 创建标签分类
```
POST /api/tags
Content-Type: application/json

{
  "id": "custom_category",
  "name": "自定义分类",
  "tags": ["标签1", "标签2"],
  "sort_order": 0
}
```

#### 更新标签分类
```
PUT /api/tags/:id
Content-Type: application/json

{
  "name": "更新后的分类名",
  "tags": ["新标签1", "新标签2"],
  "sort_order": 1
}
```

#### 删除标签分类
```
DELETE /api/tags/:id
```

### API配置管理

#### 获取所有API配置
```
GET /api/config
```

#### 获取活跃的API配置
```
GET /api/config/active
```

#### 获取指定配置
```
GET /api/config/:name
```

#### 创建API配置
```
POST /api/config
Content-Type: application/json

{
  "config_name": "gemini_config",
  "api_key": "your_api_key_here",
  "api_endpoint": "https://generativelanguage.googleapis.com/v1beta/models",
  "provider": "gemini",
  "is_active": true
}
```

#### 更新API配置
```
PUT /api/config/:id
```

#### 删除API配置
```
DELETE /api/config/:id
```

## 响应格式

所有 API 响应都遵循统一的格式：

**成功响应：**
```json
{
  "success": true,
  "data": { /* 数据内容 */ },
  "message": "操作成功"
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

## 开发指南

### 添加新的 API 端点

1. 在 `models/` 中创建数据模型
2. 在 `controllers/` 中创建控制器
3. 在 `routes/` 中定义路由
4. 在 `server.js` 中注册路由

### 数据库迁移

如果需要修改数据库结构，建议：
1. 修改 `scripts/initDatabase.js`
2. 创建新的迁移脚本
3. 在开发/测试环境测试
4. 文档化变更

## 常见问题

### 数据库连接失败

1. 检查 MySQL 服务是否启动
2. 验证 `.env` 中的数据库配置
3. 确保数据库用户有足够的权限

### CORS 错误

确保 `.env` 中的 `FRONTEND_URL` 配置正确，并且与前端运行地址一致。

## 安全建议

1. ❌ **不要**将 `.env` 文件提交到版本控制
2. ✅ 使用强密码保护数据库
3. ✅ 在生产环境使用 HTTPS
4. ✅ 定期更新依赖包
5. ✅ 实施 API 访问限制和认证机制

## 许可证

ISC
