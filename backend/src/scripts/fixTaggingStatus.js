import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixTaggingStatus() {
  let connection;
  
  try {
    console.log('🔄 开始修复 AI 打标状态字段...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'short_video_attribution',
    });
    
    console.log('✅ 已连接到数据库');
    
    // 1. 检查当前状态
    const [beforeStats] = await connection.query(`
      SELECT 
        ai_tagging_status,
        COUNT(*) as count
      FROM videos
      GROUP BY ai_tagging_status
    `);
    
    console.log('\n修复前的状态分布：');
    console.table(beforeStats);
    
    // 2. 将所有状态为 'pending' 且没有标签数据的视频改为 NULL
    // （这些视频从未被用户点击打标，不应该显示为 pending）
    const [result1] = await connection.query(`
      UPDATE videos v
      LEFT JOIN video_tags vt ON v.id = vt.video_id
      SET v.ai_tagging_status = NULL,
          v.ai_tagging_progress = 0
      WHERE v.ai_tagging_status = 'pending' 
      AND vt.video_id IS NULL
    `);
    
    console.log(`\n✅ 清理了 ${result1.affectedRows} 个从未打标的视频（pending → NULL）`);
    
    // 3. 修改字段定义：允许 NULL，默认值改为 NULL
    try {
      await connection.query(`
        ALTER TABLE videos 
        MODIFY COLUMN ai_tagging_status ENUM('processing','completed','error') DEFAULT NULL COMMENT 'AI标签分析状态：NULL=未开始，processing=处理中，completed=已完成，error=失败'
      `);
      console.log('✅ 修改 ai_tagging_status 字段：移除 pending，默认值改为 NULL');
    } catch (error) {
      console.error('❌ 修改字段失败:', error.message);
    }
    
    // 4. 检查修复后的状态
    const [afterStats] = await connection.query(`
      SELECT 
        COALESCE(ai_tagging_status, 'NULL') as ai_tagging_status,
        COUNT(*) as count
      FROM videos
      GROUP BY ai_tagging_status
    `);
    
    console.log('\n修复后的状态分布：');
    console.table(afterStats);
    
    // 5. 显示示例视频
    const [samples] = await connection.query(`
      SELECT 
        id, 
        title,
        status,
        COALESCE(ai_tagging_status, 'NULL') as ai_tagging_status,
        ai_tagging_progress,
        (SELECT COUNT(*) FROM video_tags WHERE video_id = videos.id) as tag_count
      FROM videos
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n示例视频状态：');
    console.table(samples);
    
    console.log('\n✨ AI 打标状态字段修复完成！');
    console.log('\n业务逻辑说明：');
    console.log('  NULL         = 视频已下载，但用户未发起打标');
    console.log('  processing   = 用户已点击打标，正在处理中（需要轮询）');
    console.log('  completed    = 打标完成（不需要轮询）');
    console.log('  error        = 打标失败');
    
  } catch (error) {
    console.error('\n❌ 修复失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭\n');
    }
  }
}

// 执行修复
fixTaggingStatus();
