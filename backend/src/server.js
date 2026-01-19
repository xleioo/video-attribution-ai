import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import projectRoutes from './routes/projectRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import apiConfigRoutes from './routes/apiConfigRoutes.js';
import videoRoutes from './routes/videoRoutes.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务（提供下载的视频）
app.use('/storage', express.static(process.env.STORAGE_PATH || './storage'));

// 日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API 路由
app.use('/api/projects', projectRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/config', apiConfigRoutes);
app.use('/api', videoRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 后端服务器已启动`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n可用的API端点:`);
  console.log(`  - GET  /health              - 健康检查`);
  console.log(`  - GET  /api/projects        - 获取所有项目`);
  console.log(`  - GET  /api/tags            - 获取所有标签分类`);
  console.log(`  - GET  /api/config          - 获取所有API配置`);
  console.log(`  - GET  /api/config/active   - 获取活跃的API配置\n`);
});

export default app;
