const codeString = `
import {
  checkBalance,
  writeToEnvFile,
  toWei,
  getTokenDecimals,
  weiToHex,
  getTokenInfo,
  getTokenMarketData,
  getBalances,
} from "./utils.js";
import { PrivyClient } from "@privy-io/server-auth";
import axios from "axios";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { log, updateStatus as loggerUpdateStatus } from "./logging.js";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

dotenv.config();

// Global status object
let currentStatus = {
  phase: "initializing",
  walletAddress: null,
  polBalance: 0,
  lastMessage: "Starting...",
  nextStep: "Creating wallet",
  trades: [],
  error: null,
  isRunning: false,
};

// Optional callbacks
let onStatusUpdate = (status) => {};

export function setOnStatusUpdate(callback) {
  onStatusUpdate = callback;
}

export function setOnLog(callback) {
  // Override default logging behavior if needed
  log.callback = callback;
}

// Function to update agent wallet address in database
async function updateAgentWalletAddress(walletAddress) {
  try {
    const agentId = process.env.AGENT_ID;
    if (!agentId) {
      log("AGENT_ID not set in environment", "error");
      return;
    }

    const { error } = await supabase
      .from("evm-agents")
      .update({
        agent_wallet: walletAddress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(agentId));

    if (error) {
      log(\`Failed to update agent wallet address: \${error.message}\`, "error");
    } else {
      log(\`Agent wallet address updated: \${walletAddress}\`, "success");
    }
  } catch (error) {
    log(\`Error updating agent wallet address: \${error.message}\`, "error");
  }
}

// Status update wrapper
function updateStatus(newStatus) {
  currentStatus = loggerUpdateStatus(currentStatus, newStatus);
  onStatusUpdate(currentStatus);
}

export function getCurrentStatus() {
  return currentStatus;
}

export async function withdrawToOwner(tokenAddress, amount) {
  const ownerAddress = process.env.OWNER_ADDRESS;
  if (!ownerAddress) throw new Error("OWNER_ADDRESS not set");

  updateStatus({
    phase: "withdrawing",
    lastMessage: "Preparing withdrawal...",
    nextStep: "Executing withdrawal transaction",
  });

  let txRequest;
  if (
    tokenAddress.toLowerCase() === "0x0" ||
    tokenAddress === "0x0000000000000000000000000000000000000000"
  ) {
    const amountWei = toWei(amount, 18);
    txRequest = {
      to: ownerAddress,
      value: weiToHex(amountWei),
    };
  } else {
    const decimals = getTokenDecimals(POLYGON_CHAIN_ID, tokenAddress);
    const amountWei = toWei(amount, decimals);
    const data = new ethers.utils.Interface(ERC20_ABI).encodeFunctionData(
      "transfer",
      [ownerAddress, amountWei]
    );
    txRequest = {
      to: tokenAddress,
      data,
      value: "0",
    };
  }

  try {
    const { hash } = await sendTransaction(txRequest);
    currentStatus.trades.push({
      timestamp: new Date().toISOString(),
      type: "withdrawal",
      details: \`Withdrew \${amount} from \${tokenAddress} - Hash: \${hash}\`,
    });
    updateStatus({
      phase: "withdrawal_complete",
      lastMessage: \`Withdrawal complete: \${hash}\`,
      nextStep: "Returning to normal operations",
    });
    return { success: true, hash };
  } catch (error) {
    updateStatus({
      phase: "error",
      error: error.message,
      lastMessage: "Withdrawal failed",
      nextStep: "Attempting to retry withdrawal",
    });
    throw error;
  }
}

// Add ERC20_ABI (minimal)
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
];

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
);

const LIFI_API_BASE = "https://li.quest/v1";
const POLYGON_CHAIN_ID = "137";

/**
 * Creates a wallet and returns wallet details
 * @param {string} ownerAddress - The owner address for the wallet
 * @param {string} chainType - The blockchain type (e.g., "ethereum", "polygon")
 * @returns {Promise<{id: string, address: string, chainType: string}>} Wallet details
 */
export async function createWallet(ownerAddress) {
  if (!process.env.WALLET_ID) {
    const chainType = "ethereum";
    try {
      const {
        id,
        address,
        chainType: createdChainType,
      } = await privy.walletApi.createWallet({
        chainType,
        ownerAddress,
      });

      await writeToEnvFile(id, address);

      process.env.WALLET_ID = id;
      process.env.WALLET_ADDRESS = address;

      // Update the evm-agents table with the wallet address
      await updateAgentWalletAddress(address);

      log(\`Wallet created: \${address}\`, "success");

      return {
        id,
        address,
      };
    } catch (error) {
      log(\`Error creating wallet: \${error.message}\`, "error");
      throw new Error(\`Failed to create wallet: \${error.message}\`);
    }
  } else {
    log(\`Wallet already exists: \${process.env.WALLET_ADDRESS}\`, "info");
    const id = process.env.WALLET_ID;
    const address = process.env.WALLET_ADDRESS;

    // Ensure the wallet address is updated in the database (in case it wasn't before)
    await updateAgentWalletAddress(address);

    return {
      id,
      address,
    };
  }
}

/**
 * Get LiFi swap quote
 * @param {string} fromToken - Source token address
 * @param {string} toToken - Destination token address
 * @param {string} fromAddress - User wallet address
 * @param {string} fromAmount - Amount to swap (in wei)
 * @param {string} fromChain - Source chain ID (default: "137")
 * @param {string} toChain - Destination chain ID (default: "137")
 * @returns {Promise<Object>} Swap quote data
 */
export async function swap(
  fromToken,
  toToken,
  fromAddress,
  fromAmount,
  fromChain = POLYGON_CHAIN_ID,
  toChain = POLYGON_CHAIN_ID
) {
  try {
    const tokenDecimals = getTokenDecimals(fromChain, fromToken);
    const roundedAmount = Number(Number(fromAmount).toFixed(18));
    const amount = toWei(roundedAmount, tokenDecimals);
    const params = {
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAddress,
      fromAmount: amount,
    };
    log(\`Params: \${JSON.stringify(params)}\`, "info");
    const response = await axios.get(\`\${LIFI_API_BASE}/quote\`, {
      params,
    });

    log(\`Quote received: \${JSON.stringify(response.data.estimate)}\`, "info");

    return response.data;
  } catch (error) {
    log(\`Error fetching LiFi quote: \${error}\`, "error");
    throw new Error(\`Swap quote failed: \${error.message}\`);
  }
}

export async function sendTransaction(transaction) {
  const { hash, caip2 } = await privy.walletApi.ethereum.sendTransaction({
    walletId: process.env.WALLET_ID,
    caip2: "eip155:137",
    transaction,
  });

  return { hash, caip2 };
}

`;

module.exports = codeString;
