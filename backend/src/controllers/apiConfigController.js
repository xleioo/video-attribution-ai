import { ApiConfigModel } from '../models/apiConfigModel.js';

export const apiConfigController = {
  // 获取所有API配置
  async getAllApiConfigs(req, res) {
    try {
      const configs = await ApiConfigModel.getAllApiConfigs();
      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      console.error('获取API配置列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取API配置列表失败',
        error: error.message
      });
    }
  },

  // 根据配置名称获取
  async getApiConfigByName(req, res) {
    try {
      const { name } = req.params;
      const config = await ApiConfigModel.getApiConfigByName(name);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'API配置不存在'
        });
      }
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('获取API配置详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取API配置详情失败',
        error: error.message
      });
    }
  },

  // 获取活跃的API配置
  async getActiveApiConfig(req, res) {
    try {
      const config = await ApiConfigModel.getActiveApiConfig();
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '未找到活跃的API配置'
        });
      }
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('获取活跃API配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取活跃API配置失败',
        error: error.message
      });
    }
  },

  // 创建API配置
  async createApiConfig(req, res) {
    try {
      const configId = await ApiConfigModel.createApiConfig(req.body);
      const config = await ApiConfigModel.getApiConfigByName(req.body.config_name);
      
      res.status(201).json({
        success: true,
        message: 'API配置创建成功',
        data: config
      });
    } catch (error) {
      console.error('创建API配置失败:', error);
      res.status(500).json({
        success: false,
        message: '创建API配置失败',
        error: error.message
      });
    }
  },

  // 更新API配置
  async updateApiConfig(req, res) {
    try {
      const { id } = req.params;
      const affectedRows = await ApiConfigModel.updateApiConfig(id, req.body);
      
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'API配置不存在'
        });
      }
      
      const config = await ApiConfigModel.getApiConfigByName(req.body.config_name);
      res.json({
        success: true,
        message: 'API配置更新成功',
        data: config
      });
    } catch (error) {
      console.error('更新API配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新API配置失败',
        error: error.message
      });
    }
  },

  // 删除API配置
  async deleteApiConfig(req, res) {
    try {
      const { id } = req.params;
      const affectedRows = await ApiConfigModel.deleteApiConfig(id);
      
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'API配置不存在'
        });
      }
      
      res.json({
        success: true,
        message: 'API配置删除成功'
      });
    } catch (error) {
      console.error('删除API配置失败:', error);
      res.status(500).json({
        success: false,
        message: '删除API配置失败',
        error: error.message
      });
    }
  }
};
