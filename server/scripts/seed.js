require("dotenv").config({ path: __dirname + "/../.env" });
const db = require("../config/db");
const bcrypt = require("bcryptjs");

async function seed() {
  try {
    console.log("🧹 Dropping existing tables if any...");
    await db.query(`DROP TABLE IF EXISTS messages CASCADE;`);
    await db.query(`DROP TABLE IF EXISTS rooms CASCADE;`);
    await db.query(`DROP TABLE IF EXISTS employees CASCADE;`);
    await db.query(`DROP TABLE IF EXISTS organizations CASCADE;`);
    console.log("✅ Dropped tables.");

    // Create organizations table
    await db.query(`
      CREATE TABLE organizations (
        id             SERIAL PRIMARY KEY,
        company_name   VARCHAR(255) NOT NULL,
        company_email  VARCHAR(255) UNIQUE NOT NULL,
        workspace_code VARCHAR(50) UNIQUE NOT NULL,
        created_at     TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ organizations table created.");

    // Create employees table
    await db.query(`
      CREATE TABLE employees (
        id               SERIAL PRIMARY KEY,
        organization_id  INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id      VARCHAR(50) NOT NULL,
        name             VARCHAR(100) NOT NULL,
        email            VARCHAR(255),
        password_hash    VARCHAR(255) NOT NULL,
        role             VARCHAR(20) DEFAULT 'employee',
        department       VARCHAR(100),
        status           VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended'
        created_at       TIMESTAMP DEFAULT NOW(),
        UNIQUE (organization_id, employee_id),
        UNIQUE (organization_id, email)
      );
    `);
    console.log("✅ employees table created.");

    // Create rooms table
    await db.query(`
      CREATE TABLE rooms (
        id              SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        room_name       VARCHAR(100) NOT NULL,
        created_by      INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        created_at      TIMESTAMP DEFAULT NOW(),
        UNIQUE (organization_id, room_name)
      );
    `);
    console.log("✅ rooms table created.");

    // Create messages table
    await db.query(`
      CREATE TABLE messages (
        id              SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        room_id         INTEGER REFERENCES rooms(id) ON DELETE CASCADE, -- null for direct messages
        sender          VARCHAR(50) NOT NULL, -- sender employee_id
        receiver        VARCHAR(50),          -- receiver employee_id (null for room messages)
        message         TEXT NOT NULL,
        delivered       BOOLEAN DEFAULT false,
        seen            BOOLEAN DEFAULT false,
        created_at      TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ messages table created.");

    // Seed default organization
    const orgResult = await db.query(`
      INSERT INTO organizations (company_name, company_email, workspace_code)
      VALUES ('ABC Plumbing Services', 'info@abcplumbing.com', 'ABC-82K9X')
      RETURNING id;
    `);
    const orgId = orgResult.rows[0].id;
    console.log(`🏢 Seeded Organization: ABC Plumbing Services (Code: ABC-82K9X, ID: ${orgId})`);

    // Hash passwords
    const adminPasswordHash = await bcrypt.hash("admin123", 10);
    const empPasswordHash = await bcrypt.hash("password123", 10);

    // Seed Admin Account
    const adminResult = await db.query(`
      INSERT INTO employees (organization_id, employee_id, name, email, password_hash, role, department)
      VALUES ($1, 'ADMIN', 'ABC Admin', 'admin@abcplumbing.com', $2, 'admin', 'Management')
      RETURNING id;
    `, [orgId, adminPasswordHash]);
    const adminId = adminResult.rows[0].id;
    console.log("👤 Seeded Admin: ABC Admin (ID: ADMIN)");

    // Seed Rooms
    const rooms = ["General", "IT Team", "Sales", "Accounts", "Management"];
    for (const room of rooms) {
      await db.query(`
        INSERT INTO rooms (organization_id, room_name, created_by)
        VALUES ($1, $2, $3);
      `, [orgId, room, adminId]);
      console.log(`  💬 Seeded Room: ${room}`);
    }

    console.log("\n🎉 Seed complete! You can now login with:");
    console.log("   Admin - Employee ID: ADMIN  |  Password: admin123");
    console.log("   Workspace Code: ABC-82K9X");
    console.log("   Create employees from the Admin Dashboard or let them join via the Join tab!\n");

  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await db.end();
    process.exit(0);
  }
}

seed();
