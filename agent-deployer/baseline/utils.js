import { createConfig } from "@lifi/sdk";
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
// Add getGasPrice placeholder (implement in utils.js if needed)
async function getGasPrice() {
  return "30000000000"; // 30 gwei placeholder
}

// Load environment variables
dotenv.config();

// Configure LiFi SDK
createConfig({
  integrator: "Xade AI",
});

// Constants
const LIFI_API_BASE = "https://li.quest/v1";
const POLYGON_CHAIN_ID = "137";
const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

// Load and cache tokens data
let tokensData;
let supportedTokens;
let supportedTokenAddresses;
let nativeTokenInfo;

function initializeTokensData() {
  if (!tokensData) {
    tokensData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "tokens.json"), "utf8")
    );
    supportedTokens = tokensData.tokens[POLYGON_CHAIN_ID] || [];

    // Create optimized lookups
    supportedTokenAddresses = new Set(
      supportedTokens.map((token) => token.address.toLowerCase())
    );

    // Cache native token info for faster access
    nativeTokenInfo =
      supportedTokens.find(
        (token) => token.address.toLowerCase() === NATIVE_TOKEN_ADDRESS
      ) || {};
  }
}

// Initialize tokens data on module load
initializeTokensData();

/**
 * Load tokens data from JSON file
 * @returns {Object} Tokens data object
 */
function loadTokensData() {
  try {
    const tokensPath = path.join(process.cwd(), "tokens.json");
    const tokensData = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
    return tokensData.tokens;
  } catch (error) {
    console.error("Error loading tokens data:", error.message);
    throw error;
  }
}

/**
 * Get token decimals by symbol or address for a specific chain
 * @param {string} chainId - Chain ID
 * @param {string} tokenSymbolOrAddress - Token symbol or contract address
 * @returns {number} Token decimals
 */
function getTokenDecimals(chainId, tokenSymbolOrAddress) {
  try {
    const tokens = loadTokensData();
    const chainTokens = tokens[chainId];

    if (!chainTokens) {
      throw new Error(`Chain ${chainId} not found in tokens data`);
    }

    console.log("Token Symbol or Address:", tokenSymbolOrAddress);

    // Check if input is an address (starts with 0x and has 42 characters)
    const isAddress =
      tokenSymbolOrAddress.startsWith("0x") &&
      tokenSymbolOrAddress.length === 42;

    let token;
    if (isAddress) {
      // Search by address (case-insensitive)
      token = chainTokens.find(
        (t) => t.address.toLowerCase() === tokenSymbolOrAddress.toLowerCase()
      );
    } else {
      // Search by symbol
      token = chainTokens.find((t) => t.symbol === tokenSymbolOrAddress);
    }

    if (!token) {
      const searchType = isAddress ? "address" : "symbol";
      throw new Error(
        `Token with ${searchType} ${tokenSymbolOrAddress} not found on chain ${chainId}`
      );
    }

    return token.decimals;
  } catch (error) {
    console.error("Error getting token decimals:", error.message);
    throw error;
  }
}

/**
 * Convert human-readable amount to wei format
 * @param {string|number} amount - Human-readable amount
 * @param {number} decimals - Token decimals
 * @returns {string} Amount in wei format
 */
function toWei(amount, decimals) {
  const multiplier = Math.pow(10, decimals);
  const rawAmount = (parseFloat(amount) * multiplier).toString();
  return rawAmount;
}

/**
 * Convert wei amount to human-readable format
 * @param {string|number} rawAmount - Amount in wei format
 * @param {number} decimals - Token decimals
 * @returns {string} Human-readable amount
 */
function fromWei(rawAmount, decimals) {
  const divisor = Math.pow(10, decimals);
  const humanAmount = (parseFloat(rawAmount) / divisor).toString();
  return humanAmount;
}

/**
 * Get token information from LiFi API
 * @param {string} token - Token address
 * @returns {Promise<Object>} Token information in the format:
 * {
 *   address: '0x0000000000000000000000000000000000000000',
 *   chainId: 137,
 *   symbol: 'POL',
 *   decimals: 18,
 *   name: 'Polygon Ecosystem Token',
 *   coinKey: 'POL',
 *   logoURI: 'https://static.debank.com/image/matic_token/logo_url/matic/6f5a6b6f0732a7a235131bd7804d357c.png',
= * }
 */
async function getTokenInfo(token) {
  try {
    const chain = 137;
    const url = `${LIFI_API_BASE}/token`;
    const queryParams = new URLSearchParams({
      chain,
      token,
    });

    const response = await axios.get(`${url}?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching token info:", error.message);
    throw error;
  }
}

/**
 * Fetch token market data from Mobula API by symbol or asset name.
 *
 * The returned object contains detailed market and contract information for the token, including:
 *   - id:                Unique token identifier (number)
 *   - name:              Token name (string)
 *   - symbol:            Token symbol (string)
 *   - decimals:          Default decimals (number)
 *   - logo:              Logo URL (string)
 *   - rank:              Market cap rank (number)
 *   - price:             Current price (number)
 *   - market_cap:        Market capitalization (number)
 *   - market_cap_diluted: Fully diluted market cap (number)
 *   - volume:            24h trading volume (number)
 *   - volume_change_24h: 24h volume change (number)
 *   - volume_7d:         7d trading volume (number)
 *   - liquidity:         Current liquidity (number)
 *   - liquidityMax:      Maximum liquidity (number)
 *   - ath:               All-time high price (number)
 *   - atl:               All-time low price (number)
 *   - off_chain_volume:  Off-chain trading volume (number)
 *   - is_listed:         Whether the token is listed (boolean)
 *   - price_change_1h:   Price change in the last hour (number, %)
 *   - price_change_24h:  Price change in the last 24h (number, %)
 *   - price_change_7d:   Price change in the last 7 days (number, %)
 *   - price_change_1m:   Price change in the last month (number, %)
 *   - price_change_1y:   Price change in the last year (number, %)
 *   - total_supply:      Total supply (number)
 *   - circulating_supply: Circulating supply (number)
 *   - contracts:         Array of contract objects for each supported blockchain, each with:
 *       - address:       Contract address (string)
 *       - blockchainId:  Chain ID (string or number)
 *       - blockchain:    Blockchain name (string)
 *       - decimals:      Token decimals on that chain (number)
 *
 * @param {string} symbol                Token symbol (e.g. "BTC") or asset name (e.g. "bitcoin")
 * @returns {Promise<Object>}           Token market data object as described above
 */
async function getTokenMarketData(symbol) {
  try {
    const url = `https://api.mobula.io/api/1/market/data`;
    const response = await axios.get(`${url}?symbol=${symbol}&chain=137`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching token market data:", error.message);
    throw error;
  }
}

/**
 * Create axios instance with common configuration
 */
const mobulaApi = axios.create({
  baseURL: "https://api.mobula.io/api/1",
  headers: {
    accept: "application/json",
  },
  timeout: 30000, // 30 second timeout
  validateStatus: function (status) {
    return status < 500; // Don't throw for 4xx errors, only 5xx
  },
});

/**
 * Retry helper function with exponential backoff
 */
async function retryApiCall(apiCall, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(
        `API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Get token balances for a wallet address on Polygon.
 *
 * Returns an array of token balance objects in the following format:
 * [
 *   {
 *     chain: 'polygon-mainnet',
 *     address: '<wallet address>',
 *     balance: '<human readable balance>',
 *     denominatedBalance: '<raw balance as string>',
 *     decimals: <number>,
 *     type: 'native' | 'fungible',
 *     tokenAddress: '<token contract address>',
 *     symbol: '<token symbol>',
 *     name: '<token name>',
 *     logoURI: '<token logo url>',
 *     priceUSD: <number>
 *   },
 *   ...
 * ]
 *
 * @param {string} walletAddress - Wallet address to get balances for
 * @returns {Promise<Array>} Array of token balances with enriched metadata
 */
async function getBalances(walletAddress) {
  if (!walletAddress || typeof walletAddress !== "string") {
    throw new Error("Valid wallet address is required");
  }

  console.log(`🔍 Fetching balances for wallet: ${walletAddress}`);

  try {
    // Make API call with retry logic
    const response = await retryApiCall(async () => {
      console.log(`📡 Fetching balances from Mobula...`);
      const response = await mobulaApi.get(
        `/wallet/portfolio?wallet=${walletAddress}&blockchains=137`
      );

      // Check for API errors in response
      if (response.status >= 400) {
        throw new Error(
          `API returned status ${response.status}: ${response.statusText}`
        );
      }

      return response;
    });

    // Validate API response
    if (!response?.data?.data?.assets) {
      console.warn(`⚠️ No balance data returned for wallet: ${walletAddress}`);
      return [];
    }

    const assets = response.data.data.assets;
    console.log(`✅ Found ${assets.length} assets`);

    // Early return if no balances found
    if (assets.length === 0) {
      console.log(`📋 Wallet ${walletAddress} has no token balances`);
      return [];
    }

    // Create token address lookup map for O(1) performance
    const supportedTokenMap = new Map(
      supportedTokens.map((token) => [token.address.toLowerCase(), token])
    );

    // Process balances from Mobula response
    const enrichedBalances = [];

    for (const asset of assets) {
      // Skip assets with no balance
      if (!asset.token_balance || asset.token_balance <= 0) {
        continue;
      }

      // Process each contract balance for this asset
      for (const contractBalance of asset.contracts_balances || []) {
        // Only process Polygon contracts (chainId: "137" or "evm:137")
        const chainId = contractBalance.chainId?.toString();
        if (chainId !== "137" && chainId !== "evm:137") {
          continue;
        }

        const tokenAddress = contractBalance.address?.toLowerCase() || "";
        const isNativeToken =
          tokenAddress === NATIVE_TOKEN_ADDRESS ||
          tokenAddress === "0x0" ||
          tokenAddress === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
          !tokenAddress;

        // Determine token type
        const type = isNativeToken ? "native" : "fungible";

        // For native tokens, use cached info; for others, check if supported
        let tokenInfo = {};
        if (isNativeToken) {
          tokenInfo = {
            symbol: nativeTokenInfo.symbol || "POL",
            name: nativeTokenInfo.name || "Polygon",
            logoURI: nativeTokenInfo.logoURI || asset.asset?.logo || null,
            decimals: 18,
          };
        } else {
          // Check if token is supported
          if (!supportedTokenMap.has(tokenAddress)) {
            continue; // Skip unsupported tokens
          }
          tokenInfo = supportedTokenMap.get(tokenAddress) || {};
        }

        // Create balance object in expected format
        const balanceObj = {
          chain: "polygon-mainnet",
          address: walletAddress,
          balance: contractBalance.balance.toString(),
          denominatedBalance: contractBalance.balanceRaw,
          decimals: contractBalance.decimals || tokenInfo.decimals || 18,
          type: type,
          tokenAddress: isNativeToken
            ? NATIVE_TOKEN_ADDRESS
            : contractBalance.address,
          symbol: tokenInfo.symbol || asset.asset?.symbol || "Unknown",
          name: tokenInfo.name || asset.asset?.name || "Unknown Token",
          logoURI: tokenInfo.logoURI || asset.asset?.logo || null,
          priceUSD: asset.price || 0,
        };

        enrichedBalances.push(balanceObj);
      }
    }

    // Filter out zero balances
    const filteredBalances = enrichedBalances.filter((balance) => {
      const balanceValue = parseFloat(balance.balance || 0);
      return balanceValue > 0;
    });

    if (filteredBalances.length === 0) {
      console.log(
        `📊 Wallet ${walletAddress} has no non-zero supported token balances`
      );
    } else {
      console.log(
        `💰 Found ${filteredBalances.length} non-zero token balances`
      );
    }

    return filteredBalances;
  } catch (error) {
    // Enhanced error logging with more details
    const errorDetails = {
      message: error.message || "Unknown error",
      code: error.code || "No code",
      status: error.response?.status || "No status",
      statusText: error.response?.statusText || "No status text",
      data: error.response?.data || "No response data",
      timeout:
        error.code === "ECONNABORTED" ? "Request timed out" : "No timeout",
      network: error.code === "ENOTFOUND" ? "Network/DNS error" : "Network OK",
    };

    console.error(`❌ Error getting token balances for ${walletAddress}:`);
    console.error("📊 Error details:", JSON.stringify(errorDetails, null, 2));

    // Check for specific error types
    if (error.code === "ECONNABORTED") {
      console.error("🕐 Request timed out - API might be slow");
    } else if (error.code === "ENOTFOUND") {
      console.error("🌐 Network/DNS error - check internet connection");
    } else if (error.response?.status === 401) {
      console.error("🔐 Authentication failed - check API key");
    } else if (error.response?.status === 429) {
      console.error("⏰ Rate limit exceeded - too many requests");
    }

    // Return empty array instead of throwing to allow graceful handling
    return [];
  }
}
async function checkBalance(walletAddress, amount = 0.01) {
  // const walletAddress = "0x9864bB6d8359A7eeA4Ea112Dd82C6134BfD0c611";
  const polTokenSymbol = "POL";

  try {
    const balances = await getBalances(walletAddress);

    // Handle case where no balances are returned
    if (!balances || balances.length === 0) {
      console.log("📋 Wallet has no token balances");
      return {
        success: false,
        polBalance: 0,
        message: "Wallet has no token balances",
      };
    }

    // Find POL token in balances
    const polBalance = balances.find(
      (balance) => balance.symbol === polTokenSymbol
    );

    if (polBalance) {
      const polAmount = parseFloat(polBalance.balance || 0);
      console.log(`💰 Current POL balance: ${polAmount} POL`);

      if (polAmount >= amount) {
        console.log(`✅ Target balance reached! Found ${polAmount} POL`);
        return {
          success: true,
          polBalance: polAmount,
          message: `Target achieved: ${polAmount} POL (target: ${amount} POL)`,
        };
      } else {
        console.log(
          `❌ Insufficient balance: ${polAmount} POL (need ${amount} POL)`
        );
        return {
          success: false,
          polBalance: polAmount,
          message: `Insufficient balance: ${polAmount} POL (need ${amount} POL)`,
        };
      }
    } else {
      // Check if wallet has other tokens but not POL
      const otherTokens = balances.map((b) => b.symbol).join(", ");
      const message = otherTokens
        ? `POL not found. Wallet has: ${otherTokens}`
        : "POL token not found in supported tokens";

      console.log(`🔍 ${message}`);
      return {
        success: false,
        polBalance: 0,
        message,
      };
    }
  } catch (error) {
    console.error("❌ Error checking balance:", error.message);
    return {
      success: false,
      polBalance: 0,
      message: `Error checking balance: ${error.message}`,
    };
  }
}

/**
 * Writes wallet credentials to .env file
 * @param {string} walletId - The wallet ID
 * @param {string} walletAddress - The wallet address
 */
async function writeToEnvFile(walletId, walletAddress) {
  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";

    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // Remove existing WALLET_ID and WALLET_ADDRESS lines if they exist
    const lines = envContent.split("\n");
    const filteredLines = lines.filter(
      (line) =>
        !line.startsWith("WALLET_ID=") && !line.startsWith("WALLET_ADDRESS=")
    );

    // Add new wallet credentials
    filteredLines.push(`WALLET_ID=${walletId}`);
    filteredLines.push(`WALLET_ADDRESS=${walletAddress}`);

    // Write back to .env file
    const newContent =
      filteredLines.filter((line) => line.trim() !== "").join("\n") + "\n";
    fs.writeFileSync(envPath, newContent);

    console.log("✅ Wallet credentials saved to .env file");
  } catch (error) {
    console.error("Error writing to .env file:", error);
    throw new Error(`Failed to write to .env file: ${error.message}`);
  }
}

function weiToHex(weiAmount) {
  return "0x" + BigInt(weiAmount).toString(16);
}

// Export utility functions
export {
  getTokenInfo,
  getTokenDecimals,
  toWei,
  fromWei,
  loadTokensData,
  checkBalance,
  writeToEnvFile,
  weiToHex,
  getTokenMarketData,
  getGasPrice,
  getBalances,
};

// // Example usage (commented out)
// const balances = await getBalances(
//   "0x9864bB6d8359A7eeA4Ea112Dd82C6134BfD0c611"
// );
// console.log(balances);

// await swap(
//   "0x0000000000000000000000000000000000000000",
//   "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
//   "0xB7B01295fF165325823Fd0A9d96e139d65125abc",
//   toWei("0.01", 18),
//   "137",
//   "137"
// );
// console.log(await getTokenInfo("POL"));
