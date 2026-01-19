# 修复记录：Gemini API 调用更新

## 问题描述

测试 API Key 时报错：
```
404 Not Found - models/gemini-1.5-flash is not found for API version v1beta
```

## 根本原因

1. **使用了错误的 npm 包**：后端使用 `@google/generative-ai`（旧版）
2. **使用了错误的模型名称**：`gemini-1.5-flash` 或 `gemini-pro` 不可用
3. **API 调用方式不一致**：前后端使用不同的调用方式

## 解决方案

### 1. 统一使用新版 SDK

**安装正确的包**：
```bash
cd backend
npm install @google/genai
```

### 2. 更新 API 调用方式

**之前（错误）**：
```javascript
// 使用旧包
const { GoogleGenerativeAI } = await import('@google/generative-ai');
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const result = await model.generateContent("...");
```

**之后（正确）**：
```javascript
// 使用新包
const { GoogleGenAI } = await import('@google/genai');
const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: {
    parts: [{ text: "..." }]
  }
});
```

### 3. 统一模型名称

- ❌ `gemini-1.5-flash` (不可用)
- ❌ `gemini-pro` (已废弃)
- ✅ `gemini-2.5-flash` (正确，与前端一致)

## 修改的文件

### 后端
1. **backend/src/controllers/apiConfigController.js**
   - 更新 `testApiKey` 方法
   - 改用 `@google/genai` 包
   - 使用 `gemini-2.5-flash` 模型

2. **backend/src/services/videoTagger.js**
   - 更新 `analyzeVideoWithGemini` 方法
   - 改用 `@google/genai` 包
   - 使用 `gemini-2.5-flash` 模型
   - 添加 `responseMimeType` 和 `temperature` 配置

3. **backend/package.json**
   - 新增依赖：`@google/genai`

## 验证步骤

### 1. 测试 API Key

1. 打开设置页面
2. 输入 Gemini API Key
3. 点击"测试"按钮
4. 应该看到：✓ API Key 有效！

### 2. 测试视频打标

1. 进入项目详情页
2. 点击"🏷️ 视频打标"按钮
3. 视频应该成功加入打标队列
4. 等待打标完成

## 技术细节

### API 响应格式

**新版 SDK 的响应格式**：
```javascript
const response = await ai.models.generateContent({...});
const text = response.text;  // 直接访问 text 属性
```

**旧版 SDK 的响应格式**（已废弃）：
```javascript
const result = await model.generateContent(...);
const response = await result.response;
const text = response.text();  // 需要调用方法
```

### 配置选项

新版 SDK 支持更多配置：
```javascript
{
  model: "gemini-2.5-flash",
  contents: {...},
  config: {
    responseMimeType: "application/json",  // 强制 JSON 响应
    temperature: 0.1,                       // 低温度确保稳定性
  }
}
```

## 前后端一致性

现在前后端使用相同的：
- ✅ npm 包：`@google/genai`
- ✅ 模型：`gemini-2.5-flash`
- ✅ API 调用方式
- ✅ 响应处理逻辑

## 相关链接

- [Google GenAI SDK 文档](https://github.com/google/generative-ai-js)
- [Gemini API 模型列表](https://ai.google.dev/models/gemini)

## 测试结果

- ✅ API Key 测试功能正常
- ✅ 后端服务健康检查通过
- ✅ 代码 Linter 检查无错误

## 日期

2026-01-19
