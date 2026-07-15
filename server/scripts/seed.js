require("dotenv").config({ path: __dirname + "/../.env" });
const db = require("../config/db");
const bcrypt = require("bcryptjs");

async function seed() {
  try {
    // Create employees table
    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id            SERIAL PRIMARY KEY,
        employee_id   VARCHAR(50) UNIQUE NOT NULL,
        name          VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        department    VARCHAR(100),
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ employees table created (or already exists).");

    // Ensure messages table exists too
    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id          SERIAL PRIMARY KEY,
        sender      VARCHAR(50) NOT NULL,
        receiver    VARCHAR(50) NOT NULL,
        message     TEXT NOT NULL,
        delivered   BOOLEAN DEFAULT false,
        seen        BOOLEAN DEFAULT false,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ messages table verified.");

    // Seed employees
    const employees = [
      { employee_id: "EMP001", name: "Huzefa",  password: "password123", department: "Engineering" },
      { employee_id: "EMP002", name: "Ali",     password: "password123", department: "Design" },
      { employee_id: "EMP003", name: "Sara",    password: "password123", department: "Marketing" },
      { employee_id: "EMP004", name: "Ravi",    password: "password123", department: "Engineering" },
      { employee_id: "EMP005", name: "Priya",   password: "password123", department: "HR" },
    ];

    for (const emp of employees) {
      const hash = await bcrypt.hash(emp.password, 10);

      await db.query(
        `INSERT INTO employees (employee_id, name, password_hash, department)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (employee_id) DO NOTHING`,
        [emp.employee_id, emp.name, hash, emp.department]
      );

      console.log(`  👤 Seeded: ${emp.employee_id} (${emp.name})`);
    }

    console.log("\n🎉 Seed complete! You can now login with:");
    console.log("   Employee ID: EMP001  |  Password: password123");
    console.log("   Employee ID: EMP002  |  Password: password123");
    console.log("   (and so on up to EMP005)\n");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await db.end();
    process.exit(0);
  }
}

seed();
