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

    // Migrate databases created by the original single-tenant version.
    // CREATE TABLE IF NOT EXISTS alone does not add newly introduced columns.
    await db.query(`
      ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'employee',
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    `);

    // The legacy schema made employee_id globally unique. In a multi-tenant
    // database each workspace needs its own ADMIN and may reuse employee IDs.
    await db.query(`
      DO $$
      DECLARE constraint_name TEXT;
      BEGIN
        SELECT c.conname INTO constraint_name
        FROM pg_constraint c
        WHERE c.conrelid = 'employees'::regclass
          AND c.contype = 'u'
          AND c.conkey = ARRAY[
            (SELECT attnum FROM pg_attribute
             WHERE attrelid = 'employees'::regclass AND attname = 'employee_id')
          ]::smallint[]
        LIMIT 1;

        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE employees DROP CONSTRAINT %I', constraint_name);
        END IF;
      END $$;
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

    await db.query(`
      ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE;
      ALTER TABLE messages ALTER COLUMN receiver DROP NOT NULL;
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_org_employee_id
      ON employees (organization_id, employee_id);
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_org_email
      ON employees (organization_id, email);
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
    throw err;
  }
}

module.exports = initDb;
