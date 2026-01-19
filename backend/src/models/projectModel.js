import pool from '../config/database.js';

export const ProjectModel = {
  // 获取所有项目
  async getAllProjects() {
    const [rows] = await pool.query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
    return rows;
  },

  // 根据ID获取项目
  async getProjectById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // 创建项目
  async createProject(projectData) {
    const { 
      name, 
      description, 
      status = 'active',
      column_mapping = null,
      current_step = 'ingestion',
      total_videos = 0
    } = projectData;
    
    const [result] = await pool.query(
      `INSERT INTO projects 
       (name, description, status, column_mapping, current_step, total_videos) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, status, JSON.stringify(column_mapping), current_step, total_videos]
    );
    return result.insertId;
  },

  // 更新项目
  async updateProject(id, projectData) {
    const { name, description, status } = projectData;
    const [result] = await pool.query(
      'UPDATE projects SET name = ?, description = ?, status = ? WHERE id = ?',
      [name, description, status, id]
    );
    return result.affectedRows;
  },

  // 删除项目
  async deleteProject(id) {
    const [result] = await pool.query(
      'DELETE FROM projects WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  },

  // 更新项目进度
  async updateProjectProgress(id, progressData) {
    const { 
      current_step, 
      progress_percentage, 
      downloaded_videos, 
      failed_videos 
    } = progressData;
    
    const updates = [];
    const values = [];
    
    if (current_step !== undefined) {
      updates.push('current_step = ?');
      values.push(current_step);
    }
    if (progress_percentage !== undefined) {
      updates.push('progress_percentage = ?');
      values.push(progress_percentage);
    }
    if (downloaded_videos !== undefined) {
      updates.push('downloaded_videos = ?');
      values.push(downloaded_videos);
    }
    if (failed_videos !== undefined) {
      updates.push('failed_videos = ?');
      values.push(failed_videos);
    }
    
    if (updates.length === 0) return 0;
    
    values.push(id);
    const [result] = await pool.query(
      `UPDATE projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    return result.affectedRows;
  },

  // 获取项目状态
  async getProjectStatus(id) {
    const [rows] = await pool.query(
      `SELECT 
        current_step, 
        progress_percentage, 
        total_videos, 
        downloaded_videos, 
        failed_videos 
       FROM projects WHERE id = ?`,
      [id]
    );
    return rows[0];
  }
};
