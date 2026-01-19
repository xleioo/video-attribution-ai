import express from 'express';
import { videoController } from '../controllers/videoController.js';

const router = express.Router();

// 视频相关路由
router.get('/projects/:project_id/videos', videoController.getProjectVideos);
router.get('/videos/:video_id', videoController.getVideoById);
router.put('/videos/:video_id/status', videoController.updateVideoStatus);
router.delete('/videos/:video_id', videoController.deleteVideo);

// 项目状态路由
router.get('/projects/:project_id/status', videoController.getProjectStatus);

// 视频打标相关
router.post('/videos/:video_id/tag', videoController.startVideoTagging);
router.get('/videos/:video_id/tags', videoController.getVideoTags);
router.get('/tagging-queue/status', videoController.getTaggingQueueStatus);

export default router;
