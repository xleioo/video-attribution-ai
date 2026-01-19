import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 标签分类数据（来自 constants.ts）
const TAG_CATEGORIES = [
  {
    id: 'content_format',
    name: '内容形式标签',
    tags: ['榜单推荐', 'Vlog日常', '教程/手法', '开箱测评', '直播剪辑'],
    sort_order: 1
  },
  {
    id: 'protagonist_persona',
    name: '主角人设标签',
    tags: ['品牌官方', '学生少女', '宝妈人群', '专业人士', '素人真实'],
    sort_order: 2
  },
  {
    id: 'scene_visual',
    name: '场景画面标签',
    tags: ['亲子家庭', '健身运动', '外出逛街', '家居梳妆'],
    sort_order: 3
  },
  {
    id: 'presentation_method',
    name: '呈现手法标签',
    tags: ['使用过程', '数据/成分', '包装展示', '对比展示', '气氛营造'],
    sort_order: 4
  },
  {
    id: 'efficacy_appeal',
    name: '功效诉求标签',
    tags: ['抗老紧致', '高性价比', '淡纹抚皱', '提亮焕肤', '淡黑眼圈'],
    sort_order: 5
  },
  {
    id: 'tone_mood_tags',
    name: '情绪语气标签',
    tags: ['种草安利', '仪式精致', '急迫稀缺', '真实亲测'],
    sort_order: 6
  },
  {
    id: 'visual_subject',
    name: '画面主体',
    tags: ['面部特写/按摩演示', '质地/包装特写', '纯产品静物', '多人/亲子互动', '运动健身场景', '户外街拍'],
    sort_order: 7
  },
  {
    id: 'content_strategy',
    name: '内容策略',
    tags: ['专业人士背书', '素人体验故事', 'Vlog生活记录', '开箱测评', '步骤教学演示', '成分/数据论证', '前后对比', '价格促销钩子', '紧迫稀缺提醒'],
    sort_order: 8
  },
  {
    id: 'tone_mood',
    name: '情绪语气',
    tags: ['真实亲测口吻', '仪式/疗愈氛围', '紧张倒计时'],
    sort_order: 9
  },
  {
    id: 'efficacy_audience',
    name: '功效诉求与人群',
    tags: ['眼部/淡黑眼圈', '抗垮提拉', '淡纹抚皱', '提亮焕肤', '宝妈人群'],
    sort_order: 10
  }
];

async function initTags() {
  let connection;
  
  try {
    console.log('🔄 开始初始化标签数据...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'short_video_attribution',
    });
    
    console.log('✅ 已连接到数据库');
    
    // 检查是否已有数据
    const [existingCategories] = await connection.query(
      'SELECT COUNT(*) as count FROM tag_categories'
    );
    
    if (existingCategories[0].count > 0) {
      console.log(`\n⚠️  数据库中已有 ${existingCategories[0].count} 个标签分类`);
      console.log('是否要清空并重新初始化？(y/n)');
      
      // 在脚本中，我们默认跳过
      console.log('跳过初始化（数据已存在）\n');
      return;
    }
    
    // 插入标签分类和标签
    for (const category of TAG_CATEGORIES) {
      // 插入分类
      await connection.query(
        'INSERT INTO tag_categories (id, name, sort_order) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)',
        [category.id, category.name, category.sort_order]
      );
      
      console.log(`  ✅ 创建分类: ${category.name}`);
      
      // 插入该分类下的标签
      for (let i = 0; i < category.tags.length; i++) {
        await connection.query(
          'INSERT INTO tags (category_id, name, sort_order) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)',
          [category.id, category.tags[i], i]
        );
      }
      
      console.log(`     添加了 ${category.tags.length} 个标签`);
    }
    
    console.log('\n✨ 标签数据初始化完成！');
    console.log(`   总共创建了 ${TAG_CATEGORIES.length} 个分类\n`);
    
  } catch (error) {
    console.error('\n❌ 初始化失败:', error.message);
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
initTags();
