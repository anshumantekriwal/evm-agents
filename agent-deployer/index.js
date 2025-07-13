require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const deployAgent = require("./deploy");

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

app.get("/", (req, res) => {
  console.log(`🏠 [HEALTH] Health check request received`);
  res.send("EVM Agent Deployer is live");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 [SERVER] EVM Agent Deployer running on port ${PORT}`);
  console.log(`🔐 [SERVER] API Key authentication enabled`);
});
