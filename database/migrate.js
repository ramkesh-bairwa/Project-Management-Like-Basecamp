const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'project_management'
  });

  await conn.execute('ALTER TABLE `groups` ADD COLUMN IF NOT EXISTS chat_id INT NULL AFTER is_private');
  console.log('✅ Added chat_id to groups');

  try {
    await conn.execute('ALTER TABLE `groups` ADD CONSTRAINT fk_group_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL');
    console.log('✅ Added FK constraint');
  } catch (e) {
    console.log('⚠️  FK already exists, skipping');
  }

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS group_meetings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      created_by INT NOT NULL,
      purpose TEXT NOT NULL,
      scheduled_at TIMESTAMP NOT NULL,
      is_instant BOOLEAN DEFAULT FALSE,
      meeting_link VARCHAR(500) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Created group_meetings table');

  // Daily Reports Migration
  console.log('📊 Creating daily reports tables...');
  
  const dailyReportsSQL = fs.readFileSync(path.join(__dirname, 'migrations/create_daily_reports.sql'), 'utf8');
  const statements = dailyReportsSQL.split(';').filter(stmt => stmt.trim());
  
  for (const statement of statements) {
    try {
      await conn.execute(statement);
      console.log('✅ Executed daily reports SQL statement');
    } catch (e) {
      console.log('⚠️ SQL statement may already exist:', e.message);
    }
  }

  // Add blocker_type column
  console.log('🔧 Adding blocker_type column...');
  try {
    const blockerTypeSQL = fs.readFileSync(path.join(__dirname, 'migrations/add_blocker_type.sql'), 'utf8');
    await conn.execute(blockerTypeSQL);
    console.log('✅ Added blocker_type column');
  } catch (e) {
    console.log('⚠️ Blocker type column may already exist:', e.message);
  }

  // Add task comments and activity history
  console.log('💬 Adding task comments and activity history...');
  try {
    const commentsSQL = fs.readFileSync(path.join(__dirname, 'migrations/add_task_comments_activity.sql'), 'utf8');
    const statements = commentsSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      try {
        await conn.execute(statement);
        console.log('✅ Executed comments/activity SQL statement');
      } catch (e) {
        console.log('⚠️ Comments/Activity statement may already exist:', e.message);
      }
    }
  } catch (e) {
    console.log('⚠️ Comments and activity tables may already exist:', e.message);
  }

  const [cols] = await conn.execute('SHOW COLUMNS FROM `groups`');
  console.log('groups columns now:', cols.map(c => c.Field));

  const [tables] = await conn.execute('SHOW TABLES LIKE "%daily%"');
  console.log('daily tables:', tables);

  await conn.end();
}

run().catch(e => console.error('ERROR:', e.message));
