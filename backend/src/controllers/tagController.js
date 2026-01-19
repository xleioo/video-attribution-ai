import { TagModel } from '../models/tagModel.js';

export const tagController = {
  // 获取所有标签分类
  async getAllTagCategories(req, res) {
    try {
      const categories = await TagModel.getAllTagCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('获取标签分类失败:', error);
      res.status(500).json({
        success: false,
        message: '获取标签分类失败',
        error: error.message
      });
    }
  },

  // 根据ID获取标签分类
  async getTagCategoryById(req, res) {
    try {
      const { id } = req.params;
      const category = await TagModel.getTagCategoryById(id);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: '标签分类不存在'
        });
      }
      
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('获取标签分类详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取标签分类详情失败',
        error: error.message
      });
    }
  },

  // 创建标签分类
  async createTagCategory(req, res) {
    try {
      await TagModel.createTagCategory(req.body);
      const category = await TagModel.getTagCategoryById(req.body.id);
      
      res.status(201).json({
        success: true,
        message: '标签分类创建成功',
        data: category
      });
    } catch (error) {
      console.error('创建标签分类失败:', error);
      res.status(500).json({
        success: false,
        message: '创建标签分类失败',
        error: error.message
      });
    }
  },

  // 更新标签分类
  async updateTagCategory(req, res) {
    try {
      const { id } = req.params;
      await TagModel.updateTagCategory(id, req.body);
      const category = await TagModel.getTagCategoryById(id);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: '标签分类不存在'
        });
      }
      
      res.json({
        success: true,
        message: '标签分类更新成功',
        data: category
      });
    } catch (error) {
      console.error('更新标签分类失败:', error);
      res.status(500).json({
        success: false,
        message: '更新标签分类失败',
        error: error.message
      });
    }
  },

  // 删除标签分类
  async deleteTagCategory(req, res) {
    try {
      const { id } = req.params;
      const affectedRows = await TagModel.deleteTagCategory(id);
      
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '标签分类不存在'
        });
      }
      
      res.json({
        success: true,
        message: '标签分类删除成功'
      });
    } catch (error) {
      console.error('删除标签分类失败:', error);
      res.status(500).json({
        success: false,
        message: '删除标签分类失败',
        error: error.message
      });
    }
  }
};
