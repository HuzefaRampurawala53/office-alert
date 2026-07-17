const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Structure: onlineUsers[organization_id][employee_id] = [socket_ids...]
const onlineUsers = {};

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
      socket.user = decoded; // { id, organization_id, employee_id, name, role, department }
      next();
    } catch (err) {
      console.log("❌ Socket connection rejected: Invalid token");
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const { employee_id, name, organization_id } = socket.user;
    
    // Read status from handshake
    const initialStatus = socket.handshake.auth?.presenceStatus || "online";
    socket.presenceStatus = initialStatus;
    
    console.log(`✅ ${employee_id} (${name}) connected to Org ${organization_id} (Status: ${socket.presenceStatus}) | Socket: ${socket.id}`);

    // Join organization-wide room
    socket.join(`org_${organization_id}`);

    // Join personal employee room
    socket.join(`org_${organization_id}_user_${employee_id}`);

    // Fetch and join all rooms for this organization
    try {
      const roomsResult = await db.query(
        "SELECT id FROM rooms WHERE organization_id = $1",
        [organization_id]
      );
      roomsResult.rows.forEach((room) => {
        socket.join(`org_${organization_id}_room_${room.id}`);
      });
    } catch (err) {
      console.error("Error joining rooms on connection:", err);
    }

    // Initialize organization presence map if not exists
    if (!onlineUsers[organization_id]) {
      onlineUsers[organization_id] = {};
    }

    // Only add to online presence list if status preference is "online"
    if (socket.presenceStatus === "online") {
      if (!onlineUsers[organization_id][employee_id]) {
        onlineUsers[organization_id][employee_id] = [];
      }

      if (!onlineUsers[organization_id][employee_id].includes(socket.id)) {
        onlineUsers[organization_id][employee_id].push(socket.id);
      }
    }

    // Helper to broadcast presence to organization
    const broadcastPresence = () => {
      const orgOnlineMap = onlineUsers[organization_id] || {};
      const nameMap = {};

      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.organization_id === organization_id && s.presenceStatus === "online") {
          nameMap[s.user.employee_id] = s.user.name;
        }
      }

      const enrichedOnlineUsers = Object.keys(orgOnlineMap).map((eid) => ({
        employee_id: eid,
        name: nameMap[eid] || eid,
      }));

      io.to(`org_${organization_id}`).emit("online_users", enrichedOnlineUsers);
    };

    // Event listener to toggle status in real-time
    socket.on("toggle_status", ({ status }) => {
      socket.presenceStatus = status;
      console.log(`👤 ${employee_id} toggled status to: ${status}`);

      if (status === "online") {
        if (!onlineUsers[organization_id][employee_id]) {
          onlineUsers[organization_id][employee_id] = [];
        }
        if (!onlineUsers[organization_id][employee_id].includes(socket.id)) {
          onlineUsers[organization_id][employee_id].push(socket.id);
        }
      } else {
        if (onlineUsers[organization_id] && onlineUsers[organization_id][employee_id]) {
          onlineUsers[organization_id][employee_id] = onlineUsers[organization_id][employee_id].filter(
            (sid) => sid !== socket.id
          );
          if (onlineUsers[organization_id][employee_id].length === 0) {
            delete onlineUsers[organization_id][employee_id];
          }
        }
      }
      broadcastPresence();
    });

    broadcastPresence();
    console.log(`Org ${organization_id} Online Users:`, Object.keys(onlineUsers[organization_id]));

    // =======================
    // Typing
    // =======================
    socket.on("typing", ({ to, room_id }) => {
      if (room_id) {
        // Typing in a room
        socket.to(`org_${organization_id}_room_${room_id}`).emit("user_typing", {
          room_id,
          from: employee_id,
          name
        });
      } else {
        // Typing in DM
        socket.to(`org_${organization_id}_user_${to}`).emit("user_typing", {
          from: employee_id,
          name
        });
      }
    });

    // =======================
    // Stop Typing
    // =======================
    socket.on("stop_typing", ({ to, room_id }) => {
      if (room_id) {
        socket.to(`org_${organization_id}_room_${room_id}`).emit("user_stop_typing", {
          room_id,
          from: employee_id
        });
      } else {
        socket.to(`org_${organization_id}_user_${to}`).emit("user_stop_typing", {
          from: employee_id
        });
      }
    });

    // ==========================
    // RING USER (Direct Alert)
    // ==========================
    socket.on("ring_user", (targetEmployeeId) => {
      io.to(`org_${organization_id}_user_${targetEmployeeId}`).emit("bell_ring", {
        from: employee_id,
        fromName: name,
      });
    });

    // ==========================
    // ROOM JOIN (For dynamically created rooms)
    // ==========================
    socket.on("join_room", ({ room_id }) => {
      socket.join(`org_${organization_id}_room_${room_id}`);
      console.log(`Socket ${socket.id} joined room org_${organization_id}_room_${room_id}`);
    });

    // ==========================
    // SEND MESSAGE (Private & Room)
    // ==========================
    socket.on("send_message", async (data) => {
      try {
        console.log("📨 Incoming Message:", data);

        const isRoomMessage = !!data.room_id;
        const targetRoomId = isRoomMessage ? parseInt(data.room_id, 10) : null;
        const targetReceiver = isRoomMessage ? null : data.to.trim().toUpperCase();

        const result = await db.query(
          `
          INSERT INTO messages
          (organization_id, room_id, sender, receiver, message)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
          `,
          [
            organization_id,
            targetRoomId,
            employee_id,
            targetReceiver,
            data.message.trim(),
          ]
        );

        const savedMessage = result.rows[0];
        console.log("✅ Saved:", savedMessage);

        const messageData = {
          id: savedMessage.id,
          organization_id: savedMessage.organization_id,
          room_id: savedMessage.room_id,
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

        if (isRoomMessage) {
          // Emit to all users in this channel room
          io.to(`org_${organization_id}_room_${targetRoomId}`).emit("receive_message", messageData);
        } else {
          // Emit to receiver's and sender's DM rooms
          io.to(`org_${organization_id}_user_${targetReceiver}`).emit("receive_message", messageData);
          io.to(`org_${organization_id}_user_${employee_id}`).emit("receive_message", messageData);
        }
      } catch (err) {
        console.error("❌ Database Error saving message:", err);
      }
    });

    // ==========================
    // MESSAGE DELIVERED
    // ==========================
    socket.on("message_delivered", async ({ id }) => {
      await db.query(
        `UPDATE messages SET delivered = true WHERE id = $1 AND organization_id = $2`,
        [id, organization_id]
      );
      socket.to(`org_${organization_id}`).emit("message_delivered_update", { id });
    });

    // ==========================
    // MESSAGE SEEN
    // ==========================
    socket.on("message_seen", async ({ id }) => {
      await db.query(
        `UPDATE messages SET seen = true WHERE id = $1 AND organization_id = $2`,
        [id, organization_id]
      );
      socket.to(`org_${organization_id}`).emit("message_seen_update", { id });
    });

    // ==========================
    // DISCONNECT
    // ==========================
    socket.on("disconnect", () => {
      console.log(`❌ ${employee_id} (${name}) disconnected from Org ${organization_id} | Socket: ${socket.id}`);

      if (onlineUsers[organization_id] && onlineUsers[organization_id][employee_id]) {
        onlineUsers[organization_id][employee_id] = onlineUsers[organization_id][employee_id].filter(
          (sid) => sid !== socket.id
        );

        if (onlineUsers[organization_id][employee_id].length === 0) {
          delete onlineUsers[organization_id][employee_id];
        }

        if (Object.keys(onlineUsers[organization_id]).length === 0) {
          delete onlineUsers[organization_id];
        }
      }

      broadcastPresence();
    });
  });
}

module.exports = socketHandler;