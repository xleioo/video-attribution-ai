import { ProjectModel } from '../models/projectModel.js';

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

  // 创建项目
  async createProject(req, res) {
    try {
      const projectId = await ProjectModel.createProject(req.body);
      const project = await ProjectModel.getProjectById(projectId);
      
      res.status(201).json({
        success: true,
        message: '项目创建成功',
        data: project
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
