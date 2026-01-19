# 修复记录：React Key 重复警告

## 问题描述

在项目详情页面显示视频标签时，出现 React 警告：

```
Warning: Encountered two children with the same key, `淡纹抚皱`. 
Keys should be unique so that components maintain their identity across updates.
```

## 根本原因

使用 `tag.tag_name` 作为 React key，但同一个标签名可能在不同的标签分类中重复出现。

### 问题场景

假设标签数据：
```javascript
[
  { tag_name: "淡纹抚皱", tag_category_id: "efficacy_appeal" },
  { tag_name: "淡纹抚皱", tag_category_id: "efficacy_audience" }
]
```

两个标签有相同的名称但属于不同分类，导致 key 重复。

## 解决方案

使用数据库主键 `tag.id` 作为唯一 key，并提供后备方案。

### 修改位置

**文件**：`pages/ProjectDetail.tsx`

#### 位置 1：视频卡片标签列表

**修改前**：
```javascript
{videoTags[video.id]?.tags?.slice(0, 3).map((tag: any) => (
  <span key={tag.tag_name}>  // ❌ 可能重复
    {tag.tag_name}
  </span>
))}
```

**修改后**：
```javascript
{videoTags[video.id]?.tags?.slice(0, 3).map((tag: any, index: number) => (
  <span key={tag.id || `${tag.tag_category_id}-${tag.tag_name}-${index}`}>  // ✅ 唯一
    {tag.tag_name}
  </span>
))}
```

#### 位置 2：播放模态框标签列表

**修改前**：
```javascript
{videoTags[selectedVideo.id].tags.map((tag: any) => (
  <div key={tag.tag_name}>  // ❌ 可能重复
    <span>✓</span>
    <span>{tag.tag_name}</span>
  </div>
))}
```

**修改后**：
```javascript
{videoTags[selectedVideo.id].tags.map((tag: any, index: number) => (
  <div key={tag.id || `${tag.tag_category_id}-${tag.tag_name}-${index}`}>  // ✅ 唯一
    <span>✓</span>
    <span>{tag.tag_name}</span>
  </div>
))}
```

## Key 策略说明

### 优先级

1. **首选**：`tag.id` - 数据库主键，绝对唯一
2. **后备**：`${tag.tag_category_id}-${tag.tag_name}-${index}` - 组合键
   - `tag_category_id`: 标签分类 ID
   - `tag_name`: 标签名称
   - `index`: 数组索引（最后的保障）

### 为什么使用组合键作为后备？

1. **tag.id** 可能在某些情况下不存在（新创建的标签、内存数据等）
2. **组合键** 确保即使在极端情况下也有唯一性
3. **index** 作为最后的保障，确保 key 始终唯一

## 验证方法

### 1. 检查控制台

打开浏览器开发者工具（F12），应该：
- ✅ 无 key 重复警告
- ✅ 无 React 错误

### 2. 测试场景

**场景 A**：同一标签在不同分类
```javascript
// 标签数据
[
  { id: 1, tag_name: "淡纹抚皱", tag_category_id: "cat_1" },
  { id: 2, tag_name: "淡纹抚皱", tag_category_id: "cat_2" }
]

// key 生成结果
// tag 1: key="1"
// tag 2: key="2"
// ✅ 唯一
```

**场景 B**：没有 id 的情况（理论上）
```javascript
// 标签数据
[
  { tag_name: "淡纹抚皱", tag_category_id: "cat_1" },
  { tag_name: "淡纹抚皱", tag_category_id: "cat_2" }
]

// key 生成结果
// tag 1: key="cat_1-淡纹抚皱-0"
// tag 2: key="cat_2-淡纹抚皱-1"
// ✅ 唯一
```

## React Key 最佳实践

### ✅ 推荐做法

```javascript
// 1. 使用数据库 ID
items.map(item => <div key={item.id}>{item.name}</div>)

// 2. 使用唯一组合
items.map(item => <div key={`${item.category}-${item.id}`}>{item.name}</div>)

// 3. 使用稳定的唯一标识符
items.map(item => <div key={item.uuid}>{item.name}</div>)
```

### ❌ 不推荐做法

```javascript
// 1. 使用非唯一值
items.map(item => <div key={item.name}>{item.name}</div>)  // ❌ 名称可能重复

// 2. 仅使用 index
items.map((item, index) => <div key={index}>{item.name}</div>)  // ❌ 顺序变化会有问题

// 3. 使用随机值
items.map(item => <div key={Math.random()}>{item.name}</div>)  // ❌ 每次渲染都不同
```

## 相关文档

- [React 官方文档：Lists and Keys](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- [视频打标流程说明.md](./视频打标流程说明.md)

## 影响范围

- ✅ 视频卡片标签显示
- ✅ 视频播放模态框标签显示
- ✅ 所有使用标签列表的组件

## 测试结果

- ✅ 无 React 警告
- ✅ 标签正常显示
- ✅ 性能无影响
- ✅ 代码 Linter 检查通过

## 修复日期

2026-01-19
