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
const codeString = require("./constants");

const REGION = process.env.AWS_REGION;
const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;

async function deployAgent({ agentId, ownerAddress, baselineFunction }) {
  console.log(`🚀 Starting deployment for EVM agent: ${agentId}`);
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
  const buildDir = path.join("/tmp", `evm-agent-${agentId}`);
  fs.mkdirSync(buildDir, { recursive: true });
  console.log(`📂 Build directory created: ${buildDir}`);

  // Copy the baseline files from the baseline folder
  console.log("📄 Copying baseline files...");
  const baselineDir = path.join(process.cwd(), "./baseline");

  // Copy baseline.js
  fs.copyFileSync(
    path.join(baselineDir, "index.js"),
    path.join(buildDir, "index.js")
  );

  // Copy utils.js
  fs.copyFileSync(
    path.join(baselineDir, "utils.js"),
    path.join(buildDir, "utils.js")
  );

  // Copy logging.js (new file)
  fs.copyFileSync(
    path.join(baselineDir, "logging.js"),
    path.join(buildDir, "logging.js")
  );

  // Copy tokens.json
  fs.copyFileSync(
    path.join(baselineDir, "tokens.json"),
    path.join(buildDir, "tokens.json")
  );

  console.log("✅ Baseline files copied");

  console.log("📝 Generating agent code...");
  const agentCode = `
  ${codeString}
  ${baselineFunction}
  `;

  console.log(agentCode);

  fs.writeFileSync(path.join(buildDir, "baseline.js"), agentCode);
  console.log("✅ Agent code generated and saved");

  console.log("📦 Creating package.json...");
  const packageJson = {
    name: `evm-agent-${agentId}`,
    version: "1.0.0",
    type: "module",
    main: "index.js",
    scripts: { start: "node index.js" },
    dependencies: {
      "@lifi/sdk": "^3.7.9",
      "@privy-io/server-auth": "^1.27.4",
      "@supabase/supabase-js": "^2.51.0",
      axios: "^1.10.0",
      cors: "^2.8.5",
      dotenv: "^16.5.0",
      ethers: "^6.14.4",
      express: "^5.1.0",
      "node-cron": "^4.1.1",
      privy: "^0.4.1",
      ws: "^8.18.0",
    },
  };
  fs.writeFileSync(
    path.join(buildDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  console.log("✅ package.json created");

  console.log("🐳 Creating Dockerfile...");
  fs.writeFileSync(
    path.join(buildDir, "Dockerfile"),
    `
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`
  );
  console.log("✅ Dockerfile created");

  const repoName = `evm-${agentId}`;
  const imageUri = `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${repoName}:latest`;
  console.log(`🏗️  ECR Repository: ${repoName}`);
  console.log(`🖼️  Image URI: ${imageUri}`);

  // Create ECR repo
  console.log("🔧 Creating ECR repository...");
  const ecr = new ECRClient({ region: REGION });
  try {
    await ecr.send(new CreateRepositoryCommand({ repositoryName: repoName }));
    console.log("✅ ECR repository created");
  } catch (err) {
    if (!err.name.includes("RepositoryAlreadyExists")) {
      console.error("❌ Failed to create ECR repository:", err);
      throw err;
    }
    console.log("ℹ️  ECR repository already exists");
  }

  console.log("🐳 Initializing Docker...");
  const docker = new Docker();

  // Build image
  console.log("🔨 Building Docker image...");
  const tarStream = await docker.buildImage(
    {
      context: buildDir,
      src: [
        "Dockerfile",
        "index.js",
        "baseline.js",
        "utils.js",
        "logging.js",
        "tokens.json",
        "package.json",
      ],
    },
    {
      t: imageUri,
      platform: "linux/amd64", // Force AMD64 for AWS compatibility
    }
  );

  console.log("⏳ Waiting for Docker build to complete...");
  await new Promise((resolve, reject) => {
    docker.modem.followProgress(tarStream, (err, res) => {
      if (err) {
        console.error("❌ Docker build failed:", err);
        reject(err);
      } else {
        console.log("✅ Docker image built successfully");
        resolve(res);
      }
    });
  });

  // Get ECR authentication
  console.log("🔐 Getting ECR authorization token...");
  const authTokenCommand = new GetAuthorizationTokenCommand({});
  const authTokenResponse = await ecr.send(authTokenCommand);
  const authToken = authTokenResponse.authorizationData[0].authorizationToken;
  const decodedToken = Buffer.from(authToken, "base64").toString("utf-8");
  const [username, password] = decodedToken.split(":");
  console.log("✅ ECR authorization token obtained");

  // Push image
  console.log("⬆️  Pushing Docker image to ECR...");
  const image = docker.getImage(imageUri);
  await image.push({
    authconfig: {
      username: username,
      password: password,
      serveraddress: `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com`,
    },
  });
  console.log("✅ Docker image pushed to ECR");

  // Deploy to App Runner
  console.log("🚀 Deploying to AWS App Runner...");
  const appRunner = new AppRunnerClient({ region: REGION });

  const serviceConfig = {
    ServiceName: `evm-${agentId}`,
    SourceConfiguration: {
      ImageRepository: {
        ImageIdentifier: imageUri,
        ImageRepositoryType: "ECR",
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
            AGENT_ID: agentId || "",
            NODE_ENV: "production",
            PORT: "3000",
          },
        },
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
  };

  console.log(
    "📋 App Runner configuration:",
    JSON.stringify(serviceConfig, null, 2)
  );

  const createSvc = await appRunner.send(
    new CreateServiceCommand(serviceConfig)
  );

  const serviceUrl = createSvc.Service.ServiceUrl;
  console.log("🎉 EVM Agent deployment completed successfully!");
  console.log(`🌐 Service URL: ${serviceUrl}`);
  console.log(`📊 Service ARN: ${createSvc.Service.ServiceArn}`);

  return serviceUrl;
}

module.exports = deployAgent;
