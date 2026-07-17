const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/auth");

// List all rooms for the authenticated user's organization
router.get("/", authMiddleware, async (req, res) => {
  const { organization_id } = req.user;

  try {
    const result = await db.query(
      "SELECT * FROM rooms WHERE organization_id = $1 ORDER BY room_name ASC",
      [organization_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch rooms error:", err);
    res.status(500).json({ error: "Database error fetching rooms." });
  }
});

// Create a room (Admin only)
router.post("/", authMiddleware, async (req, res) => {
  const { organization_id, id, role } = req.user;
  const { room_name } = req.body;

  if (role !== "admin") {
    return res.status(403).json({ error: "Forbidden. Only administrators can create rooms." });
  }

  if (!room_name || !room_name.trim()) {
    return res.status(400).json({ error: "Room name is required." });
  }

  const normalizedRoomName = room_name.trim();

  try {
    // Check if room name already exists in this organization
    const existing = await db.query(
      "SELECT id FROM rooms WHERE organization_id = $1 AND UPPER(room_name) = $2",
      [organization_id, normalizedRoomName.toUpperCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "A room with this name already exists in your workspace." });
    }

    const result = await db.query(
      `INSERT INTO rooms (organization_id, room_name, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [organization_id, normalizedRoomName, id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create room error:", err);
    res.status(500).json({ error: "Database error creating room." });
  }
});

module.exports = router;
