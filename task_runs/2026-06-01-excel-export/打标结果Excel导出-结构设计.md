# 视频打标结果 Excel 导出 - 结构设计方案

> 任务目录：`task_runs/2026-06-01-excel-export/`
> 目标：把详细的视频打标结果导出为 `.xlsx`，既保留完整信息，又结构化便于后续统计分析。

## 一、数据来源盘点

打标结果分散在 4 个层面，导出必须把它们整合：

| 数据块 | 存储位置 | 形态 | 用途 |
|--------|----------|------|------|
| 视频元信息 | `videos` 表 | 单条 | 标题/URL/时长/状态 |
| 业务指标 | `video_metrics` + `projects.column_mapping.metrics` | 键值对 | 播放/点赞/评论等 |
| 被动标签（comparison） | `video_tags`（全量 one-hot，confidence 1.0/0.0） | 多行 | 预设 taxonomy 命中 |
| 主动标签（discovery） | `video_discovery_tags`（只存命中） | 多行 | 自由发现标签 |
| 前5秒分析 | `videos.first5s_analysis` (JSON) | 嵌套 | hook/timeline/tags |
| 视频结构 | `videos.video_summary` (JSON) | 嵌套 | 痛点→产品→背书→CTA |

## 二、设计原则

1. **一个主键贯穿全部**：`video_id` 作为所有 Sheet 的关联键，方便 Excel/Pandas 跨表 join。
2. **数值与文本分离**：可统计的（0/1 命中、指标数值）放宽表；长文本叙事（evidence、description）放明细表，避免污染分析列。
3. **宽表给建模，长表给透视**：
   - **宽表（one-hot）**：一行一视频，适合直接做相关性/回归（标签 vs 指标）。
   - **长表（tidy）**：一行一"视频×标签"或"视频×阶段"，适合做数据透视表、分组聚合。
4. **两种打标模式统一字段**：用 `mode` 列区分 comparison / discovery，结构尽量复用。

## 三、Workbook 多 Sheet 结构

### Sheet 1｜`视频总览`（主表，一行一视频）
分析的"事实表中心"，汇总每个视频的关键标量。

| 列 | 来源 | 说明 |
|----|------|------|
| video_id | videos.id | 主键 |
| 视频标题 | videos.title | |
| 视频URL | videos.video_url | |
| 时长(秒) | videos.duration | |
| 文件大小(MB) | videos.file_size | 换算 |
| 打标状态 | videos.ai_tagging_status | completed/error |
| 打标模式 | project mode | comparison/discovery |
| [指标列…] | video_metrics | 播放/点赞/评论/分享… 动态列 |
| 命中标签数 | 聚合 | 该视频命中的标签总数 |
| 开场钩子强度 | first5s_analysis.hook_strength | 强/中/弱 |
| 结构完整度 | video_summary.structure | present=true 的阶段数 / 总阶段数 |
| 核心结论 | video_summary.overall_takeaway | 一句话总结 |

### Sheet 2｜`标签明细`（长表，一行一"视频×标签"）
透视分析主力表，两种模式都能填。

| 列 | 说明 |
|----|------|
| video_id | 关联键 |
| 视频标题 | 冗余便于阅读 |
| 打标模式 | comparison/discovery |
| 标签分类 | category_name（如"视觉风格""爆款潜质"） |
| 分类ID | tag_category_id（comparison 有） |
| 标签名 | tag_name |
| 是否命中 | 1/0（comparison 全量含未命中；discovery 仅命中行=1） |
| 置信度 | confidence（comparison 有，discovery 留空） |

> 用途示例：用透视表统计"每个标签的出现视频数""各分类命中分布"。

### Sheet 3｜`标签宽表`（one-hot，一行一视频）
直接喂给建模/相关性分析，等价于现有 CSV 但放进 xlsx。

| 列 | 说明 |
|----|------|
| video_id / 视频标题 | 关联键 |
| [指标列…] | 与总览一致 |
| `分类：标签` …（每个标签一列） | 值为 1/0 |

> comparison：列=全部预设 taxonomy；discovery：列=项目汇总标签（含同义词合并）。

### Sheet 4｜`前5秒-概览`（一行一视频）
| 列 | 来源 |
|----|------|
| video_id | |
| 钩子强度 | first5s_analysis.hook_strength |
| 亮点 | first5s_analysis.highlight |
| 问题点 | first5s_analysis.issue |
| 前5秒标签 | first5s_analysis.tags（逗号拼接） |

### Sheet 5｜`前5秒-时间线`（长表，一行一秒）
| 列 | 来源 |
|----|------|
| video_id | |
| 秒 | timeline[].second |
| 画面描述 | timeline[].description |

### Sheet 6｜`视频结构`（长表，一行一"视频×阶段"）
| 列 | 来源 |
|----|------|
| video_id | |
| 阶段 | structure[].stage（痛点引入/产品引入/信任背书/CTA） |
| 是否出现 | structure[].present → 1/0 |
| 证据 | structure[].evidence |
| 时间戳 | structure[].timestamp |

> 用途：统计"哪些结构阶段最常缺失""有信任背书 vs 无 的指标差异"。

### Sheet 7｜`导出说明`（元信息 + 字典）
- 项目名、导出时间、视频总数、打标模式
- 标签字典：分类 → 标签列表（comparison 为预设 taxonomy；discovery 含同义词 aliases）
- 字段口径说明（confidence 含义、present 含义等）

## 四、技术要点

- 后端用 `exceljs`（流式、支持多 Sheet/样式）或 `xlsx`（SheetJS，前端已有依赖）。建议后端 `exceljs`。
- 新增接口：`GET /api/projects/:id/download/excel`，复用 `downloadProjectData` 的数据装配逻辑，扩展叙事 Sheet。
- JSON 字段需 `parseJsonField` 兜底（DB 可能返回 string 或 object）。
- 首行冻结 + 表头加粗 + 自适应列宽，提升可读性。
- 文件名：`YYYYMMDD-{项目名}-打标结果.xlsx`，UTF-8。

## 五、待确认问题
1. Sheet 数量是否过多？是否需要精简（如合并前5秒概览进总览）。
2. discovery 模式是否也要"长表 + 宽表"双份，还是只要长表。
3. 是否保留现有 CSV 入口，新增 Excel 入口，还是替换。
