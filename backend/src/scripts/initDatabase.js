import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 初始标签数据
const INITIAL_TAG_TAXONOMY = [
  {
    id: 'content_format',
    name: '内容形式标签',
    tags: ['榜单推荐', 'Vlog日常', '教程/手法', '开箱测评', '直播剪辑']
  },
  {
    id: 'protagonist_persona',
    name: '主角人设标签',
    tags: ['品牌官方', '学生少女', '宝妈人群', '专业人士', '素人真实']
  },
  {
    id: 'scene_visual',
    name: '场景画面标签',
    tags: ['亲子家庭', '健身运动', '外出逛街', '家居梳妆']
  },
  {
    id: 'presentation_method',
    name: '呈现手法标签',
    tags: ['使用过程', '数据/成分', '包装展示', '对比展示', '气氛营造']
  },
  {
    id: 'efficacy_appeal',
    name: '功效诉求标签',
    tags: ['抗老紧致', '高性价比', '淡纹抚皱', '提亮焕肤', '淡黑眼圈']
  },
  {
    id: 'tone_mood_tags',
    name: '情绪语气标签',
    tags: ['种草安利', '仪式精致', '急迫稀缺', '真实亲测']
  },
  {
    id: 'visual_subject',
    name: '画面主体',
    tags: ['面部特写/按摩演示', '质地/包装特写', '纯产品静物', '多人/亲子互动', '运动健身场景', '户外街拍']
  },
  {
    id: 'content_strategy',
    name: '内容策略',
    tags: ['专业人士背书', '素人体验故事', 'Vlog生活记录', '开箱测评', '步骤教学演示', '成分/数据论证', '前后对比', '价格促销钩子', '紧迫稀缺提醒']
  },
  {
    id: 'tone_mood',
    name: '情绪语气',
    tags: ['真实亲测口吻', '仪式/疗愈氛围', '紧张倒计时']
  },
  {
    id: 'efficacy_audience',
    name: '功效诉求与人群',
    tags: ['眼部/淡黑眼圈', '抗垮提拉', '淡纹抚皱', '提亮焕肤', '宝妈人群']
  }
];

async function initDatabase() {
  let connection;
  
  try {
    console.log('🔄 开始初始化数据库...\n');
    
    // 创建连接（不指定数据库）
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
    });
    
    console.log('✅ 已连接到MySQL服务器');
    
    // 创建数据库
    const dbName = process.env.DB_NAME || 'short_video_attribution';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 '${dbName}' 已创建或已存在`);
    
    // 选择数据库
    await connection.query(`USE ${dbName}`);
    
    // 创建项目表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 projects 已创建');
    
    // 创建标签分类表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tag_categories (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sort_order (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 tag_categories 已创建');
    
    // 创建标签表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES tag_categories(id) ON DELETE CASCADE,
        INDEX idx_category (category_id),
        INDEX idx_sort_order (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 tags 已创建');
    
    // 创建API配置表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS api_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_name VARCHAR(100) NOT NULL UNIQUE,
        api_key TEXT NOT NULL,
        api_endpoint VARCHAR(500),
        provider VARCHAR(50) DEFAULT 'gemini',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_config_name (config_name),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 api_configs 已创建');
    
    // 插入初始标签数据
    console.log('\n🔄 开始插入初始标签数据...');
    for (let i = 0; i < INITIAL_TAG_TAXONOMY.length; i++) {
      const category = INITIAL_TAG_TAXONOMY[i];
      
      // 检查分类是否已存在
      const [existing] = await connection.query(
        'SELECT id FROM tag_categories WHERE id = ?',
        [category.id]
      );
      
      if (existing.length === 0) {
        // 插入分类
        await connection.query(
          'INSERT INTO tag_categories (id, name, sort_order) VALUES (?, ?, ?)',
          [category.id, category.name, i]
        );
        
        // 插入标签
        for (let j = 0; j < category.tags.length; j++) {
          await connection.query(
            'INSERT INTO tags (category_id, name, sort_order) VALUES (?, ?, ?)',
            [category.id, category.tags[j], j]
          );
        }
        
        console.log(`  ✅ 已插入分类: ${category.name} (${category.tags.length}个标签)`);
      } else {
        console.log(`  ⏭️  分类已存在: ${category.name}`);
      }
    }
    
    // 插入示例项目数据
    console.log('\n🔄 检查并插入示例项目...');
    const [projects] = await connection.query('SELECT COUNT(*) as count FROM projects');
    if (projects[0].count === 0) {
      await connection.query(
        'INSERT INTO projects (name, description, status) VALUES (?, ?, ?)',
        ['示例项目', '这是一个示例项目，用于演示系统功能', 'active']
      );
      console.log('  ✅ 已插入示例项目');
    } else {
      console.log('  ⏭️  项目表已有数据，跳过示例项目插入');
    }
    
    console.log('\n✨ 数据库初始化完成！\n');
    
  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭\n');
    }
  }
}

// 执行初始化
initDatabase();
