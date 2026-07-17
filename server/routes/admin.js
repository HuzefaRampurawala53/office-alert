const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/auth");

// Middleware to restrict access to Admins only
function adminOnly(req, res, next) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Forbidden. Admin access required." });
  }
}

// Apply authentication and admin-only restriction to all routes in this router
router.use(authMiddleware);
router.use(adminOnly);

// GET /admin/stats - Fetch dashboard metrics & company info
router.get("/stats", async (req, res) => {
  const { organization_id } = req.user;

  try {
    const orgResult = await db.query(
      "SELECT company_name, company_email, workspace_code, created_at FROM organizations WHERE id = $1",
      [organization_id]
    );

    const employeeCount = await db.query(
      "SELECT COUNT(*) FROM employees WHERE organization_id = $1",
      [organization_id]
    );

    const roomCount = await db.query(
      "SELECT COUNT(*) FROM rooms WHERE organization_id = $1",
      [organization_id]
    );

    const messageCount = await db.query(
      "SELECT COUNT(*) FROM messages WHERE organization_id = $1",
      [organization_id]
    );

    res.json({
      organization: orgResult.rows[0],
      stats: {
        totalEmployees: parseInt(employeeCount.rows[0].count, 10),
        totalRooms: parseInt(roomCount.rows[0].count, 10),
        totalMessages: parseInt(messageCount.rows[0].count, 10),
      }
    });
  } catch (err) {
    console.error("Fetch admin stats error:", err);
    res.status(500).json({ error: "Database error fetching dashboard stats." });
  }
});

// GET /admin/employees - Fetch all employees of the organization
router.get("/employees", async (req, res) => {
  const { organization_id } = req.user;

  try {
    const result = await db.query(
      `SELECT id, employee_id, name, email, role, department, status, created_at
       FROM employees
       WHERE organization_id = $1
       ORDER BY employee_id ASC`,
      [organization_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch organization employees error:", err);
    res.status(500).json({ error: "Database error fetching employees." });
  }
});

// PUT /admin/employees/:id/status - Suspend or reactivate an employee
router.put("/employees/:id/status", async (req, res) => {
  const { organization_id, id: adminId } = req.user;
  const targetEmployeeId = req.params.id;
  const { status } = req.body; // 'active' or 'suspended'

  if (!["active", "suspended"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value. Must be 'active' or 'suspended'." });
  }

  if (parseInt(targetEmployeeId, 10) === adminId) {
    return res.status(400).json({ error: "You cannot suspend your own admin account." });
  }

  try {
    const result = await db.query(
      `UPDATE employees
       SET status = $1
       WHERE id = $2 AND organization_id = $3
       RETURNING id, employee_id, name, status`,
      [status, targetEmployeeId, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found or doesn't belong to your organization." });
    }

    res.json({
      success: true,
      message: `Employee status updated to ${status}.`,
      employee: result.rows[0]
    });
  } catch (err) {
    console.error("Update employee status error:", err);
    res.status(500).json({ error: "Database error updating employee status." });
  }
});

// DELETE /admin/employees/:id - Remove an employee from the workspace
router.delete("/employees/:id", async (req, res) => {
  const { organization_id, id: adminId } = req.user;
  const targetEmployeeId = req.params.id;

  if (parseInt(targetEmployeeId, 10) === adminId) {
    return res.status(400).json({ error: "You cannot delete your own admin account." });
  }

  try {
    const result = await db.query(
      `DELETE FROM employees
       WHERE id = $1 AND organization_id = $2
       RETURNING id, employee_id, name`,
      [targetEmployeeId, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found or doesn't belong to your organization." });
    }

    res.json({
      success: true,
      message: "Employee successfully removed from workspace.",
      employee: result.rows[0]
    });
  } catch (err) {
    console.error("Delete employee error:", err);
    res.status(500).json({ error: "Database error removing employee." });
  }
});

const bcrypt = require("bcryptjs");

// POST /admin/employees - Create an employee directly (Admin only)
router.post("/employees", async (req, res) => {
  const { organization_id } = req.user;
  const { employee_id, name, department, password } = req.body;

  if (!employee_id || !name || !password) {
    return res.status(400).json({ error: "Employee ID, name, and password are required." });
  }

  try {
    // Check if employee ID already registered under this organization
    const existing = await db.query(
      "SELECT id FROM employees WHERE organization_id = $1 AND UPPER(employee_id) = $2",
      [organization_id, employee_id.trim().toUpperCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Employee ID is already registered in this workspace." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO employees (organization_id, employee_id, name, password_hash, role, department)
       VALUES ($1, $2, $3, $4, 'employee', $5)
       RETURNING id, employee_id, name, department, role, status`,
      [organization_id, employee_id.trim().toUpperCase(), name.trim(), passwordHash, department || "General"]
    );

    res.status(201).json({
      success: true,
      message: "Employee account created successfully.",
      employee: result.rows[0]
    });
  } catch (err) {
    console.error("Admin create employee error:", err);
    res.status(500).json({ error: "Database error creating employee." });
  }
});

module.exports = router;
