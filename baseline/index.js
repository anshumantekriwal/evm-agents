import express from "express";
import fs from "fs";
import path from "path";
import {
  baselineFunction,
  getCurrentStatus,
  setOnStatusUpdate,
  setOnLog,
  withdrawToOwner,
} from "./baseline.js";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// File paths for persistence
const LOGS_FILE = path.join(process.cwd(), "logs.json");
const STATUS_FILE = path.join(process.cwd(), "status.json");

// In-memory logs and status (loaded from files)
let logs = [];
let currentStatus = {};

// Load persistent data
function loadPersistentData() {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const logsData = fs.readFileSync(LOGS_FILE, "utf8");
      logs = JSON.parse(logsData);
      console.log(`Loaded ${logs.length} logs from file`);
    }
  } catch (error) {
    console.error("Error loading logs:", error.message);
  }

  try {
    if (fs.existsSync(STATUS_FILE)) {
      const statusData = fs.readFileSync(STATUS_FILE, "utf8");
      currentStatus = JSON.parse(statusData);
      console.log("Loaded status from file:", currentStatus.phase);
    }
  } catch (error) {
    console.error("Error loading status:", error.message);
  }
}

// Save data to files
function saveLogs() {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error("Error saving logs:", error.message);
  }
}

function saveStatus() {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(currentStatus, null, 2));
  } catch (error) {
    console.error("Error saving status:", error.message);
  }
}

// Load data on startup
loadPersistentData();

// Hook into baseline callbacks
setOnStatusUpdate((status) => {
  currentStatus = status;
  saveStatus();
  console.log("Status updated:", status.phase, "-", status.lastMessage);
});

setOnLog((message) => {
  const logEntry = { timestamp: new Date().toISOString(), message };
  logs.push(logEntry);
  if (logs.length > 1000) logs.shift(); // Keep last 1000
  saveLogs();
  console.log(message);
});

// Auto-start baseline on server startup
const ownerAddress = process.env.OWNER_ADDRESS;
if (ownerAddress) {
  console.log(`Auto-starting baseline for owner: ${ownerAddress}`);
  baselineFunction(ownerAddress);
} else {
  console.log("OWNER_ADDRESS not set - baseline not auto-started");
}

// Endpoint: Get current status (polling)
app.get("/status", (req, res) => {
  res.json(getCurrentStatus());
});

// Endpoint: Get recent logs
app.get("/logs", (req, res) => {
  res.json(logs);
});

// Endpoint: Withdraw funds
app.post("/withdraw", async (req, res) => {
  try {
    const { tokenAddress, amount } = req.body;
    if (!tokenAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: "tokenAddress and amount are required",
      });
    }

    const result = await withdrawToOwner(tokenAddress, amount);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint: Start baseline manually (if not auto-started)
app.post("/start", async (req, res) => {
  try {
    const { ownerAddress } = req.body;
    if (!ownerAddress) {
      return res.status(400).json({
        success: false,
        error: "ownerAddress is required",
      });
    }

    baselineFunction(ownerAddress);
    res.json({ success: true, message: "Baseline started" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Baseline server running on port ${PORT}`);
  console.log(`- GET /status: Current status`);
  console.log(`- GET /logs: Recent logs`);
  console.log(`- POST /withdraw: Withdraw funds`);
  console.log(`- POST /start: Start baseline manually`);
});
