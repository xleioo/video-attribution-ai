import express from 'express';
import { projectController } from '../controllers/projectController.js';

const router = express.Router();

// 项目相关路由
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.get('/:id/download', projectController.downloadProjectData);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

export default router;
