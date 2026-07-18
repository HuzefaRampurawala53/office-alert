require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const socketHandler = require("./socket/socketHandler");
const db = require("./config/db");
const initDb = require("./config/initDb");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Office Alert Backend...");
});

const authRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messages");
const roomRoutes = require("./routes/rooms");
const adminRoutes = require("./routes/admin");

app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/rooms", roomRoutes);
app.use("/admin", adminRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

socketHandler(io);

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    const result = await db.query("SELECT NOW()");
    console.log("PostgreSQL connected:", result.rows[0]);
    await initDb();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    // Failing the deployment is safer than serving every request against an
    // outdated or only partially migrated database.
    console.error("Server startup failed:", err);
    process.exit(1);
  }
}

startServer();
