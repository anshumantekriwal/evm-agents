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
      log(`Failed to update agent wallet address: ${error.message}`, "error");
    } else {
      log(`Agent wallet address updated: ${walletAddress}`, "success");
    }
  } catch (error) {
    log(`Error updating agent wallet address: ${error.message}`, "error");
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
    const data = new ethers.Interface(ERC20_ABI).encodeFunctionData(
      "transfer",
      [ownerAddress, amountWei]
    );
    txRequest = {
      to: tokenAddress,
      data,
      value: "0x0",
    };
  }

  try {
    const { hash } = await sendTransaction(txRequest);
    currentStatus.trades.push({
      timestamp: new Date().toISOString(),
      type: "withdrawal",
      details: `Withdrew ${amount} from ${tokenAddress} - Hash: ${hash}`,
    });
    updateStatus({
      phase: "withdrawal_complete",
      lastMessage: `Withdrawal complete: ${hash}`,
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

      log(`Wallet created: ${address}`, "success");

      return {
        id,
        address,
      };
    } catch (error) {
      log(`Error creating wallet: ${error.message}`, "error");
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  } else {
    log(`Wallet already exists: ${process.env.WALLET_ADDRESS}`, "info");
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
    log(`Params: ${JSON.stringify(params)}`, "info");
    const response = await axios.get(`${LIFI_API_BASE}/quote`, {
      params,
    });

    log(`Quote received: ${JSON.stringify(response.data.estimate)}`, "info");

    return response.data;
  } catch (error) {
    log(`Error fetching LiFi quote: ${error}`, "error");
    throw new Error(`Swap quote failed: ${error.message}`);
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

export async function baselineFunction(ownerAddress) {
  // Initialize and create wallet
  updateStatus({
    phase: "initializing",
    lastMessage: "Creating wallet",
    nextStep: "Setting up wallet and checking balance",
    isRunning: true,
  });

  const wallet = await createWallet(ownerAddress);
  log(`Wallet address: ${wallet.address}`, "info");

  updateStatus({
    phase: "checking_balance",
    walletAddress: wallet.address,
    lastMessage: "Wallet created successfully",
    nextStep: "Checking for 0.01 POL balance threshold",
  });

  // Loop until the wallet has at least 0.01 POL
  while (true) {
    try {
      const result = await checkBalance(wallet.address, 0.01);
      log(`Balance check result: ${JSON.stringify(result)}`, "info");

      if (result.success) {
        // Threshold reached: start trading strategy
        updateStatus({
          phase: "monitoring",
          lastMessage: "Target balance reached, launching trading strategy",
          nextStep: "Scheduling periodic USDC purchases",
        });
        log("✅ Target balance achieved! Starting trading strategy", "success");

        // ======= ENTER AI CODE =======
        // Strategy: Buy 0.01 USDC using POL every 20 minutes
        log(
          "Setting up periodic purchase of 0.01 USDC every 20 minutes",
          "info"
        );
        updateStatus({
          phase: "monitoring",
          lastMessage: "Scheduling first trade in 20 minutes",
          nextStep: "Waiting before first execution",
        });

        const intervalId = setInterval(async () => {
          updateStatus({
            phase: "executing_trade",
            lastMessage: "Executing scheduled USDC purchase",
            nextStep: "Waiting for transaction confirmation",
          });
          try {
            // Fetch current market prices
            const polyData = await getTokenMarketData("MATIC");
            const usdcData = await getTokenMarketData("USDC");
            log(
              `POL price: ${polyData.price} USD, USDC price: ${usdcData.price} USD`,
              "info"
            );

            // Compute required POL amount to buy 0.01 USDC
            const usdcAmount = 0.01;
            const requiredPOL = (usdcAmount * usdcData.price) / polyData.price;
            log(`Swapping ${requiredPOL.toFixed(8)} POL for 0.01 USDC`, "info");

            // Execute the swap
            const swapQuote = await swap(
              "0x0000000000000000000000000000000000000000", // POL native
              "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC contract
              wallet.address,
              requiredPOL.toString()
            );
            const txData = swapQuote.transactionRequest;
            const { hash, caip2 } = await sendTransaction(txData);
            log(
              `Swap transaction sent: hash=${hash} caip2=${caip2}`,
              "success"
            );

            updateStatus({
              phase: "monitoring",
              lastMessage: `Trade executed. TX hash: ${hash}`,
              nextStep: "Waiting for next scheduled trade",
              trades: [
                ...(Array.isArray(trades) ? trades : []),
                { hash, timestamp: new Date().toISOString() },
              ],
            });
          } catch (error) {
            log(`Error executing trade: ${error.message}`, "error");
            updateStatus({
              phase: "error",
              error: error.message,
              lastMessage: "Trade execution failed",
              nextStep: "Will retry at next schedule",
            });
          }
        }, 20 * 60 * 1000);

        log("Periodic buyer initialized successfully", "info");
        // ======= END AI CODE =======

        break; // exit balance-check loop once strategy is running
      }

      updateStatus({
        phase: "checking_balance",
        lastMessage: "Target not reached, retrying in 30 seconds",
        nextStep: "Checking balance again in 30 seconds",
      });
      log("❌ Target not reached yet. Retrying in 30 seconds.", "warning");
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    } catch (error) {
      log(`Error checking balance: ${error.message}`, "error");
      updateStatus({
        phase: "error",
        error: error.message,
        lastMessage: "Error checking balance, retrying",
        nextStep: "Retrying balance check in 30 seconds",
      });
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    }
  }
}

// export async function baselineFunction(ownerAddress) {
// // Initialization phase
// updateStatus({
//   phase: "initializing",
//   lastMessage: "Creating wallet",
//   nextStep: "Setting up wallet and checking balance",
//   isRunning: true,
// });
// try {
//   const wallet = await createWallet(ownerAddress);
//   log(`Wallet address: ${wallet.address}`, "info");
//   updateStatus({
//     phase: "checking_balance",
//     walletAddress: wallet.address,
//     lastMessage: "Wallet created successfully",
//     nextStep: "Checking for 0.01 POL balance threshold",
//   });
//   // Loop until the wallet has at least 0.01 POL
//   while (true) {
//     try {
//       const result = await checkBalance(wallet.address, 0.01);
//       log(`Balance check result: ${JSON.stringify(result)}`, "info");
//       if (result.success) {
//         // Threshold reached: start trading strategy
//         updateStatus({
//           phase: "monitoring",
//           lastMessage: "Target balance reached, launching trading strategy",
//           nextStep: "Fetching BTC market data for analysis",
//         });
//         log(
//           "✅ Target balance achieved! Starting trading strategy",
//           "success"
//         );
//         try {
//           // Get USDT contract address for Polygon
//           const usdtMarketData = await getTokenMarketData("USDT");
//           const usdtContractObj = usdtMarketData.contracts.find(
//             (c) => c.blockchainId === 137 || c.blockchainId === "137"
//           );
//           if (!usdtContractObj) {
//             throw new Error("USDT contract for Polygon not found");
//           }
//           const usdtContract = usdtContractObj.address;
//           log(`USDT contract address: ${usdtContract}`, "info");
//           log("Scheduling trade check every 1 minute", "info");
//           setInterval(async () => {
//             try {
//               updateStatus({
//                 phase: "monitoring",
//                 lastMessage: "Fetching BTC price",
//                 nextStep: "Evaluate trade condition",
//               });
//               const btcData = await getTokenMarketData("BTC");
//               const btcPrice = parseFloat(btcData.price);
//               log(`BTC price: $${btcPrice}`, "info");
//               if (btcPrice > 100000) {
//                 updateStatus({
//                   phase: "executing_trade",
//                   lastMessage: "BTC above $100k, executing trade",
//                   nextStep: "Swapping POL for USDT",
//                 });
//                 const polData = await getTokenMarketData("MATIC");
//                 const polPrice = parseFloat(polData.price);
//                 const amountUSDT = 0.0002;
//                 const amountPOL = (amountUSDT / polPrice).toString();
//                 log(
//                   `Swapping ${amountPOL} POL for ${amountUSDT} USDT`,
//                   "info"
//                 );
//                 const swapQuote = await swap(
//                   "0x0000000000000000000000000000000000000000",
//                   usdtContract,
//                   wallet.address,
//                   amountPOL
//                 );
//                 const txData = swapQuote.transactionRequest;
//                 const { hash } = await sendTransaction(txData);
//                 log(`Trade executed: txHash ${hash}`, "success");
//                 updateStatus({
//                   phase: "completed_trade",
//                   lastMessage: "Trade executed successfully",
//                   trades: [
//                     {
//                       hash,
//                       fromAmount: amountPOL,
//                       toAmount: amountUSDT,
//                     },
//                   ],
//                   nextStep: "Waiting for next scheduled trade",
//                 });
//               } else {
//                 log("BTC below $100k, skipping trade", "info");
//                 updateStatus({
//                   phase: "monitoring",
//                   lastMessage: "No trade executed, BTC price below threshold",
//                   nextStep: "Waiting for next scheduled trade",
//                 });
//               }
//             } catch (innerErr) {
//               log(
//                 `Error during scheduled trade: ${innerErr.message}`,
//                 "error"
//               );
//               updateStatus({
//                 phase: "error",
//                 error: innerErr.message,
//                 lastMessage: "Error in scheduled trade execution",
//                 nextStep: "Continuing scheduled trades",
//               });
//             }
//           }, 10000);
//         } catch (setupErr) {
//           log(
//             `Error setting up trading strategy: ${setupErr.message}`,
//             "error"
//           );
//           updateStatus({
//             phase: "error",
//             error: setupErr.message,
//             lastMessage: "Failed to set up trading strategy",
//             nextStep: "Terminating",
//           });
//         }
//         break; // Exit balance-check loop once strategy is running
//       }
//       updateStatus({
//         phase: "checking_balance",
//         lastMessage: "Target not reached, retrying in 30 seconds",
//         nextStep: "Checking balance again in 30 seconds",
//       });
//       log("❌ Target not reached yet. Retrying in 30 seconds.", "warning");
//       await new Promise((resolve) => setTimeout(resolve, 30000));
//     } catch (error) {
//       log(`Error checking balance: ${error.message}`, "error");
//       updateStatus({
//         phase: "error",
//         error: error.message,
//         lastMessage: "Error checking balance, retrying",
//         nextStep: "Retrying balance check in 30 seconds",
//       });
//       await new Promise((resolve) => setTimeout(resolve, 30000));
//     }
//   }
// } catch (fatalErr) {
//   log(`Fatal error in baselineFunction: ${fatalErr.message}`, "error");
//   updateStatus({
//     phase: "error",
//     error: fatalErr.message,
//     lastMessage: "Fatal error in baseline function",
//     nextStep: "Terminating",
//   });
// }
// }

// baselineFunction("0x9864bB6d8359A7eeA4Ea112Dd82C6134BfD0c611");
