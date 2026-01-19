import { ProjectModel } from '../models/projectModel.js';
import { VideoModel } from '../models/videoModel.js';
import videoDownloaderService from '../services/videoDownloader.js';

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
  }
};
