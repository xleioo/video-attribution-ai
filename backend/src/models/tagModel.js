import pool from '../config/database.js';

export const TagModel = {
  // 获取所有标签分类
  async getAllTagCategories() {
    const [categories] = await pool.query(
      'SELECT * FROM tag_categories ORDER BY sort_order, id'
    );
    
    // 获取每个分类下的标签
    for (let category of categories) {
      const [tags] = await pool.query(
        'SELECT name FROM tags WHERE category_id = ? ORDER BY sort_order, id',
        [category.id]
      );
      category.tags = tags.map(t => t.name);
    }
    
    return categories;
  },

  // 根据ID获取标签分类
  async getTagCategoryById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM tag_categories WHERE id = ?',
      [id]
    );
    
    if (rows.length > 0) {
      const [tags] = await pool.query(
        'SELECT name FROM tags WHERE category_id = ? ORDER BY sort_order, id',
        [id]
      );
      rows[0].tags = tags.map(t => t.name);
    }
    
    return rows[0];
  },

  // 创建标签分类
  async createTagCategory(categoryData) {
    const { id, name, tags = [], sort_order = 0 } = categoryData;
    const [result] = await pool.query(
      'INSERT INTO tag_categories (id, name, sort_order) VALUES (?, ?, ?)',
      [id, name, sort_order]
    );
    
    // 插入标签
    if (tags.length > 0) {
      for (let i = 0; i < tags.length; i++) {
        await pool.query(
          'INSERT INTO tags (category_id, name, sort_order) VALUES (?, ?, ?)',
          [id, tags[i], i]
        );
      }
    }
    
    return result.insertId;
  },

  // 更新标签分类
  async updateTagCategory(id, categoryData) {
    const { name, tags, sort_order } = categoryData;
    
    // 更新分类信息
    await pool.query(
      'UPDATE tag_categories SET name = ?, sort_order = ? WHERE id = ?',
      [name, sort_order, id]
    );
    
    // 删除旧标签
    await pool.query('DELETE FROM tags WHERE category_id = ?', [id]);
    
    // 插入新标签
    if (tags && tags.length > 0) {
      for (let i = 0; i < tags.length; i++) {
        await pool.query(
          'INSERT INTO tags (category_id, name, sort_order) VALUES (?, ?, ?)',
          [id, tags[i], i]
        );
      }
    }
    
    return true;
  },

  // 删除标签分类
  async deleteTagCategory(id) {
    // 先删除该分类下的所有标签
    await pool.query('DELETE FROM tags WHERE category_id = ?', [id]);
    
    // 再删除分类
    const [result] = await pool.query(
      'DELETE FROM tag_categories WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  },

  // 获取所有标签分类及其标签（用于AI分析）
  async getAllTagCategoriesWithTags() {
    const [categories] = await pool.query(
      'SELECT id, name FROM tag_categories ORDER BY sort_order, id'
    );
    
    const result = [];
    for (let category of categories) {
      const [tags] = await pool.query(
        'SELECT name FROM tags WHERE category_id = ? ORDER BY sort_order, id',
        [category.id]
      );
      result.push({
        id: category.id,
        name: category.name,
        tags: tags.map(t => t.name)
      });
    }
    
    return result;
  }
};
