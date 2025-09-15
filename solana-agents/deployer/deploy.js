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

/**
 * Deploy a Solana trading agent with custom configuration
 * 
 * @param {Object} params - Deployment parameters
 * @param {string} params.agentId - Unique identifier for the agent
 * @param {string} params.ownerAddress - Solana wallet owner address
 * @param {Object} params.swapConfig - Trading configuration
 * @param {string} params.swapConfig.fromToken - Source token symbol (e.g., 'USDC')
 * @param {string} params.swapConfig.toToken - Destination token symbol (e.g., 'SOL')
 * @param {number} params.swapConfig.amount - Amount to trade
 * @param {string} params.swapConfig.scheduleType - 'interval' or 'times'
 * @param {number|string|array} params.swapConfig.scheduleValue - Interval (ms or string like '30m') or array of UTC times
 * @param {boolean} params.swapConfig.executeImmediately - Execute immediately on start (default: true)
 * 
 * @example
 * // Interval-based trading
 * deployAgent({
 *   agentId: 'my-agent-1',
 *   ownerAddress: '5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ',
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
 * // Time-based trading
 * deployAgent({
 *   agentId: 'my-agent-2',
 *   ownerAddress: '5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ',
 *   swapConfig: {
 *     fromToken: 'SOL',
 *     toToken: 'USDC',
 *     amount: 0.005,
 *     scheduleType: 'times',
 *     scheduleValue: ['09:30', '15:30'], // UTC times
 *     executeImmediately: false
 *   }
 * });
 */
async function deployAgent({ agentId, ownerAddress, swapConfig }) {
  console.log(`🚀 Starting deployment for Solana agent: ${agentId}`);
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
    "baseline.js",
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
  
  // If swapConfig is provided, customize the trading configuration
  if (swapConfig) {
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
    
    // Create the trading configuration code to append
    const tradingConfigCode = `

// Deployment-specific configuration
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

createServer(SERVER_PORT, tradingConfig);`;

    // Append the configuration to the end of the file
    serverContent += tradingConfigCode;
  } else {
    // If no swapConfig provided, append default configuration with provided owner address
    const defaultConfigCode = `

// Deployment-specific configuration
const tradingConfig = {
    ownerAddress: "${ownerAddress}",
    fromToken: 'USDC',
    toToken: 'SOL', 
    amount: 0.01,
    scheduleOptions: {
        executeImmediately: true,
        type: 'interval',
        value: 600000, // 10 minutes in milliseconds
    }
};

createServer(SERVER_PORT, tradingConfig);`;

    // Append the configuration to the end of the file
    serverContent += defaultConfigCode;
  }

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
        "baseline.js",
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
