# 快速开始指南

## 前置要求

在开始之前，请确保你的系统已安装：
- ✅ Node.js (>= 16.0.0)
- ✅ MySQL (>= 5.7)
- ✅ npm 或 yarn

## 5 分钟快速启动

### 步骤 1: 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

### 步骤 2: 配置数据库

编辑 `backend/.env` 文件，设置你的 MySQL 连接信息：

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=short_video_attribution

PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 步骤 3: 初始化数据库

```bash
cd backend
npm run init-db
```

这个命令会：
- ✅ 创建数据库
- ✅ 创建所有必需的表
- ✅ 导入初始标签数据
- ✅ 插入示例项目

### 步骤 4: 配置前端（可选）

如果你有 Gemini API Key，可以在 `.env.local` 中配置：

```bash
GEMINI_API_KEY=你的_API_Key
VITE_API_BASE_URL=http://localhost:3001
```

> 💡 提示：API Key 也可以稍后在应用的设置页面中配置

### 步骤 5: 启动应用

#### 方式 1：使用启动脚本（推荐）

```bash
./start.sh
```

#### 方式 2：手动启动

```bash
# 终端 1 - 启动后端
cd backend
npm run dev

# 终端 2 - 启动前端（新终端窗口）
npm run dev
```

### 步骤 6: 访问应用

打开浏览器访问：
- 🌐 前端应用: http://localhost:3000
- 📡 后端API: http://localhost:3001
- ❤️ 健康检查: http://localhost:3001/health

## 验证安装

### 1. 检查后端服务

```bash
curl http://localhost:3001/health
```

应该返回：
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-19T..."
}
```

### 2. 检查标签数据

```bash
curl http://localhost:3001/api/tags
```

应该返回标签分类列表。

### 3. 访问前端

在浏览器中打开 http://localhost:3000，你应该看到：
- 左侧导航栏
- 数据仪表板
- 加载的标签分类

## 常见问题

### Q: 数据库连接失败

**A:** 请检查：
1. MySQL 服务是否已启动
   ```bash
   # macOS
   brew services start mysql
   
   # Linux
   sudo systemctl start mysql
   ```

2. `backend/.env` 中的配置是否正确
3. 数据库用户是否有创建数据库的权限

### Q: 端口被占用

**A:** 如果 3000 或 3001 端口被占用：

```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3001

# 终止进程
kill -9 <PID>
```

或者修改端口配置：
- 前端：`vite.config.ts` 中的 `server.port`
- 后端：`backend/.env` 中的 `PORT`

### Q: 前端加载慢或空白

**A:** 检查：
1. 后端是否已启动
2. 浏览器控制台是否有错误
3. `.env.local` 中的 `VITE_API_BASE_URL` 是否正确

### Q: 标签数据为空

**A:** 
1. 确认数据库初始化是否成功
2. 检查后端日志是否有错误
3. 重新运行初始化脚本：
   ```bash
   cd backend
   npm run init-db
   ```

## 下一步

✅ 安装完成后，你可以：

1. **配置 API Key**
   - 访问设置页面
   - 输入你的 Gemini API Key

2. **开始分析视频**
   - 进入视频分析页面
   - 上传或输入视频链接
   - 查看 AI 分析结果

3. **管理标签**
   - 在设置页面查看标签分类
   - 添加、编辑或删除标签

4. **查看分析报告**
   - 访问仪表板查看概览
   - 查看详细的分析报告

## 开发提示

### 热重载

- 前端和后端都支持热重载
- 修改代码后会自动刷新

### 数据库管理

```bash
# 重置数据库（删除所有数据并重新初始化）
cd backend
npm run init-db

# 使用 MySQL 命令行
mysql -u root -p
use short_video_attribution;
show tables;
```

### API 测试

使用 curl 或 Postman 测试 API：

```bash
# 获取所有项目
curl http://localhost:3001/api/projects

# 获取所有标签
curl http://localhost:3001/api/tags

# 创建新项目
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"新项目","description":"测试项目"}'
```

## 需要帮助？

- 📖 查看完整文档：[README.md](./README.md)
- 📖 后端文档：[backend/README.md](./backend/README.md)
- 📋 项目总结：[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

---

🎉 **祝你使用愉快！**
