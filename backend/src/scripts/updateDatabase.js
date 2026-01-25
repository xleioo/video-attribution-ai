import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateDatabase() {
  let connection;
  
  try {
    console.log('🔄 开始更新数据库结构...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'short_video_attribution',
    });
    
    console.log('✅ 已连接到数据库');
    
    // 1. 更新 projects 表，添加更多字段（检查列是否存在）
    const columnsToAdd = [
      { name: 'column_mapping', sql: "ADD COLUMN column_mapping JSON COMMENT '字段映射配置'" },
      { name: 'current_step', sql: "ADD COLUMN current_step ENUM('ingestion', 'video_download', 'ai_tagging', 'modeling', 'completed') DEFAULT 'ingestion' COMMENT '当前处理步骤'" },
      { name: 'progress_percentage', sql: "ADD COLUMN progress_percentage INT DEFAULT 0 COMMENT '进度百分比'" },
      { name: 'total_videos', sql: "ADD COLUMN total_videos INT DEFAULT 0 COMMENT '总视频数'" },
      { name: 'downloaded_videos', sql: "ADD COLUMN downloaded_videos INT DEFAULT 0 COMMENT '已下载视频数'" },
      { name: 'failed_videos', sql: "ADD COLUMN failed_videos INT DEFAULT 0 COMMENT '下载失败视频数'" }
    ];
    
    for (const col of columnsToAdd) {
      try {
        // 检查列是否存在
        const [columns] = await connection.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects' AND COLUMN_NAME = ?",
          [process.env.DB_NAME || 'short_video_attribution', col.name]
        );
        
        if (columns.length === 0) {
          await connection.query(`ALTER TABLE projects ${col.sql}`);
          console.log(`  ✅ 添加列: ${col.name}`);
        } else {
          console.log(`  ⏭️  列已存在: ${col.name}`);
        }
      } catch (error) {
        console.error(`  ❌ 添加列失败 ${col.name}:`, error.message);
      }
    }
    console.log('✅ 更新 projects 表结构完成');
    
    // 1.5 更新 api_configs 表，添加打标模式字段
    try {
      const [taggingModeCol] = await connection.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'api_configs' AND COLUMN_NAME = 'tagging_mode'",
        [process.env.DB_NAME || 'short_video_attribution']
      );
      
      if (taggingModeCol.length === 0) {
        await connection.query(`
          ALTER TABLE api_configs 
          ADD COLUMN tagging_mode ENUM('comparison', 'discovery') DEFAULT 'comparison' COMMENT '打标模式: comparison=对比打标, discovery=主动挖掘'
        `);
        console.log('  ✅ 添加列: tagging_mode (打标模式)');
      } else {
        console.log('  ⏭️  列已存在: tagging_mode');
      }
    } catch (error) {
      console.error('  ❌ 添加 tagging_mode 列失败:', error.message);
    }
    console.log('✅ 更新 api_configs 表结构完成');
    
    // 2. 创建视频表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id VARCHAR(100) PRIMARY KEY COMMENT '视频ID',
        project_id INT NOT NULL COMMENT '所属项目ID',
        video_url TEXT NOT NULL COMMENT '视频原始URL',
        title VARCHAR(500) COMMENT '视频标题',
        local_path VARCHAR(500) COMMENT '本地存储路径',
        status ENUM('pending', 'downloading', 'ready', 'error') DEFAULT 'pending' COMMENT '下载状态',
        progress INT DEFAULT 0 COMMENT '下载进度',
        error_message TEXT COMMENT '错误信息',
        duration INT COMMENT '视频时长（秒）',
        file_size BIGINT COMMENT '文件大小（字节）',
        thumbnail_path VARCHAR(500) COMMENT '缩略图路径',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频资产表'
    `);
    console.log('✅ 创建 videos 表');
    
    // 2.1 更新 videos 表，添加 title 字段（如果不存在）
    try {
      const [titleColumn] = await connection.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'videos' AND COLUMN_NAME = 'title'",
        [process.env.DB_NAME || 'short_video_attribution']
      );
      
      if (titleColumn.length === 0) {
        await connection.query("ALTER TABLE videos ADD COLUMN title VARCHAR(500) COMMENT '视频标题' AFTER video_url");
        console.log('  ✅ 添加列: title 到 videos 表');
      } else {
        console.log('  ⏭️  列已存在: title');
      }
    } catch (error) {
      console.error('  ❌ 添加 title 列失败:', error.message);
    }
    
    // 3. 创建视频指标表（存储上传的业务数据）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS video_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_id VARCHAR(100) NOT NULL COMMENT '视频ID',
        project_id INT NOT NULL COMMENT '所属项目ID',
        metric_name VARCHAR(100) NOT NULL COMMENT '指标名称',
        metric_value DECIMAL(15, 2) COMMENT '指标值',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_video_id (video_id),
        INDEX idx_project_id (project_id),
        INDEX idx_metric_name (metric_name),
        UNIQUE KEY unique_video_metric (video_id, metric_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频业务指标表'
    `);
    console.log('✅ 创建 video_metrics 表');
    
    // 4. 创建视频标签表（存储AI分析的标签）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS video_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_id VARCHAR(100) NOT NULL COMMENT '视频ID',
        project_id INT NOT NULL COMMENT '所属项目ID',
        tag_category_id VARCHAR(100) NOT NULL COMMENT '标签分类ID',
        tag_name VARCHAR(255) NOT NULL COMMENT '标签名称',
        confidence DECIMAL(5, 4) COMMENT '置信度',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_category_id) REFERENCES tag_categories(id) ON DELETE CASCADE,
        INDEX idx_video_id (video_id),
        INDEX idx_project_id (project_id),
        INDEX idx_tag_category (tag_category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频AI标签表'
    `);
    console.log('✅ 创建 video_tags 表');
    
    // 5. 创建下载任务队列表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS download_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_id VARCHAR(100) NOT NULL COMMENT '视频ID',
        project_id INT NOT NULL COMMENT '所属项目ID',
        video_url TEXT NOT NULL COMMENT '视频URL',
        status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '任务状态',
        retry_count INT DEFAULT 0 COMMENT '重试次数',
        error_message TEXT COMMENT '错误信息',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP NULL COMMENT '开始时间',
        completed_at TIMESTAMP NULL COMMENT '完成时间',
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_project_id (project_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频下载任务队列'
    `);
    console.log('✅ 创建 download_queue 表');
    
    // 6. 更新 videos 表，添加 AI 标签分析状态字段
    const aiTaggingColumns = [
      { name: 'ai_tagging_status', sql: "ADD COLUMN ai_tagging_status ENUM('processing', 'completed', 'error') DEFAULT NULL COMMENT 'AI标签分析状态：NULL=未开始，processing=处理中，completed=已完成，error=失败'" },
      { name: 'ai_tagging_progress', sql: "ADD COLUMN ai_tagging_progress INT DEFAULT 0 COMMENT 'AI标签分析进度'" },
      { name: 'ai_tagging_error', sql: "ADD COLUMN ai_tagging_error TEXT COMMENT 'AI标签分析错误信息'" }
    ];
    
    for (const col of aiTaggingColumns) {
      try {
        const [columns] = await connection.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'videos' AND COLUMN_NAME = ?",
          [process.env.DB_NAME || 'short_video_attribution', col.name]
        );
        
        if (columns.length === 0) {
          await connection.query(`ALTER TABLE videos ${col.sql}`);
          console.log(`  ✅ 添加列: ${col.name} 到 videos 表`);
        } else {
          console.log(`  ⏭️  列已存在: ${col.name}`);
        }
      } catch (error) {
        console.error(`  ❌ 添加 ${col.name} 列失败:`, error.message);
      }
    }

    // 6.1 更新 videos 表，添加视频洞察结果存储列
    const narrativeColumns = [
      { name: 'first5s_analysis', sql: "ADD COLUMN first5s_analysis JSON NULL COMMENT '前5秒分析结果' AFTER ai_tagging_error" },
      { name: 'video_summary', sql: "ADD COLUMN video_summary JSON NULL COMMENT '完整视频总结' AFTER first5s_analysis" }
    ];

    for (const col of narrativeColumns) {
      try {
        const [columns] = await connection.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'videos' AND COLUMN_NAME = ?",
          [process.env.DB_NAME || 'short_video_attribution', col.name]
        );

        if (columns.length === 0) {
          await connection.query(`ALTER TABLE videos ${col.sql}`);
          console.log(`  ✅ 添加列: ${col.name} 到 videos 表`);
        } else {
          console.log(`  ⏭️  列已存在: ${col.name}`);
        }
      } catch (error) {
        console.error(`  ❌ 添加 ${col.name} 列失败:`, error.message);
      }
    }

    // 7. 主动挖掘：视频发现标签表（自由标签）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS video_discovery_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_id VARCHAR(100) NOT NULL COMMENT '视频ID',
        project_id INT NOT NULL COMMENT '所属项目ID',
        category_name VARCHAR(100) NOT NULL COMMENT '标签类别名（如：视频元素、爆款潜质）',
        tag_name VARCHAR(255) NOT NULL COMMENT '标签名称',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_video_id (video_id),
        INDEX idx_project_id (project_id),
        INDEX idx_category_name (category_name),
        UNIQUE KEY uniq_video_discovery_tag (video_id, category_name, tag_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主动挖掘-视频发现标签表'
    `);
    console.log('✅ 创建 video_discovery_tags 表');

    // 8. 主动挖掘：项目级汇总标签表（用于下载列集合）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_discovery_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL COMMENT '所属项目ID',
        category_name VARCHAR(100) NOT NULL COMMENT '标签类别名（如：视频元素、爆款潜质）',
        tag_name VARCHAR(255) NOT NULL COMMENT '汇总后的标签名称（规范化）',
        aliases_json JSON NULL COMMENT '同义/别名列表（用于映射 one-hot）',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_category_name (category_name),
        UNIQUE KEY uniq_project_discovery_tag (project_id, category_name, tag_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主动挖掘-项目汇总标签表'
    `);
    console.log('✅ 创建 project_discovery_tags 表');

    // 9. 主动挖掘：项目汇总状态表（首次下载触发汇总时使用）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_discovery_summary (
        project_id INT PRIMARY KEY COMMENT '所属项目ID',
        status ENUM('processing', 'completed', 'error') DEFAULT NULL COMMENT '汇总状态：NULL=未开始，processing=处理中，completed=已完成，error=失败',
        progress INT DEFAULT 0 COMMENT '汇总进度',
        error_message TEXT COMMENT '错误信息',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主动挖掘-项目标签汇总状态'
    `);
    console.log('✅ 创建 project_discovery_summary 表');
    
    console.log('\n✨ 数据库结构更新完成！\n');
    
  } catch (error) {
    console.error('\n❌ 数据库更新失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭\n');
    }
  }
}

// 执行更新
updateDatabase();
