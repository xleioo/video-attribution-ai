import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { VideoModel } from '../models/videoModel.js';
import { ProjectModel } from '../models/projectModel.js';

class VideoDownloaderService {
  constructor() {
    this.downloadQueue = [];
    this.isProcessing = false;
    this.concurrentDownloads = 3; // 同时下载数量
    this.storageBasePath = process.env.STORAGE_PATH || './storage';
  }

  // 添加下载任务到队列
  async addToQueue(projectId, videos) {
    console.log(`添加 ${videos.length} 个视频到下载队列 (项目 ${projectId})`);
    
    for (const video of videos) {
      this.downloadQueue.push({
        project_id: projectId,
        video_id: video.id,
        video_url: video.video_url
      });
    }

    // 启动处理
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // 处理下载队列
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    console.log(`开始处理下载队列，当前队列长度: ${this.downloadQueue.length}`);

    // 记录所有项目ID，用于最后更新状态
    const projectIds = new Set();

    while (this.downloadQueue.length > 0) {
      // 取出指定数量的任务并发下载
      const tasks = this.downloadQueue.splice(0, this.concurrentDownloads);
      
      // 记录项目ID
      tasks.forEach(task => projectIds.add(task.project_id));
      
      await Promise.all(
        tasks.map(task => this.downloadVideo(task).catch(err => {
          console.error(`下载视频失败 ${task.video_id}:`, err.message);
        }))
      );

      // 短暂延迟，避免请求过快
      await this.sleep(1000);
    }

    // 队列处理完成，最后更新所有项目的状态
    console.log('下载队列处理完成，更新项目状态...');
    for (const projectId of projectIds) {
      await this.updateProjectProgress(projectId);
    }

    this.isProcessing = false;
    console.log('✅ 所有下载任务完成');
  }

  // 下载单个视频
  async downloadVideo({ project_id, video_id, video_url }) {
    try {
      console.log(`开始下载视频: ${video_id}`);

      // 更新状态为下载中
      await VideoModel.updateVideoStatus(video_id, 'downloading', { progress: 0 });

      // 创建存储目录
      const projectDir = path.join(this.storageBasePath, `project_${project_id}`, 'videos');
      await fs.ensureDir(projectDir);

      // 确定文件扩展名
      const ext = this.getFileExtension(video_url) || '.mp4';
      const filename = `${video_id}${ext}`;
      const filepath = path.join(projectDir, filename);

      // 下载视频
      const response = await axios({
        method: 'GET',
        url: video_url,
        responseType: 'stream',
        timeout: 60000, // 60秒超时
        maxRedirects: 5
      });

      const totalLength = response.headers['content-length'];
      let downloadedLength = 0;

      // 创建写入流
      const writer = fs.createWriteStream(filepath);

      // 监听下载进度
      response.data.on('data', (chunk) => {
        downloadedLength += chunk.length;
        if (totalLength) {
          const progress = Math.floor((downloadedLength / totalLength) * 100);
          // 每10%更新一次进度
          if (progress % 10 === 0) {
            VideoModel.updateVideoProgress(video_id, progress).catch(err => {
              console.error('更新进度失败:', err);
            });
          }
        }
      });

      response.data.pipe(writer);

      // 等待下载完成
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // 获取文件大小
      const stats = await fs.stat(filepath);
      const fileSize = stats.size;

      // 相对路径
      const relativePath = path.join('project_' + project_id, 'videos', filename);

      // 标记为完成
      await VideoModel.markVideoReady(video_id, relativePath, fileSize);

      // 更新项目进度
      await this.updateProjectProgress(project_id);

      console.log(`✅ 视频下载完成: ${video_id} (${this.formatBytes(fileSize)})`);

    } catch (error) {
      console.error(`❌ 视频下载失败 ${video_id}:`, error.message);

      // 标记为失败
      await VideoModel.markVideoError(video_id, error.message);

      // 更新项目进度
      await this.updateProjectProgress(project_id);
    }
  }

  // 更新项目进度
  async updateProjectProgress(projectId) {
    try {
      const stats = await VideoModel.getVideoStats(projectId);
      const project = await ProjectModel.getProjectById(projectId);

      if (!project) return;

      const totalVideos = project.total_videos || 0;
      const downloadedVideos = parseInt(stats.downloaded) || 0;
      const failedVideos = parseInt(stats.failed) || 0;
      const downloadingVideos = parseInt(stats.downloading) || 0;
      const pendingVideos = parseInt(stats.pending) || 0;

      let progress_percentage = 0;
      if (totalVideos > 0) {
        progress_percentage = Math.floor((downloadedVideos / totalVideos) * 100);
      }

      // 判断当前步骤
      let current_step = project.current_step;
      
      // 检查是否所有视频都已处理完成（没有pending和downloading状态的视频）
      const allProcessed = downloadingVideos === 0 && pendingVideos === 0;
      
      if (allProcessed && downloadedVideos + failedVideos === totalVideos) {
        // 所有视频处理完成
        if (downloadedVideos > 0) {
          current_step = 'ai_tagging'; // 进入下一步：AI打标
          console.log(`✅ 项目 ${projectId} 所有视频下载完成，进入AI打标阶段`);
        } else {
          // 全部失败的情况
          console.log(`⚠️ 项目 ${projectId} 所有视频下载失败`);
        }
      }

      await ProjectModel.updateProjectProgress(projectId, {
        current_step,
        progress_percentage,
        downloaded_videos: downloadedVideos,
        failed_videos: failedVideos
      });

      console.log(`📊 项目 ${projectId} 进度更新: ${progress_percentage}% (${downloadedVideos}/${totalVideos}), 状态: ${current_step}`);

    } catch (error) {
      console.error('更新项目进度失败:', error);
    }
  }

  // 获取文件扩展名
  getFileExtension(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const ext = path.extname(pathname);
      return ext || null;
    } catch {
      return null;
    }
  }

  // 格式化文件大小
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // 延迟函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取队列状态
  getQueueStatus() {
    return {
      queue_length: this.downloadQueue.length,
      is_processing: this.isProcessing
    };
  }
}

// 导出单例
const videoDownloaderService = new VideoDownloaderService();
export default videoDownloaderService;
