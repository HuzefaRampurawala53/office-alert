const jwt = require("jsonwebtoken");
const db = require("../config/db");

const onlineUsers = {}; // employee_id -> array of socket ids

function socketHandler(io) {
  // ==========================
  // JWT AUTH MIDDLEWARE
  // ==========================
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("❌ Socket connection rejected: No token");
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, employee_id, name, department }
      next();
    } catch (err) {
      console.log("❌ Socket connection rejected: Invalid token");
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { employee_id, name } = socket.user;
    console.log(`✅ ${employee_id} (${name}) connected | Socket: ${socket.id}`);

    // Auto-join on connection using verified identity
    socket.join(employee_id);

    if (!onlineUsers[employee_id]) {
      onlineUsers[employee_id] = [];
    }

    if (!onlineUsers[employee_id].includes(socket.id)) {
      onlineUsers[employee_id].push(socket.id);
    }

    // Broadcast online users with their names
    const onlineList = Object.keys(onlineUsers).map((eid) => ({
      employee_id: eid,
      name: eid === employee_id ? name : null, // We'll fill names from connected sockets
    }));

    // Build a name map from all connected sockets
    const nameMap = {};
    for (const [, s] of io.sockets.sockets) {
      if (s.user) {
        nameMap[s.user.employee_id] = s.user.name;
      }
    }

    const enrichedOnlineUsers = Object.keys(onlineUsers).map((eid) => ({
      employee_id: eid,
      name: nameMap[eid] || eid,
    }));

    io.emit("online_users", enrichedOnlineUsers);
    console.log("Online Users:", Object.keys(onlineUsers));

    // =======================
    // Typing
    // =======================
    socket.on("typing", ({ to }) => {
      io.to(to).emit("user_typing", { from: employee_id, name });
    });

    // =======================
    // Stop Typing
    // =======================
    socket.on("stop_typing", ({ to }) => {
      io.to(to).emit("user_stop_typing", { from: employee_id });
    });

    // ==========================
    // RING USER
    // ==========================
    socket.on("ring_user", (targetEmployeeId) => {
      io.to(targetEmployeeId).emit("bell_ring", {
        from: employee_id,
        fromName: name,
      });
    });

    // ==========================
    // SEND MESSAGE
    // ==========================
    socket.on("send_message", async (data) => {
      try {
        console.log("📨 Incoming Message:", data);

        const result = await db.query(
          `
          INSERT INTO messages
          (sender, receiver, message)
          VALUES ($1, $2, $3)
          RETURNING *;
          `,
          [
            employee_id,               // sender is always from JWT
            data.to.trim().toUpperCase(),
            data.message.trim(),
          ]
        );

        const savedMessage = result.rows[0];
        console.log("✅ Saved:", savedMessage);

        const messageData = {
          id: savedMessage.id,
          from: savedMessage.sender,
          to: savedMessage.receiver,
          message: savedMessage.message,
          delivered: savedMessage.delivered,
          seen: savedMessage.seen,
          time: new Date(savedMessage.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        io.to(data.to.trim().toUpperCase()).emit("receive_message", messageData);
        io.to(employee_id).emit("receive_message", messageData);
      } catch (err) {
        console.error("❌ Database Error:", err);
      }
    });

    // ==========================
    // MESSAGE DELIVERED
    // ==========================
    socket.on("message_delivered", async ({ id }) => {
      await db.query(
        `UPDATE messages SET delivered = true WHERE id = $1`,
        [id]
      );
      socket.broadcast.emit("message_delivered_update", { id });
    });

    // ==========================
    // MESSAGE SEEN
    // ==========================
    socket.on("message_seen", async ({ id }) => {
      await db.query(
        `UPDATE messages SET seen = true WHERE id = $1`,
        [id]
      );
      socket.broadcast.emit("message_seen_update", { id });
    });

    // ==========================
    // DISCONNECT
    // ==========================
    socket.on("disconnect", () => {
      console.log(`❌ ${employee_id} (${name}) disconnected | Socket: ${socket.id}`);

      if (onlineUsers[employee_id]) {
        onlineUsers[employee_id] = onlineUsers[employee_id].filter(
          (id) => id !== socket.id
        );

        if (onlineUsers[employee_id].length === 0) {
          delete onlineUsers[employee_id];
        }
      }

      // Rebuild enriched online users
      const nameMap = {};
      for (const [, s] of io.sockets.sockets) {
        if (s.user) {
          nameMap[s.user.employee_id] = s.user.name;
        }
      }

      const enrichedOnlineUsers = Object.keys(onlineUsers).map((eid) => ({
        employee_id: eid,
        name: nameMap[eid] || eid,
      }));

      io.emit("online_users", enrichedOnlineUsers);
      console.log("Online Users:", Object.keys(onlineUsers));
    });
  });
}

module.exports = socketHandler;