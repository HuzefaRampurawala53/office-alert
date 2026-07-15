const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// ==========================
// REGISTER (for seeding / admin use)
// ==========================
router.post("/register", async (req, res) => {
  const { employee_id, name, password, department } = req.body;

  if (!employee_id || !name || !password) {
    return res.status(400).json({ error: "employee_id, name, and password are required." });
  }

  try {
    // Check if employee already exists
    const existing = await db.query(
      "SELECT id FROM employees WHERE employee_id = $1",
      [employee_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Employee ID already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO employees (employee_id, name, password_hash, department)
       VALUES ($1, $2, $3, $4)
       RETURNING id, employee_id, name, department, created_at`,
      [employee_id, name, passwordHash, department || null]
    );

    res.status(201).json({
      success: true,
      employee: result.rows[0],
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// ==========================
// LOGIN
// ==========================
router.post("/login", async (req, res) => {
  const { employee_id, password } = req.body;

  if (!employee_id || !password) {
    return res.status(400).json({ error: "Employee ID and password are required." });
  }

  try {
    const result = await db.query(
      "SELECT * FROM employees WHERE employee_id = $1",
      [employee_id.trim().toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid Employee ID or password." });
    }

    const employee = result.rows[0];

    const isMatch = await bcrypt.compare(password, employee.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Employee ID or password." });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        id: employee.id,
        employee_id: employee.employee_id,
        name: employee.name,
        department: employee.department,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    console.log(`✅ ${employee.employee_id} (${employee.name}) logged in`);

    res.json({
      success: true,
      token,
      employee: {
        employee_id: employee.employee_id,
        name: employee.name,
        department: employee.department,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

module.exports = router;