import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// File paths for persistence
const LOGS_FILE = path.join(process.cwd(), "logs.json");

// In-memory logs
let logs = [];

// Load existing logs
try {
  if (fs.existsSync(LOGS_FILE)) {
    const logsData = fs.readFileSync(LOGS_FILE, "utf8");
    logs = JSON.parse(logsData);
    console.log(`Loaded ${logs.length} logs from file`);
  }
} catch (error) {
  console.error("Error loading logs:", error.message);
}

// Save logs to file
function saveLogs() {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error("Error saving logs:", error.message);
  }
}

// Broadcast status update
async function broadcastStatus(status) {
  try {
    const agentId = process.env.AGENT_ID;
    if (!agentId) {
      console.error("AGENT_ID not set in environment");
      return;
    }

    const statusJson = {
      phase: status.phase,
      walletAddress: status.walletAddress,
      polBalance: status.polBalance || 0,
      lastMessage: status.lastMessage,
      nextStep: status.nextStep,
      trades: status.trades || [],
      error: status.error,
      isRunning: status.isRunning,
      updatedAt: new Date().toISOString(),
    };

    // Broadcast to agent-specific realtime channel
    const channelName = `agent_${agentId}`;
    await supabase.channel(channelName).send({
      type: "broadcast",
      event: "status_update",
      payload: {
        agent_id: agentId,
        status: statusJson,
      },
    });
  } catch (error) {
    console.error("Broadcast failed:", error);
  }
}

// Log message with persistence and broadcast
function log(message, level = "info") {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  // Add to in-memory logs
  logs.push(logEntry);
  if (logs.length > 1000) logs.shift(); // Keep last 1000 logs

  // Save to file
  saveLogs();

  // Console output with color
  const colors = {
    info: "\x1b[36m", // Cyan
    error: "\x1b[31m", // Red
    warning: "\x1b[33m", // Yellow
    success: "\x1b[32m", // Green
  };
  const reset = "\x1b[0m";
  console.log(`${colors[level] || ""}${message}${reset}`);
}

// Status update handler
function updateStatus(currentStatus, newStatus) {
  // Determine next step based on current phase
  let nextStep = "Waiting...";

  switch (newStatus.phase) {
    case "initializing":
      nextStep = "Creating wallet and checking balance";
      break;
    case "checking_balance":
      nextStep = "Waiting for 0.01 POL balance threshold";
      break;
    case "monitoring":
      nextStep = "Fetching BTC market data";
      break;
    case "analyzing_market":
      nextStep = "Analyzing BTC price for trading decision";
      break;
    case "calculating_strategy":
      nextStep = "Preparing trade execution";
      break;
    case "executing_trade":
      nextStep = "Confirming transaction and updating records";
      break;
    case "trade_completed":
      nextStep = "Waiting for next market analysis cycle";
      break;
    case "waiting":
      nextStep = "Waiting for next market analysis cycle (60 seconds)";
      break;
    case "withdrawing":
      nextStep = "Executing withdrawal transaction";
      break;
    case "withdrawal_complete":
      nextStep = "Returning to normal operations";
      break;
    case "error":
      nextStep = "Attempting to recover from error";
      break;
    default:
      nextStep = "Processing...";
  }

  // Override nextStep if explicitly provided
  if (newStatus.nextStep) {
    nextStep = newStatus.nextStep;
  }

  const updatedStatus = { ...currentStatus, ...newStatus, nextStep };

  // Broadcast status updates
  broadcastStatus(updatedStatus);

  // Log status update
  log(
    `Status updated: ${newStatus.phase || ""} - ${
      newStatus.lastMessage || ""
    } | Next: ${nextStep}`,
    newStatus.error ? "error" : "info"
  );

  return updatedStatus;
}

// Get all logs
function getLogs() {
  return logs;
}

// Clear logs
function clearLogs() {
  logs = [];
  saveLogs();
}

export { log, updateStatus, getLogs, clearLogs };
