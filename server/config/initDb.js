const db = require("./db");

async function initDb() {
  try {
    console.log("🔄 Initializing database schema (creating tables if not exists)...");
    
    // Create organizations table
    await db.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id             SERIAL PRIMARY KEY,
        company_name   VARCHAR(255) NOT NULL,
        company_email  VARCHAR(255) UNIQUE NOT NULL,
        workspace_code VARCHAR(50) UNIQUE NOT NULL,
        created_at     TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create employees table
    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id               SERIAL PRIMARY KEY,
        organization_id  INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id      VARCHAR(50) NOT NULL,
        name             VARCHAR(100) NOT NULL,
        email            VARCHAR(255),
        password_hash    VARCHAR(255) NOT NULL,
        role             VARCHAR(20) DEFAULT 'employee',
        department       VARCHAR(100),
        status           VARCHAR(20) DEFAULT 'active',
        created_at       TIMESTAMP DEFAULT NOW(),
        UNIQUE (organization_id, employee_id),
        UNIQUE (organization_id, email)
      );
    `);

    // Create rooms table
    await db.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id              SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        room_name       VARCHAR(100) NOT NULL,
        created_by      INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        created_at      TIMESTAMP DEFAULT NOW(),
        UNIQUE (organization_id, room_name)
      );
    `);

    // Create messages table
    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id              SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        room_id         INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        sender          VARCHAR(50) NOT NULL,
        receiver        VARCHAR(50),
        message         TEXT NOT NULL,
        delivered       BOOLEAN DEFAULT false,
        seen            BOOLEAN DEFAULT false,
        created_at      TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for performance optimization
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_room 
      ON messages (organization_id, room_id, created_at);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_private_sender 
      ON messages (organization_id, sender, receiver, created_at);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_private_receiver 
      ON messages (organization_id, receiver, sender, created_at);
    `);

    console.log("✅ Database schema initialized successfully.");
  } catch (err) {
    console.error("❌ Error initializing database schema:", err);
  }
}

module.exports = initDb;
