import express from 'express';
import { tagController } from '../controllers/tagController.js';

const router = express.Router();

// 标签分类相关路由
router.get('/', tagController.getAllTagCategories);
router.get('/:id', tagController.getTagCategoryById);
router.post('/', tagController.createTagCategory);
router.put('/:id', tagController.updateTagCategory);
router.delete('/:id', tagController.deleteTagCategory);

export default router;
