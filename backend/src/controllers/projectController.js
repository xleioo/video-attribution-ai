import { ProjectModel } from '../models/projectModel.js';
import { VideoModel } from '../models/videoModel.js';
import videoDownloaderService from '../services/videoDownloader.js';
import { summarizeProjectDiscoveryTags } from '../services/projectDiscoverySummarizer.js';
import { buildTaggingResultWorkbook } from '../services/excelExporter.js';

// DB 中 JSON 字段可能返回 string 或已解析对象，统一兜底解析
const parseJsonField = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
};

export const projectController = {
  // 获取所有项目
  async getAllProjects(req, res) {
    try {
      const projects = await ProjectModel.getAllProjects();
      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('获取项目列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取项目列表失败',
        error: error.message
      });
    }
  },

  // 根据ID获取项目
  async getProjectById(req, res) {
    try {
      const { id } = req.params;
      const project = await ProjectModel.getProjectById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: '项目不存在'
        });
      }
      
      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('获取项目详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取项目详情失败',
        error: error.message
      });
    }
  },

  // 创建项目（完整版，包含视频和指标数据）
  async createProject(req, res) {
    try {
      const { 
        project_name, 
        column_mapping, 
        raw_data 
      } = req.body;
      
      // 验证必填字段
      if (!project_name || !column_mapping || !raw_data || !Array.isArray(raw_data)) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段：project_name, column_mapping, raw_data'
        });
      }
      
      // 验证 column_mapping
      if (!column_mapping.url_col) {
        return res.status(400).json({
          success: false,
          message: '必须指定 url_col（视频URL列）'
        });
      }
      
      // 创建项目
      const projectData = {
        name: project_name,
        description: `包含 ${raw_data.length} 个视频的分析项目`,
        column_mapping: column_mapping,
        current_step: 'video_download',
        total_videos: raw_data.length
      };
      
      const projectId = await ProjectModel.createProject(projectData);
      
      // 准备视频数据
      const videos = [];
      const metrics = [];
      
      for (const row of raw_data) {
        // 获取视频URL
        const videoUrl = row[column_mapping.url_col];
        if (!videoUrl) continue;
        
        // 生成视频ID（使用用户提供的或自动生成）
        let videoId;
        if (column_mapping.id_col && row[column_mapping.id_col]) {
          videoId = row[column_mapping.id_col];
        } else {
          // 自动生成ID
          videoId = `vid_${projectId}_${videos.length + 1}`;
        }
        
        // 获取视频标题
        let videoTitle = null;
        if (column_mapping.title_col && row[column_mapping.title_col]) {
          videoTitle = row[column_mapping.title_col];
        }
        
        videos.push({
          id: videoId,
          project_id: projectId,
          video_url: videoUrl,
          title: videoTitle,
          status: 'pending'
        });
        
        // 保存指标数据
        if (column_mapping.metrics) {
          for (const [metricKey, columnName] of Object.entries(column_mapping.metrics)) {
            if (row[columnName] !== undefined && row[columnName] !== null) {
              metrics.push({
                video_id: videoId,
                project_id: projectId,
                metric_name: metricKey,
                metric_value: parseFloat(row[columnName]) || 0
              });
            }
          }
        }
      }
      
      // 批量插入视频记录
      if (videos.length > 0) {
        await VideoModel.createVideos(videos);
      }
      
      // 批量插入指标数据
      if (metrics.length > 0) {
        await VideoModel.saveVideoMetrics(metrics);
      }
      
      // 获取完整的项目信息
      const project = await ProjectModel.getProjectById(projectId);
      
      // 启动视频下载任务（异步，不阻塞响应）
      if (videos.length > 0) {
        videoDownloaderService.addToQueue(projectId, videos).catch(err => {
          console.error('添加下载任务失败:', err);
        });
      }
      
      res.status(201).json({
        success: true,
        message: '项目创建成功，视频下载已开始',
        data: {
          project_id: projectId,
          status: 'created',
          total_videos: videos.length,
          project: project
        }
      });
    } catch (error) {
      console.error('创建项目失败:', error);
      res.status(500).json({
        success: false,
        message: '创建项目失败',
        error: error.message
      });
    }
  },

  // 更新项目
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const affectedRows = await ProjectModel.updateProject(id, req.body);
      
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '项目不存在'
        });
      }
      
      const project = await ProjectModel.getProjectById(id);
      res.json({
        success: true,
        message: '项目更新成功',
        data: project
      });
    } catch (error) {
      console.error('更新项目失败:', error);
      res.status(500).json({
        success: false,
        message: '更新项目失败',
        error: error.message
      });
    }
  },

  // 删除项目
  async deleteProject(req, res) {
    try {
      const { id } = req.params;
      const affectedRows = await ProjectModel.deleteProject(id);
      
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '项目不存在'
        });
      }
      
      res.json({
        success: true,
        message: '项目删除成功'
      });
    } catch (error) {
      console.error('删除项目失败:', error);
      res.status(500).json({
        success: false,
        message: '删除项目失败',
        error: error.message
      });
    }
  },

  // 下载项目打标结果（Excel / xlsx 格式，多 Sheet）
  async downloadProjectData(req, res) {
    try {
      const { id } = req.params;
      const project = await ProjectModel.getProjectById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: '项目不存在'
        });
      }

      // 获取项目所有视频
      const videos = await VideoModel.getVideosByProject(id);
      
      // 检查是否所有视频都已完成打标
      const allTagged = videos.every(v => 
        v.status === 'ready' && v.ai_tagging_status === 'completed'
      );

      if (!allTagged) {
        return res.status(400).json({
          success: false,
          message: '项目中的视频尚未全部完成打标，无法下载数据'
        });
      }

      // 根据当前打标模式决定下载逻辑：
      // - comparison：沿用预设标签体系（video_tags + tag_categories）
      // - discovery：使用项目级汇总标签（project_discovery_tags），首次下载触发 Gemini 汇总
      const { ApiConfigModel } = await import('../models/apiConfigModel.js');
      const apiConfig = await ApiConfigModel.getActiveApiConfig();
      const taggingMode = apiConfig?.tagging_mode || 'comparison';

      // 标签列定义（宽表用）+ 标签字典（导出说明用）
      let tagColumns = []; // { columnName, categoryName, tagName, aliases? }
      let tagDictionary = []; // [{ categoryName, tags: [{ tagName, aliases? }] }]

      if (taggingMode === 'discovery') {
        // 确保项目级汇总标签已生成（首次下载触发）
        let projectTags = await VideoModel.getProjectDiscoveryTags(id);
        if (!projectTags || projectTags.length === 0) {
          if (!apiConfig?.api_key) {
            return res.status(400).json({
              success: false,
              message: '主动挖掘模式下载需要有效的 Gemini API Key，请先在设置页面配置'
            });
          }
          await summarizeProjectDiscoveryTags(id, apiConfig.api_key);
          projectTags = await VideoModel.getProjectDiscoveryTags(id);
        }

        tagColumns = projectTags.map(t => ({
          categoryName: t.category_name,
          tagName: t.tag_name,
          aliases: t.aliases_json ? (typeof t.aliases_json === 'string' ? JSON.parse(t.aliases_json) : t.aliases_json) : [],
          columnName: `${t.category_name}：${t.tag_name}`
        }));

        const dictMap = new Map();
        tagColumns.forEach(c => {
          if (!dictMap.has(c.categoryName)) dictMap.set(c.categoryName, []);
          dictMap.get(c.categoryName).push({ tagName: c.tagName, aliases: c.aliases });
        });
        tagDictionary = [...dictMap.entries()].map(([categoryName, tags]) => ({ categoryName, tags }));
      } else {
        // comparison 模式：预设标签体系
        const { TagModel } = await import('../models/tagModel.js');
        const tagCategories = await TagModel.getAllTagCategoriesWithTags();
        tagCategories.forEach(cat => {
          tagDictionary.push({ categoryName: cat.name, tags: cat.tags.map(tagName => ({ tagName })) });
          cat.tags.forEach(tagName => {
            tagColumns.push({
              categoryName: cat.name,
              tagName: tagName,
              columnName: `${cat.name}：${tagName}`
            });
          });
        });
      }

      // 获取项目的指标字段
      const metricsColumns = project.column_mapping?.metrics || {};
      const metricNames = Object.keys(metricsColumns);

      // 逐视频装配数据
      const videoData = [];
      for (const video of videos) {
        const videoMetrics = await VideoModel.getVideoMetrics(video.id);
        const metricsMap = {};
        videoMetrics.forEach(m => { metricsMap[m.metric_name] = m.metric_value; });

        const oneHot = {};
        const tagDetails = [];
        let hitTagCount = 0;

        if (taggingMode === 'discovery') {
          const videoDiscTags = await VideoModel.getVideoDiscoveryTags(video.id);
          hitTagCount = videoDiscTags.length;

          // 长表：命中的每个标签一行
          videoDiscTags.forEach(t => {
            tagDetails.push({
              categoryName: t.category_name || '视频元素',
              categoryId: '',
              tagName: t.tag_name,
              detected: true,
              confidence: null
            });
          });

          // 宽表：category => Set(tag)
          const catMap = new Map();
          for (const t of videoDiscTags) {
            const cat = t.category_name || '视频元素';
            if (!catMap.has(cat)) catMap.set(cat, new Set());
            catMap.get(cat).add(t.tag_name);
          }
          for (const col of tagColumns) {
            const set = catMap.get(col.categoryName) || new Set();
            const aliases = Array.isArray(col.aliases) ? col.aliases : [];
            const hit = set.has(col.tagName) || aliases.some(a => set.has(a));
            oneHot[col.columnName] = hit ? 1 : 0;
          }
        } else {
          const videoTags = await VideoModel.getVideoTags(video.id);
          videoTags.forEach(t => {
            const detected = t.confidence > 0;
            if (detected) hitTagCount += 1;
            // 长表：预设 taxonomy 全量（含未命中）
            tagDetails.push({
              categoryName: t.category_name,
              categoryId: t.tag_category_id,
              tagName: t.tag_name,
              detected,
              confidence: t.confidence == null ? null : Number(t.confidence)
            });
            oneHot[`${t.category_name}：${t.tag_name}`] = detected ? 1 : 0;
          });
        }

        videoData.push({
          video_id: video.id,
          title: video.title || video.id,
          video_url: video.video_url || '',
          duration: video.duration,
          file_size: video.file_size,
          ai_tagging_status: video.ai_tagging_status,
          ai_tagging_error: video.ai_tagging_error,
          metricsMap,
          oneHot,
          tagDetails,
          hitTagCount,
          first5s: parseJsonField(video.first5s_analysis),
          summary: parseJsonField(video.video_summary)
        });
      }

      // 生成 Excel
      const buffer = await buildTaggingResultWorkbook({
        project,
        taggingMode,
        metricNames,
        tagColumns,
        tagDictionary,
        videos: videoData
      });

      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName = `${dateStr}-${project.name}-打标结果.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.end(buffer);

    } catch (error) {
      console.error('下载项目数据失败:', error);
      res.status(500).json({
        success: false,
        message: '下载项目数据失败',
        error: error.message
      });
    }
  }
};
