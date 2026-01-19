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
    const { name, description, status = 'active' } = projectData;
    const [result] = await pool.query(
      'INSERT INTO projects (name, description, status) VALUES (?, ?, ?)',
      [name, description, status]
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
  }
};
