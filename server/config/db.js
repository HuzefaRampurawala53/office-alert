const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production" || !!process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  // Fallback credentials for local development if DATABASE_URL is not set
  ...(process.env.DATABASE_URL ? {} : {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "huzefa",
    database: "office-alert",
  }),
  // Render PostgreSQL requires SSL when connecting externally/internally
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;