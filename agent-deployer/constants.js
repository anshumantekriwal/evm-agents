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

dotenv.config();

// Global status object
let currentStatus = {
  phase: "initializing",
  walletAddress: null,
  polBalance: 0,
  lastMessage: "Starting...",
  trades: [],
  error: null,
  isRunning: false,
};

// Optional callbacks
let onStatusUpdate = (status) => {};
let onLog = (message) => console.log(message);

export function setOnStatusUpdate(callback) {
  onStatusUpdate = callback;
}

export function setOnLog(callback) {
  onLog = callback;
}

function updateStatus(newStatus) {
  currentStatus = { ...currentStatus, ...newStatus };
  onStatusUpdate(currentStatus);
  onLog(
    \`Status updated: \${newStatus.phase || ""} - \${
      newStatus.lastMessage || ""
    }\`
  );
}

export function getCurrentStatus() {
  return currentStatus;
}

export async function withdrawToOwner(tokenAddress, amount) {
  const ownerAddress = process.env.OWNER_ADDRESS;
  if (!ownerAddress) throw new Error("OWNER_ADDRESS not set");

  updateStatus({ lastMessage: "Preparing withdrawal..." });

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
    updateStatus({ lastMessage: \`Withdrawal complete: \${hash}\` });
    return { success: true, hash };
  } catch (error) {
    updateStatus({ error: error.message, lastMessage: "Withdrawal failed" });
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

      console.log(\`Wallet created\`);

      return {
        id,
        address,
      };
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw new Error(\`Failed to create wallet: \${error.message}\`);
    }
  } else {
    console.log(\`Wallet already exists\`);
    const id = process.env.WALLET_ID;
    const address = process.env.WALLET_ADDRESS;

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
    const amount = toWei(fromAmount, tokenDecimals);
    const response = await axios.get(\`\${LIFI_API_BASE}/quote\`, {
      params: {
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAddress,
        fromAmount: amount,
      },
    });

    console.log(\`Quote: \${response.data.estimate}\`);

    return response.data;
  } catch (error) {
    console.error(\`Error fetching LiFi quote: \${error.message}\`);
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
