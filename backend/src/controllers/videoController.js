import { VideoModel } from '../models/videoModel.js';
import { ProjectModel } from '../models/projectModel.js';
import videoTaggerService from '../services/videoTagger.js';
import videoDiscovererService from '../services/videoDiscoverer.js';

export const videoController = {
  // 获取项目的所有视频
  async getProjectVideos(req, res) {
    try {
      const { project_id } = req.params;
      
      // 获取视频列表
      const videos = await VideoModel.getVideosByProject(project_id);
      
      // 获取统计信息
      const stats = await VideoModel.getVideoStats(project_id);

      // 为每个视频加载指标数据 (避免前端循环调用)
      const videosWithMetrics = await Promise.all(videos.map(async (video) => {
        const metrics = await VideoModel.getVideoMetrics(video.id);
        return {
          ...video,
          metrics: metrics
        };
      }));
      
      res.json({
        success: true,
        data: {
          summary: {
            total: parseInt(stats.total) || 0,
            downloaded: parseInt(stats.downloaded) || 0,
            downloading: parseInt(stats.downloading) || 0,
            pending: parseInt(stats.pending) || 0,
            failed: parseInt(stats.failed) || 0
          },
          videos: videosWithMetrics
        }
      });
    } catch (error) {
      console.error('获取视频列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取视频列表失败',
        error: error.message
      });
    }
  },

  // 获取单个视频详情
  async getVideoById(req, res) {
    try {
      const { video_id } = req.params;
      
      const video = await VideoModel.getVideoById(video_id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: '视频不存在'
        });
      }
      
      // 获取视频的指标数据
      const metrics = await VideoModel.getVideoMetrics(video_id);
      video.metrics = metrics;
      
      res.json({
        success: true,
        data: video
      });
    } catch (error) {
      console.error('获取视频详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取视频详情失败',
        error: error.message
      });
    }
  },

  // 更新视频状态
  async updateVideoStatus(req, res) {
    try {
      const { video_id } = req.params;
      const { status, ...additionalData } = req.body;
      
      await VideoModel.updateVideoStatus(video_id, status, additionalData);
      
      res.json({
        success: true,
        message: '视频状态更新成功'
      });
    } catch (error) {
      console.error('更新视频状态失败:', error);
      res.status(500).json({
        success: false,
        message: '更新视频状态失败',
        error: error.message
      });
    }
  },

  // 删除视频
  async deleteVideo(req, res) {
    try {
      const { video_id } = req.params;
      
      const affectedRows = await VideoModel.deleteVideo(video_id);
      
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '视频不存在'
        });
      }
      
      res.json({
        success: true,
        message: '视频删除成功'
      });
    } catch (error) {
      console.error('删除视频失败:', error);
      res.status(500).json({
        success: false,
        message: '删除视频失败',
        error: error.message
      });
    }
  },

  // 获取项目状态
  async getProjectStatus(req, res) {
    try {
      const { project_id } = req.params;
      
      const status = await ProjectModel.getProjectStatus(project_id);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          message: '项目不存在'
        });
      }
      
      // 计算预计剩余时间（简单估算）
      let estimatedTimeRemaining = null;
      if (status.current_step === 'video_download' && status.total_videos > 0) {
        const remaining = status.total_videos - status.downloaded_videos;
        if (remaining > 0) {
          // 假设每个视频平均下载需要30秒
          const seconds = remaining * 30;
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          
          if (hours > 0) {
            estimatedTimeRemaining = `${hours}h ${minutes % 60}m`;
          } else {
            estimatedTimeRemaining = `${minutes}m`;
          }
        }
      }
      
      res.json({
        success: true,
        data: {
          current_step: status.current_step,
          progress_percentage: status.progress_percentage || 0,
          estimated_time_remaining: estimatedTimeRemaining,
          total_videos: status.total_videos,
          downloaded_videos: status.downloaded_videos,
          failed_videos: status.failed_videos
        }
      });
    } catch (error) {
      console.error('获取项目状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取项目状态失败',
        error: error.message
      });
    }
  },

  // 开始视频打标
  async startVideoTagging(req, res) {
    try {
      const { video_id } = req.params;

      // 获取视频信息
      const video = await VideoModel.getVideoById(video_id);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: '视频不存在'
        });
      }

      // 检查视频是否已下载
      if (video.status !== 'ready') {
        return res.status(400).json({
          success: false,
          message: '视频尚未下载完成，无法进行打标'
        });
      }

      // 从数据库获取 API Key 和打标模式
      const { ApiConfigModel } = await import('../models/apiConfigModel.js');
      const apiConfig = await ApiConfigModel.getActiveApiConfig();
      
      if (!apiConfig || !apiConfig.api_key) {
        return res.status(400).json({
          success: false,
          message: '未配置 Gemini API Key，请先在设置页面配置'
        });
      }

      // 根据打标模式分流
      const taggingMode = apiConfig.tagging_mode || 'comparison';

      if (taggingMode === 'discovery') {
        await videoDiscovererService.addToQueue(video_id, video.project_id, apiConfig.api_key);
      } else {
        await videoTaggerService.addToQueue(video_id, video.project_id, apiConfig.api_key);
      }

      res.json({
        success: true,
        message: taggingMode === 'discovery' ? '视频已加入主动挖掘队列' : '视频已加入打标队列',
        data: {
          video_id,
          status: 'processing',
          tagging_mode: taggingMode
        }
      });
    } catch (error) {
      console.error('开始视频打标失败:', error);
      res.status(500).json({
        success: false,
        message: '开始视频打标失败',
        error: error.message
      });
    }
  },

  // 获取视频打标结果
  async getVideoTags(req, res) {
    try {
      const { video_id } = req.params;

      // 获取视频信息
      const video = await VideoModel.getVideoById(video_id);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: '视频不存在'
        });
      }

      // 获取标签：根据当前模式返回不同数据源
      const { ApiConfigModel } = await import('../models/apiConfigModel.js');
      const apiConfig = await ApiConfigModel.getActiveApiConfig();
      const taggingMode = apiConfig?.tagging_mode || 'comparison';

      const tags = taggingMode === 'discovery'
        ? await VideoModel.getVideoDiscoveryTags(video_id)
        : await VideoModel.getVideoTags(video_id);

      res.json({
        success: true,
        data: {
          video_id,
          ai_tagging_status: video.ai_tagging_status,
          ai_tagging_progress: video.ai_tagging_progress,
          ai_tagging_error: video.ai_tagging_error,
          tagging_mode: taggingMode,
          tags: tags
        }
      });
    } catch (error) {
      console.error('获取视频标签失败:', error);
      res.status(500).json({
        success: false,
        message: '获取视频标签失败',
        error: error.message
      });
    }
  },

  // 获取打标队列状态
  async getTaggingQueueStatus(req, res) {
    try {
      const comparison = videoTaggerService.getQueueStatus();
      const discovery = videoDiscovererService.getQueueStatus();
      res.json({
        success: true,
        data: {
          comparison,
          discovery
        }
      });
    } catch (error) {
      console.error('获取打标队列状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取打标队列状态失败',
        error: error.message
      });
    }
  }
};
