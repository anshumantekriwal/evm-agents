const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Docker = require("dockerode");
const {
  ECRClient,
  CreateRepositoryCommand,
  GetAuthorizationTokenCommand,
} = require("@aws-sdk/client-ecr");
const {
  AppRunnerClient,
  CreateServiceCommand,
} = require("@aws-sdk/client-apprunner");

const REGION = process.env.AWS_REGION || "us-east-1";
const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;

// =============================
// ======= CODE GENERATION UTILITIES =======
// =============================

/**
 * Generate custom code using sample template (for testing)
 * @param {string} prompt - Natural language prompt
 * @param {Array} history - Conversation history (optional)
 * @returns {Promise<Object>} Generated code result
 */
async function generateCustomCode(prompt, history = []) {
  try {
    console.log(`🤖 Using sample generated code for prompt: ${prompt}`);
    
    // Read the sample generated code
    const sampleCodePath = path.join(__dirname, 'sample-generated-code.js');
    
    if (!fs.existsSync(sampleCodePath)) {
      throw new Error('Sample generated code file not found');
    }
    
    const sampleCode = fs.readFileSync(sampleCodePath, 'utf8');
    
    console.log(`✅ Sample code loaded successfully`);
    return {
      success: true,
      code: sampleCode,
      metadata: {
        prompt: prompt,
        generatedAt: new Date().toISOString(),
        source: 'sample-template'
      }
    };
    
  } catch (error) {
    console.error(`❌ Code generation failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean and validate generated code for deployment
 * @param {string} rawCode - Raw generated code
 * @returns {string} Cleaned code ready for deployment
 */
function cleanGeneratedCode(rawCode) {
  try {
    // Remove any leading/trailing whitespace
    let cleanCode = rawCode.trim();
    
    // Ensure the code starts with proper export
    if (!cleanCode.includes('export')) {
      console.log('⚠️ Generated code missing export, adding export statement');
      cleanCode = cleanCode.replace(/^(async\s+)?function\s+baselineFunction/, 'export async function baselineFunction');
    }
    
    // Ensure proper line endings
    if (!cleanCode.endsWith('\n')) {
      cleanCode += '\n';
    }
    
    console.log(`✅ Code cleaned and validated`);
    return cleanCode;
    
  } catch (error) {
    console.error(`❌ Error cleaning generated code: ${error.message}`);
    throw error;
  }
}

/**
 * Deploy a Solana trading agent with custom configuration
 * 
 * @param {Object} params - Deployment parameters
 * @param {string} params.agentId - Unique identifier for the agent
 * @param {string} params.ownerAddress - Solana wallet owner address
 * @param {string} params.botType - Type of bot: 'dca', 'range', or 'custom' (default: 'dca')
 * @param {Object} params.swapConfig - Trading configuration
 * @param {string} params.swapConfig.fromToken - Source token symbol (e.g., 'USDC')
 * @param {string} params.swapConfig.toToken - Destination token symbol (e.g., 'SOL')
 * @param {number} params.swapConfig.amount - Amount to trade
 * 
 * DCA Bot specific:
 * @param {string} params.swapConfig.scheduleType - 'interval' or 'times'
 * @param {number|string|array} params.swapConfig.scheduleValue - Interval (ms or string like '30m') or array of UTC times
 * @param {boolean} params.swapConfig.executeImmediately - Execute immediately on start (default: true)
 * 
 * Range Bot specific:
 * @param {string} params.swapConfig.tokenToMonitor - Token symbol to monitor for price conditions
 * @param {number} params.swapConfig.tokenToMonitorPrice - Target price threshold
 * @param {boolean} params.swapConfig.above - True for above price condition, false for below (default: true)
 * 
 * Custom Bot specific:
 * @param {string} params.swapConfig.prompt - Natural language prompt for code generation
 * @param {Array} params.swapConfig.history - Optional conversation history for context
 * 
 * @example
 * // DCA Bot - Interval-based trading
 * deployAgent({
 *   agentId: 'my-dca-agent',
 *   ownerAddress: '5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ',
 *   botType: 'dca',
 *   swapConfig: {
 *     fromToken: 'USDC',
 *     toToken: 'SOL',
 *     amount: 0.01,
 *     scheduleType: 'interval',
 *     scheduleValue: '30m', // or 1800000 (ms)
 *     executeImmediately: true
 *   }
 * });
 * 
 * @example
 * // Range Bot - Price-based trading
 * deployAgent({
 *   agentId: 'my-range-agent',
 *   ownerAddress: '5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ',
 *   botType: 'range',
 *   swapConfig: {
 *     fromToken: 'USDC',
 *     toToken: 'SOL',
 *     amount: 0.01,
 *     tokenToMonitor: 'SOL',
 *     tokenToMonitorPrice: 100,
 *     above: true
 *   }
 * });
 * 
 * @example
 * // Custom Bot - AI-generated trading logic
 * deployAgent({
 *   agentId: 'my-custom-agent',
 *   ownerAddress: '5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ',
 *   botType: 'custom',
 *   swapConfig: {
 *     prompt: 'Buy 0.1 SOL with USDC every hour if Bitcoin is above $50000',
 *     history: []
 *   }
 * });
 */
async function deployAgent({ agentId, ownerAddress, botType = 'dca', swapConfig }) {
  console.log(`🚀 Starting deployment for Solana agent: ${agentId}`);
  console.log(`🤖 Bot Type: ${botType}`);
  console.log(`📍 Region: ${REGION}`);
  console.log(`🏢 Account ID: ${ACCOUNT_ID}`);

  // Validate required environment variables
  if (!REGION) {
    throw new Error("AWS_REGION environment variable is required");
  }
  if (!ACCOUNT_ID) {
    throw new Error("AWS_ACCOUNT_ID environment variable is required");
  }
  if (!process.env.AWS_ACCESS_KEY_ID) {
    throw new Error("AWS_ACCESS_KEY_ID environment variable is required");
  }
  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS_SECRET_ACCESS_KEY environment variable is required");
  }

  console.log("✅ Environment variables validated");

  console.log("📁 Creating build directory...");
  const buildDir = path.join("/tmp", `agent-${agentId}`);
  fs.mkdirSync(buildDir, { recursive: true });
  console.log(`📂 Build directory created: ${buildDir}`);

  // Copy the solana-agents files
  console.log("📄 Copying Solana agent files...");
  const sourceDir = path.join(__dirname, "..", "baseline");

  // Copy core files
  const filesToCopy = [
    "server.js",
    "baseline-dca.js",
    "baseline-range.js", 
    "logger.js", 
    "scheduler.js",
    "trading.js",
    "wallet.js",
    "package.json"
  ];

  filesToCopy.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(buildDir, file);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`📄 Copied ${file}`);
    } else {
      console.warn(`⚠️  File not found: ${file}`);
    }
  });

  // Update package.json to have correct start script
  console.log("🔧 Updating package.json start script...");
  const packageJsonPath = path.join(buildDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.scripts.start = "node server.js";
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log("✅ Package.json updated");

  // Create environment file with deployment-specific config
  console.log("🔧 Creating environment configuration...");
  const envContent = `
PRIVY_APP_ID=${process.env.PRIVY_APP_ID}
PRIVY_APP_SECRET=${process.env.PRIVY_APP_SECRET}
TATUM_API_KEY=${process.env.TATUM_API_KEY}
VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY}
MOBULA_API_KEY=${process.env.MOBULA_API_KEY}
OWNER_ADDRESS=${ownerAddress}
AGENT_ID=${agentId}
LOG_SERVER_PORT=3000
`.trim();

  fs.writeFileSync(path.join(buildDir, ".env"), envContent);
  console.log("✅ Environment file created");

  // Create a customized server.js with the specific configuration
  console.log("🔧 Customizing server configuration...");
  let serverContent = fs.readFileSync(path.join(buildDir, "server.js"), "utf8");
  
  // Generate configuration based on bot type
  console.log(`🤖 Configuring ${botType.toUpperCase()} bot...`);
  
  // Generate configuration based on bot type and swapConfig
  let configCode;
  
  if (botType === 'dca') {
    // DCA Bot Configuration
      const { 
        fromToken, 
        toToken, 
        amount, 
        scheduleType = 'interval',
        scheduleValue,
        executeImmediately = true 
      } = swapConfig;
      
      // Convert interval string to milliseconds if needed
      let intervalMs = scheduleValue;
      if (scheduleType === 'interval' && typeof scheduleValue === 'string') {
        // Convert time strings like '30m', '1h', '30s' to milliseconds
        const timeMatch = scheduleValue.match(/^(\d+)([smh])$/);
        if (timeMatch) {
          const [, num, unit] = timeMatch;
          const multipliers = { s: 1000, m: 60000, h: 3600000 };
          intervalMs = parseInt(num) * multipliers[unit];
        }
      }
      
      configCode = `

// DCA Bot Configuration
const tradingConfig = {
    ownerAddress: "${ownerAddress}",
    fromToken: '${fromToken}',
    toToken: '${toToken}', 
    amount: ${amount},
    scheduleOptions: {
        executeImmediately: ${executeImmediately},
        type: '${scheduleType}',
        value: ${scheduleType === 'times' ? JSON.stringify(scheduleValue) : intervalMs}, ${scheduleType === 'interval' ? '// ' + scheduleValue : '// UTC times'}
    }
};

createServer(SERVER_PORT, tradingConfig, 'dca');`;

  } else if (botType === 'range') {
    // Range Bot Configuration
      const { 
        fromToken, 
        toToken, 
        amount,
        tokenToMonitor,
        tokenToMonitorPrice,
        above = true
      } = swapConfig;
      
      configCode = `

// Range Bot Configuration
const tradingConfig = {
    ownerAddress: "${ownerAddress}",
    fromToken: '${fromToken}',
    toToken: '${toToken}', 
    amount: ${amount},
    tokenToMonitor: '${tokenToMonitor}',
    tokenToMonitorPrice: ${tokenToMonitorPrice},
    above: ${above}
};

createServer(SERVER_PORT, tradingConfig, 'range');`;

  } else if (botType === 'custom') {
    // Custom Bot Configuration - Generate code first
    const { prompt, history = [] } = swapConfig;
    
    if (!prompt) {
      throw new Error('Custom bot requires a prompt in swapConfig');
    }
    
    console.log(`🤖 Generating custom code for prompt: ${prompt}`);
    
    // Generate code using the API
    const codeGenResult = await generateCustomCode(prompt, history);
    
    if (!codeGenResult.success) {
      throw new Error(`Code generation failed: ${codeGenResult.error}`);
    }
    
    // Clean the generated code
    const cleanCode = cleanGeneratedCode(codeGenResult.code);
    
    // Append the generated code to baseline.js
    const baselineFilePath = path.join(buildDir, "baseline.js");
    let baselineContent = fs.readFileSync(baselineFilePath, "utf8");
    
    // Check if there's already a generated function and remove it
    if (baselineContent.includes('// ======= GENERATED BASELINE FUNCTION =======')) {
      console.log('⚠️ Existing generated function found, replacing...');
      const beforeGenerated = baselineContent.split('// ======= GENERATED BASELINE FUNCTION =======')[0];
      baselineContent = beforeGenerated.trim() + '\n';
    }
    
    // Add separator and generated code
    const separator = '\n// =============================\n// ======= GENERATED BASELINE FUNCTION =======\n// =============================\n\n';
    baselineContent += separator + cleanCode;
    
    // Write the updated baseline.js
    fs.writeFileSync(baselineFilePath, baselineContent);
    console.log(`✅ Generated code appended to baseline.js`);
    
    // Create simple configuration for custom bot execution
    configCode = `

// Custom Bot Configuration
const tradingConfig = {
    ownerAddress: "${ownerAddress}",
    prompt: "${prompt.replace(/"/g, '\\"')}" // Escaped for safety
};

createServer(SERVER_PORT, tradingConfig, 'custom');`;

  } else {
    throw new Error(`Unsupported bot type: ${botType}. Must be 'dca', 'range', or 'custom'`);
  }
  
  // Append the configuration to the end of the file
  serverContent += configCode;

  fs.writeFileSync(path.join(buildDir, "server.js"), serverContent);
  console.log("✅ Server configuration customized");

  // Create Dockerfile
  console.log("🐳 Creating Dockerfile...");
  const dockerfile = `
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
`;

  fs.writeFileSync(path.join(buildDir, "Dockerfile"), dockerfile);
  console.log("✅ Dockerfile created");

  // Create .dockerignore
  const dockerignore = `
node_modules
npm-debug.log
.git
.gitignore
README.md
.env.example
.nyc_output
coverage
.DS_Store
*.log
`;
  fs.writeFileSync(path.join(buildDir, ".dockerignore"), dockerignore);

  console.log("🐳 Building Docker image...");
  const docker = new Docker();
  const imageName = `agent-${agentId}`;
  const imageTag = `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${imageName}:latest`;

  const buildStream = await docker.buildImage(
    {
      context: buildDir,
      src: [
        "Dockerfile",
        "server.js",
        "baseline-dca.js",
        "baseline-range.js",
        "logger.js",
        "scheduler.js", 
        "trading.js",
        "wallet.js",
        "package.json",
        ".env"
      ],
    },
    {
      t: imageTag,
      platform: "linux/amd64", // Force AMD64 for AWS compatibility
    }
  );

  await new Promise((resolve, reject) => {
    docker.modem.followProgress(buildStream, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

  console.log("✅ Docker image built successfully");

  // Create ECR repository
  console.log("📦 Creating ECR repository...");
  const ecrClient = new ECRClient({ region: REGION });

  try {
    await ecrClient.send(
      new CreateRepositoryCommand({
        repositoryName: imageName,
        imageScanningConfiguration: {
          scanOnPush: false,
        },
      })
    );
    console.log("✅ ECR repository created");
  } catch (error) {
    if (error.name === "RepositoryAlreadyExistsException") {
      console.log("📦 ECR repository already exists");
    } else {
      throw error;
    }
  }

  // Get ECR login token
  console.log("🔐 Getting ECR authorization token...");
  const authResponse = await ecrClient.send(
    new GetAuthorizationTokenCommand({})
  );

  const authToken = authResponse.authorizationData[0].authorizationToken;
  const [username, password] = Buffer.from(authToken, "base64")
    .toString()
    .split(":");

  // Push image to ECR
  console.log("📤 Pushing image to ECR...");
  const image = docker.getImage(imageTag);

  const authconfig = {
    username,
    password,
    serveraddress: `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com`,
  };

  const pushStream = await image.push({
    authconfig,
  });

  await new Promise((resolve, reject) => {
    docker.modem.followProgress(pushStream, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

  console.log("✅ Image pushed to ECR successfully");

  // Deploy to App Runner
  console.log("🚀 Deploying to AWS App Runner...");
  const appRunnerClient = new AppRunnerClient({ region: REGION });

  const serviceName = `agent-${agentId}`;
  const createServiceResponse = await appRunnerClient.send(
    new CreateServiceCommand({
      ServiceName: serviceName,
      SourceConfiguration: {
        ImageRepository: {
          ImageIdentifier: imageTag,
          ImageConfiguration: {
            Port: "3000",
            RuntimeEnvironmentVariables: {
              API_KEY: process.env.API_KEY || "",
              OWNER_ADDRESS: ownerAddress || "",
              PRIVY_APP_ID: process.env.PRIVY_APP_ID || "",
              PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET || "",
              TATUM_API_KEY: process.env.TATUM_API_KEY || "",
              VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "",
              VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || "",
              MOBULA_API_KEY: process.env.MOBULA_API_KEY || "",
              AGENT_ID: String(agentId) || "",
              NODE_ENV: "production",
              PORT: "3000",
            },
          },
          ImageRepositoryType: "ECR",
        },
        AuthenticationConfiguration: {
          AccessRoleArn: `arn:aws:iam::${ACCOUNT_ID}:role/AppRunnerECRAccessRole`,
        },
        AutoDeploymentsEnabled: false,
      },
      InstanceConfiguration: {
        Cpu: "512",
        Memory: "1024",
      },
      HealthCheckConfiguration: {
        Protocol: "HTTP",
        Path: "/health",
        Interval: 20,
        Timeout: 5,
        HealthyThreshold: 1,
        UnhealthyThreshold: 5,
      },
    })
  );

  const serviceUrl = createServiceResponse.Service.ServiceUrl;
  console.log(`✅ App Runner service created: ${serviceUrl}`);

  // Cleanup build directory
  console.log("🧹 Cleaning up build directory...");
  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log("✅ Build directory cleaned up");

  console.log(`🎉 Deployment completed successfully!`);
  console.log(`🌐 Agent URL: https://${serviceUrl}`);
  console.log(`📊 Logs will be available at: /logs/${agentId}`);

  return `https://${serviceUrl}`;
}

module.exports = deployAgent;
