import express from 'express';
import { apiConfigController } from '../controllers/apiConfigController.js';

const router = express.Router();

// API配置相关路由
router.get('/', apiConfigController.getAllApiConfigs);
router.get('/active', apiConfigController.getActiveApiConfig);
router.get('/:name', apiConfigController.getApiConfigByName);
router.post('/', apiConfigController.createApiConfig);
router.put('/:id', apiConfigController.updateApiConfig);
router.delete('/:id', apiConfigController.deleteApiConfig);

export default router;
