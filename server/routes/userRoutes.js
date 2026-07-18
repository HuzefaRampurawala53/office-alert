const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Helper to generate unique workspace code
function generateWorkspaceCode(companyName) {
  const prefix = companyName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase() || "ORG";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${randomPart}`;
}

// ==========================
// REGISTER COMPANY (Creates Org + Admin Account + Workspace)
// ==========================
router.post("/register-company", async (req, res) => {
  const { company_name, company_email, admin_name, password } = req.body;

  if (!company_name || !company_email || !admin_name || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const normalizedEmail = company_email.trim().toLowerCase();
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");
    // Serialize attempts for the same email to avoid concurrent duplicate
    // registrations racing past the existence check.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [normalizedEmail]);
    // Check if company email already exists in organizations
    const existingOrg = await client.query(
      "SELECT id FROM organizations WHERE company_email = $1",
      [normalizedEmail]
    );

    if (existingOrg.rows.length > 0) {
      const existingOrganizationId = existingOrg.rows[0].id;
      const existingUsers = await client.query(
        `SELECT COUNT(*)::int AS employee_count,
                COUNT(*) FILTER (WHERE role = 'admin')::int AS admin_count
         FROM employees
         WHERE organization_id = $1`,
        [existingOrganizationId]
      );

      if (existingUsers.rows[0].admin_count > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "A company with this email is already registered." });
      }

      if (existingUsers.rows[0].employee_count > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "This workspace is incomplete but contains employee data. Contact support before retrying."
        });
      }

      // An older non-transactional registration could create the organization
      // and then fail before creating its admin. Remove only that unusable,
      // admin-less workspace and recreate it atomically below.
      await client.query(
        "DELETE FROM organizations WHERE id = $1",
        [existingOrganizationId]
      );
    }

    // Generate unique workspace code
    let workspaceCode;
    let codeExists = true;
    while (codeExists) {
      workspaceCode = generateWorkspaceCode(company_name);
      const codeCheck = await client.query(
        "SELECT id FROM organizations WHERE workspace_code = $1",
        [workspaceCode]
      );
      if (codeCheck.rows.length === 0) {
        codeExists = false;
      }
    }

    // Create organization
    const orgResult = await client.query(
      `INSERT INTO organizations (company_name, company_email, workspace_code)
       VALUES ($1, $2, $3)
       RETURNING id, company_name, workspace_code`,
      [company_name.trim(), normalizedEmail, workspaceCode]
    );

    const organization = orgResult.rows[0];

    // Create admin employee
    const passwordHash = await bcrypt.hash(password, 10);
    const adminResult = await client.query(
      `INSERT INTO employees (organization_id, employee_id, name, email, password_hash, role, department)
       VALUES ($1, 'ADMIN', $2, $3, $4, 'admin', 'Management')
       RETURNING id, employee_id, name, email, role, department`,
      [organization.id, admin_name.trim(), normalizedEmail, passwordHash]
    );

    const adminEmployee = adminResult.rows[0];

    // Create default 'General' room for the workspace
    await client.query(
      `INSERT INTO rooms (organization_id, room_name, created_by)
       VALUES ($1, 'General', $2)`,
      [organization.id, adminEmployee.id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Company registered successfully.",
      workspace_code: organization.workspace_code,
      organization,
      admin: adminEmployee
    });

  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Company registration rollback error:", rollbackError);
      }
    }
    console.error("Company registration error:", err);
    res.status(500).json({ error: "Server error during company registration." });
  } finally {
    client?.release();
  }
});

// ==========================
// VERIFY WORKSPACE CODE
// ==========================
router.post("/verify-workspace", async (req, res) => {
  const { workspace_code } = req.body;

  if (!workspace_code) {
    return res.status(400).json({ error: "Workspace code is required." });
  }

  try {
    const result = await db.query(
      "SELECT id, company_name, workspace_code FROM organizations WHERE UPPER(workspace_code) = $1",
      [workspace_code.trim().toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invalid workspace code." });
    }

    res.json({
      success: true,
      organization: result.rows[0]
    });
  } catch (err) {
    console.error("Workspace verification error:", err);
    res.status(500).json({ error: "Server error checking workspace code." });
  }
});

// ==========================
// REGISTER EMPLOYEE (Join Workspace)
// ==========================
router.post("/register-employee", async (req, res) => {
  const { workspace_code, employee_id, name, password, department } = req.body;

  if (!workspace_code || !employee_id || !name || !password) {
    return res.status(400).json({ error: "Workspace code, Employee ID, name, and password are required." });
  }

  try {
    // 1. Verify workspace exists
    const orgResult = await db.query(
      "SELECT id FROM organizations WHERE UPPER(workspace_code) = $1",
      [workspace_code.trim().toUpperCase()]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: "Workspace not found." });
    }

    const orgId = orgResult.rows[0].id;

    // 2. Check if employee ID already registered under this organization
    const existing = await db.query(
      "SELECT id FROM employees WHERE organization_id = $1 AND UPPER(employee_id) = $2",
      [orgId, employee_id.trim().toUpperCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Employee ID is already registered in this workspace." });
    }

    // 3. Create employee
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO employees (organization_id, employee_id, name, password_hash, role, department)
       VALUES ($1, $2, $3, $4, 'employee', $5)
       RETURNING id, employee_id, name, department, role, status`,
      [orgId, employee_id.trim().toUpperCase(), name.trim(), passwordHash, department || "General"]
    );

    res.status(201).json({
      success: true,
      message: "Joined workspace successfully.",
      employee: result.rows[0]
    });
  } catch (err) {
    console.error("Employee registration error:", err);
    res.status(500).json({ error: "Server error during employee registration." });
  }
});

// ==========================
// LOGIN (Employee ID/Email + Password)
// ==========================
router.post("/login", async (req, res) => {
  const { username, password } = req.body; // client passes 'employee_id' or 'email' in username/employee_id field

  // support both body param names
  const loginId = (username || req.body.employee_id || "").trim();

  if (!loginId || !password) {
    return res.status(400).json({ error: "Employee ID/Email and password are required." });
  }

  try {
    const result = await db.query(
      `SELECT e.*, o.company_name, o.workspace_code
       FROM employees e
       JOIN organizations o ON e.organization_id = o.id
       WHERE UPPER(e.employee_id) = $1 OR UPPER(e.email) = $1`,
      [loginId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid Employee ID/Email or password." });
    }

    const employee = result.rows[0];

    // Check account status
    if (employee.status === "suspended") {
      return res.status(403).json({ error: "Your account is suspended. Please contact your administrator." });
    }

    const isMatch = await bcrypt.compare(password, employee.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Employee ID/Email or password." });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        id: employee.id,
        organization_id: employee.organization_id,
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        company_name: employee.company_name,
        workspace_code: employee.workspace_code
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    console.log(`✅ ${employee.role.toUpperCase()}: ${employee.employee_id} (${employee.name}) logged in`);

    res.json({
      success: true,
      token,
      employee: {
        id: employee.id,
        organization_id: employee.organization_id,
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        company_name: employee.company_name,
        workspace_code: employee.workspace_code
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// ==========================
// GET WORKSPACE MEMBERS (All Employees in Org)
// ==========================
router.get("/members", authMiddleware, async (req, res) => {
  const { organization_id } = req.user;

  try {
    const result = await db.query(
      `SELECT id, employee_id, name, role, department, status, created_at
       FROM employees
       WHERE organization_id = $1 AND status = 'active'
       ORDER BY name ASC`,
      [organization_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch members error:", err);
    res.status(500).json({ error: "Database error fetching members." });
  }
});

module.exports = router;
