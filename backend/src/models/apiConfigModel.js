import pool from '../config/database.js';

export const ApiConfigModel = {
  // 获取所有API配置
  async getAllApiConfigs() {
    const [rows] = await pool.query(
      'SELECT * FROM api_configs ORDER BY created_at DESC'
    );
    return rows;
  },

  // 根据配置名称获取
  async getApiConfigByName(configName) {
    const [rows] = await pool.query(
      'SELECT * FROM api_configs WHERE config_name = ?',
      [configName]
    );
    return rows[0];
  },

  // 创建API配置
  async createApiConfig(configData) {
    const { config_name, api_key, api_endpoint, provider = 'gemini', is_active = true, tagging_mode = 'comparison' } = configData;
    const [result] = await pool.query(
      'INSERT INTO api_configs (config_name, api_key, api_endpoint, provider, is_active, tagging_mode) VALUES (?, ?, ?, ?, ?, ?)',
      [config_name, api_key, api_endpoint, provider, is_active, tagging_mode]
    );
    return result.insertId;
  },

  // 更新API配置
  async updateApiConfig(id, configData) {
    const { config_name, api_key, api_endpoint, provider, is_active, tagging_mode } = configData;
    const [result] = await pool.query(
      'UPDATE api_configs SET config_name = ?, api_key = ?, api_endpoint = ?, provider = ?, is_active = ?, tagging_mode = ? WHERE id = ?',
      [config_name, api_key, api_endpoint, provider, is_active, tagging_mode, id]
    );
    return result.affectedRows;
  },

  // 删除API配置
  async deleteApiConfig(id) {
    const [result] = await pool.query(
      'DELETE FROM api_configs WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  },

  // 获取活跃的API配置
  async getActiveApiConfig() {
    const [rows] = await pool.query(
      'SELECT * FROM api_configs WHERE is_active = true LIMIT 1'
    );
    return rows[0];
  }
};
