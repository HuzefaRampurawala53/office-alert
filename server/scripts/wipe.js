require("dotenv").config({ path: __dirname + "/../.env" });
const db = require("../config/db");

async function wipe() {
  try {
    console.log("🧹 Deleting all companies and cascading data from database...");
    const res = await db.query("DELETE FROM organizations");
    console.log(`✅ Success! Deleted ${res.rowCount} organizations and all their cascading records.`);
  } catch (err) {
    console.error("❌ Wipe failed:", err.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

wipe();
