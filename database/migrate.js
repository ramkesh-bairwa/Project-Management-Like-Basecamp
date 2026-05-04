const mysql = require('mysql2/promise');

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

  const [cols] = await conn.execute('SHOW COLUMNS FROM `groups`');
  console.log('groups columns now:', cols.map(c => c.Field));

  const [tables] = await conn.execute('SHOW TABLES LIKE "%meeting%"');
  console.log('meeting tables:', tables);

  await conn.end();
}

run().catch(e => console.error('ERROR:', e.message));
