require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const http = require("http");
const url = require("url");
const deployAgent = require("./deploy");
const { getAgentLogs, streamAgentLogs } = require("./logs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// API Key Auth Middleware
const API_KEY = process.env.API_KEY;
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  console.log(
    `🔐 [AUTH] ${req.method} ${req.path} - API Key provided: ${
      apiKey ? "Yes" : "No"
    }`
  );
  if (!apiKey || apiKey !== API_KEY) {
    console.log(`❌ [AUTH] ${req.method} ${req.path} - Authentication failed`);
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid or missing API key." });
  }
  console.log(
    `✅ [AUTH] ${req.method} ${req.path} - Authentication successful`
  );
  next();
});

app.post("/deploy-agent", async (req, res) => {
  const { agentId, ownerAddress, baselineFunction } = req.body;

  console.log(`🚀 [DEPLOY] Starting deployment for EVM agent: ${agentId}`);
  console.log(`📋 [DEPLOY] Agent details:`, {
    agentId,
    hasOwnerAddress: !!ownerAddress,
  });

  try {
    const agentUrl = await deployAgent({
      agentId,
      ownerAddress,
      baselineFunction,
    });
    console.log(
      `✅ [DEPLOY] Successfully deployed EVM agent ${agentId} to: ${agentUrl}`
    );
    res.status(200).json({ agentUrl });
  } catch (err) {
    console.error(`❌ [DEPLOY] Failed to deploy EVM agent ${agentId}:`, err);
    res.status(500).json({ error: "Failed to deploy agent." });
  }
});

app.get("/logs/:agentId", async (req, res) => {
  const { agentId } = req.params;
  const { lines = 500 } = req.query;

  console.log(`📊 [LOGS] Fetching logs for agent: ${agentId}`);
  console.log(`📋 [LOGS] Requested lines: ${lines}`);

  try {
    const logs = await getAgentLogs(agentId, parseInt(lines));

    console.log(
      `✅ [LOGS] Successfully retrieved ${logs.totalEvents} log events for agent ${agentId}`
    );
    console.log(`📊 [LOGS] Log group: ${logs.logGroupName}`);

    res.status(200).json({ logs });
  } catch (err) {
    console.error(
      `❌ [LOGS] Failed to retrieve logs for agent ${agentId}:`,
      err
    );
    res.status(500).json({ error: "Failed to retrieve agent logs." });
  }
});

app.get("/", (req, res) => {
  console.log(`🏠 [HEALTH] Health check request received`);
  res.send("EVM Agent Deployer is live");
});

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({
  server,
  verifyClient: (info) => {
    // Allow all paths that start with /logs-stream
    return info.req.url.startsWith("/logs-stream");
  },
});

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log(`🔌 [WS] WebSocket connection attempt - URL: ${req.url}`);
  console.log(`🔌 [WS] Pathname: ${pathname}`);

  // Extract agentId from path: /logs-stream/agentId
  const pathParts = pathname.split("/").filter((part) => part !== "");
  console.log(`🔌 [WS] Path parts:`, pathParts);

  if (pathParts.length < 2 || pathParts[0] !== "logs-stream") {
    console.log(`❌ [WS] Invalid path structure: ${pathname}`);
    ws.send(
      JSON.stringify({ error: "Invalid path. Use /logs-stream/agentId" })
    );
    ws.close();
    return;
  }

  const agentId = pathParts[1];

  if (!agentId) {
    console.log(`❌ [WS] Agent ID is missing from path: ${pathname}`);
    ws.send(JSON.stringify({ error: "Agent ID is required" }));
    ws.close();
    return;
  }

  // Check API key authentication
  const apiKey = query.apiKey;
  if (!apiKey || apiKey !== API_KEY) {
    console.log(
      `❌ [WS-AUTH] WebSocket connection rejected for agent ${agentId} - Invalid API key`
    );
    ws.send(
      JSON.stringify({ error: "Unauthorized: Invalid or missing API key" })
    );
    ws.close();
    return;
  }

  console.log(`🔌 [WS] WebSocket connection established for agent: ${agentId}`);

  const lines = query.lines ? parseInt(query.lines) : 500;
  streamAgentLogs(agentId, ws, lines);
});

server.listen(PORT, () => {
  console.log(`🚀 [SERVER] EVM Agent Deployer running on port ${PORT}`);
  console.log(`🔐 [SERVER] API Key authentication enabled`);
  console.log(
    `🔌 [SERVER] WebSocket server enabled at ws://localhost:${PORT}/logs-stream`
  );
});
