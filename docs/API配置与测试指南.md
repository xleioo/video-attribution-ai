# API 配置与测试指南

## 功能概述

系统现在支持在设置页面统一管理 Gemini API Key，并提供测试功能验证 API Key 的有效性。

## 主要改进

### ✅ 统一 API Key 管理

**之前**：每次视频打标需要手动输入 API Key
**现在**：在设置页面配置一次，所有视频打标自动使用

### ✅ API Key 测试功能

在设置页面添加了"测试"按钮，可以快速验证 API Key 是否有效。

### ✅ 自动从数据库读取

后端自动从数据库读取活跃的 API 配置，无需用户每次输入。

## 使用步骤

### 1. 配置 API Key

1. 打开**设置页面**（Settings）
2. 找到"AI 模型配置"部分
3. 在"Gemini API Key"输入框中输入您的 API Key
4. 点击**"测试"**按钮验证 API Key 是否有效
5. 看到"✓ API Key 有效！"后，点击右上角**"保存配置"**按钮

### 2. 测试 API Key

测试按钮会：
- 调用 Gemini API 发送简单的测试请求
- 验证 API Key 是否有效
- 显示测试结果（成功/失败）

**可能的测试结果**：
- ✓ **API Key 有效！** - Key 可以正常使用
- ✗ **API Key 无效** - Key 格式错误或已失效
- ✗ **测试失败：网络错误** - 无法连接到 Gemini API

### 3. 使用视频打标

配置保存后：
1. 进入任意项目详情页
2. 找到已下载的视频
3. 点击**"🏷️ 视频打标"**按钮
4. 确认后，系统自动使用配置的 API Key 进行打标

**无需再手动输入 API Key！**

## 技术实现

### 后端

#### 1. API Key 测试接口

```javascript
POST /api/config/test
Body: { "api_key": "AIza..." }

Response: {
  "success": true,
  "message": "API Key 有效",
  "test_response": "Hello"
}
```

#### 2. 自动读取配置

视频打标时自动从数据库读取：
```javascript
const apiConfig = await ApiConfigModel.getActiveApiConfig();
await videoTaggerService.addToQueue(video_id, project_id, apiConfig.api_key);
```

### 前端

#### 1. 设置页面增强

- 添加"测试"按钮
- 实时显示测试结果
- 保存时自动更新数据库

#### 2. 打标流程简化

- 移除 API Key 输入模态框
- 直接调用打标接口
- 后端自动使用配置的 Key

## API Key 获取

### Google Gemini API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 登录 Google 账号
3. 点击"Create API Key"
4. 复制生成的 API Key（格式：AIza...）

### 注意事项

1. **保密性**：API Key 存储在数据库中，请确保数据库安全
2. **配额限制**：Gemini API 有免费配额限制，请注意使用量
3. **Key 格式**：必须以 `AIza` 开头的有效 Key
4. **测试耗费**：每次测试会消耗少量 API 配额

## 故障排除

### 问题 1：测试一直转圈

**原因**：网络问题或 API 端点不可达

**解决**：
- 检查网络连接
- 确认可以访问 Google 服务
- 尝试使用 VPN

### 问题 2：API Key 有效但打标失败

**原因**：可能是配额用完或视频文件问题

**解决**：
```bash
# 查看后端日志
cd backend
tail -f ../backend.log

# 检查具体错误信息
```

### 问题 3：保存配置后打标仍提示未配置

**原因**：数据库配置未正确保存

**解决**：
```bash
# 检查数据库
mysql -u root -p short_video_attribution

# 查询配置
SELECT * FROM api_configs WHERE is_active = 1;

# 应该能看到一条记录
```

### 问题 4：测试显示"无效"但 Key 确实是对的

**原因**：可能是 API 临时不可用

**解决**：
1. 等待几分钟后重试
2. 在 [AI Studio](https://aistudio.google.com/) 确认 Key 状态
3. 必要时重新生成 Key

## 数据库结构

### api_configs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| config_name | VARCHAR | 配置名称 |
| api_key | VARCHAR | API Key |
| api_endpoint | VARCHAR | API 端点（可选）|
| provider | VARCHAR | 提供商（gemini）|
| is_active | BOOLEAN | 是否激活 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**注意**：系统只使用 `is_active = 1` 的配置

## 安全建议

1. **定期更换 Key**：建议每月更换一次 API Key
2. **监控使用量**：在 Google Cloud Console 监控配额使用情况
3. **限制访问**：只授予必要人员访问设置页面的权限
4. **备份配置**：定期备份数据库
5. **使用 HTTPS**：生产环境必须使用 HTTPS 加密传输

## 下一步

配置完成后，您可以：
1. 批量打标项目中的所有视频
2. 查看标签识别结果
3. 基于标签进行归因分析
4. 导出标签数据用于报告

## 相关文档

- [视频打标功能说明.md](./视频打标功能说明.md)
- [打标功能测试指南.md](./打标功能测试指南.md)
