import pool from '../config/database.js';

export const VideoModel = {
  // 创建视频记录
  async createVideo(videoData) {
    const { id, project_id, video_url, title, status = 'pending' } = videoData;
    const [result] = await pool.query(
      'INSERT INTO videos (id, project_id, video_url, title, status) VALUES (?, ?, ?, ?, ?)',
      [id, project_id, video_url, title || null, status]
    );
    return result.insertId;
  },

  // 批量创建视频记录
  async createVideos(videos) {
    if (videos.length === 0) return [];
    
    const values = videos.map(v => [v.id, v.project_id, v.video_url, v.title || null, v.status || 'pending']);
    const placeholders = videos.map(() => '(?, ?, ?, ?, ?)').join(',');
    
    await pool.query(
      `INSERT INTO videos (id, project_id, video_url, title, status) VALUES ${placeholders}`,
      values.flat()
    );
    
    return videos.map(v => v.id);
  },

  // 获取项目的所有视频
  async getVideosByProject(projectId) {
    const [rows] = await pool.query(
      'SELECT * FROM videos WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
    return rows;
  },

  // 获取视频统计信息
  async getVideoStats(projectId) {
    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as downloaded,
        SUM(CASE WHEN status = 'downloading' THEN 1 ELSE 0 END) as downloading,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed
      FROM videos WHERE project_id = ?`,
      [projectId]
    );
    return rows[0];
  },

  // 根据ID获取视频
  async getVideoById(videoId) {
    const [rows] = await pool.query(
      'SELECT * FROM videos WHERE id = ?',
      [videoId]
    );
    return rows[0];
  },

  // 更新视频状态
  async updateVideoStatus(videoId, status, additionalData = {}) {
    const updates = { status, ...additionalData, updated_at: new Date() };
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), videoId];
    
    await pool.query(
      `UPDATE videos SET ${fields} WHERE id = ?`,
      values
    );
  },

  // 更新视频下载进度
  async updateVideoProgress(videoId, progress) {
    await pool.query(
      'UPDATE videos SET progress = ?, updated_at = NOW() WHERE id = ?',
      [progress, videoId]
    );
  },

  // 标记视频下载完成
  async markVideoReady(videoId, localPath, fileSize, duration = null) {
    await pool.query(
      `UPDATE videos SET 
        status = 'ready', 
        local_path = ?, 
        file_size = ?,
        duration = ?,
        progress = 100,
        updated_at = NOW() 
      WHERE id = ?`,
      [localPath, fileSize, duration, videoId]
    );
  },

  // 标记视频下载失败
  async markVideoError(videoId, errorMessage) {
    await pool.query(
      `UPDATE videos SET 
        status = 'error', 
        error_message = ?,
        updated_at = NOW() 
      WHERE id = ?`,
      [errorMessage, videoId]
    );
  },

  // 删除视频
  async deleteVideo(videoId) {
    const [result] = await pool.query(
      'DELETE FROM videos WHERE id = ?',
      [videoId]
    );
    return result.affectedRows;
  },

  // 保存视频指标
  async saveVideoMetric(videoId, projectId, metricName, metricValue) {
    await pool.query(
      `INSERT INTO video_metrics (video_id, project_id, metric_name, metric_value) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE metric_value = VALUES(metric_value)`,
      [videoId, projectId, metricName, metricValue]
    );
  },

  // 批量保存视频指标
  async saveVideoMetrics(metrics) {
    if (metrics.length === 0) return;
    
    const values = metrics.map(m => [m.video_id, m.project_id, m.metric_name, m.metric_value]);
    const placeholders = metrics.map(() => '(?, ?, ?, ?)').join(',');
    
    await pool.query(
      `INSERT INTO video_metrics (video_id, project_id, metric_name, metric_value) 
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE metric_value = VALUES(metric_value)`,
      values.flat()
    );
  },

  // 获取视频的所有指标
  async getVideoMetrics(videoId) {
    const [rows] = await pool.query(
      'SELECT metric_name, metric_value FROM video_metrics WHERE video_id = ?',
      [videoId]
    );
    return rows;
  },

  // 更新视频AI打标状态
  async updateVideoTaggingStatus(videoId, status, progress = 0, errorMessage = null) {
    await pool.query(
      'UPDATE videos SET ai_tagging_status = ?, ai_tagging_progress = ?, ai_tagging_error = ?, updated_at = NOW() WHERE id = ?',
      [status, progress, errorMessage, videoId]
    );
  },

  // 删除视频的所有标签
  async deleteVideoTags(videoId) {
    await pool.query('DELETE FROM video_tags WHERE video_id = ?', [videoId]);
  },

  // 批量保存视频标签
  async saveVideoTags(tags) {
    if (tags.length === 0) return;
    
    const values = tags.map(t => [
      t.video_id,
      t.project_id,
      t.tag_category_id,
      t.tag_name,
      t.confidence !== undefined ? t.confidence : 1.0  // 修复：0.0 也是有效值
    ]);
    const placeholders = tags.map(() => '(?, ?, ?, ?, ?)').join(',');
    
    await pool.query(
      `INSERT INTO video_tags (video_id, project_id, tag_category_id, tag_name, confidence) 
       VALUES ${placeholders}`,
      values.flat()
    );
  },

  // 获取视频的所有标签
  async getVideoTags(videoId) {
    const [rows] = await pool.query(
      `SELECT vt.*, tc.name as category_name 
       FROM video_tags vt
       LEFT JOIN tag_categories tc ON vt.tag_category_id = tc.id
       WHERE vt.video_id = ?
       ORDER BY tc.sort_order, vt.tag_name`,
      [videoId]
    );
    return rows;
  },

  // 保存视频的叙事类分析结果
  async saveVideoNarratives(videoId, narratives = {}) {
    const updates = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(narratives, 'first5s_analysis')) {
      updates.push('first5s_analysis = ?');
      const value = narratives.first5s_analysis
        ? JSON.stringify(narratives.first5s_analysis)
        : null;
      values.push(value);
    }

    if (Object.prototype.hasOwnProperty.call(narratives, 'video_summary')) {
      updates.push('video_summary = ?');
      const value = narratives.video_summary
        ? JSON.stringify(narratives.video_summary)
        : null;
      values.push(value);
    }

    if (updates.length === 0) return;

    const setSql = `${updates.join(', ')}, updated_at = NOW()`;
    await pool.query(
      `UPDATE videos SET ${setSql} WHERE id = ?`,
      [...values, videoId]
    );
  },
  // -----------------------------
  // 主动挖掘（Discovery）相关
  // -----------------------------

  // 清空某个视频的主动挖掘标签
  async deleteVideoDiscoveryTags(videoId) {
    await pool.query('DELETE FROM video_discovery_tags WHERE video_id = ?', [videoId]);
  },

  // 批量保存视频主动挖掘标签（只保存“发现到”的标签）
  async saveVideoDiscoveryTags(tags) {
    if (!tags || tags.length === 0) return;
    const values = tags.map(t => [t.video_id, t.project_id, t.category_name, t.tag_name]);
    const placeholders = tags.map(() => '(?, ?, ?, ?)').join(',');

    await pool.query(
      `INSERT INTO video_discovery_tags (video_id, project_id, category_name, tag_name)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE created_at = created_at`,
      values.flat()
    );
  },

  // 获取某个视频的主动挖掘标签
  async getVideoDiscoveryTags(videoId) {
    const [rows] = await pool.query(
      `SELECT vdt.*
       FROM video_discovery_tags vdt
       WHERE vdt.video_id = ?
       ORDER BY vdt.category_name, vdt.tag_name`,
      [videoId]
    );
    return rows;
  },

  // 获取某个项目所有视频的主动挖掘标签（用于项目汇总）
  async getDiscoveryTagsByProject(projectId) {
    const [rows] = await pool.query(
      `SELECT vdt.*
       FROM video_discovery_tags vdt
       WHERE vdt.project_id = ?
       ORDER BY vdt.video_id, vdt.category_name, vdt.tag_name`,
      [projectId]
    );
    return rows;
  },

  // 项目级汇总标签：清空
  async deleteProjectDiscoveryTags(projectId) {
    await pool.query('DELETE FROM project_discovery_tags WHERE project_id = ?', [projectId]);
  },

  // 项目级汇总标签：批量保存
  async saveProjectDiscoveryTags(projectId, tags) {
    if (!tags || tags.length === 0) return;
    const values = tags.map(t => [
      projectId,
      t.category_name,
      t.tag_name,
      t.aliases_json ? JSON.stringify(t.aliases_json) : null
    ]);
    const placeholders = tags.map(() => '(?, ?, ?, ?)').join(',');

    await pool.query(
      `INSERT INTO project_discovery_tags (project_id, category_name, tag_name, aliases_json)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE aliases_json = VALUES(aliases_json), updated_at = NOW()`,
      values.flat()
    );
  },

  // 项目级汇总标签：查询
  async getProjectDiscoveryTags(projectId) {
    const [rows] = await pool.query(
      `SELECT * FROM project_discovery_tags
       WHERE project_id = ?
       ORDER BY category_name, tag_name`,
      [projectId]
    );
    return rows;
  },

  // 项目汇总状态：更新/初始化
  async updateProjectDiscoverySummary(projectId, status, progress = 0, errorMessage = null) {
    await pool.query(
      `INSERT INTO project_discovery_summary (project_id, status, progress, error_message)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), progress = VALUES(progress), error_message = VALUES(error_message), updated_at = NOW()`,
      [projectId, status, progress, errorMessage]
    );
  },

  async getProjectDiscoverySummary(projectId) {
    const [rows] = await pool.query(
      `SELECT * FROM project_discovery_summary WHERE project_id = ?`,
      [projectId]
    );
    return rows[0] || null;
  }
};
