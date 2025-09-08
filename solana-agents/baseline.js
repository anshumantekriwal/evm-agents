import { PrivyClient } from "@privy-io/server-auth";
import {
    PublicKey,
    SystemProgram,
    VersionedTransaction,
    TransactionMessage,
    Connection,
    clusterApiUrl,
    Keypair,
  } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';

import dotenv from "dotenv";
dotenv.config();

const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);

// =============================
// ======= Wallet Creation =======
// =============================

const ownerAddress = "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ";

async function createWallet(ownerAddress) {
    if (ownerAddress) {
        const wallet = await privy.walletApi.createWallet({
            chainType: "solana",
            ownerAddress,
        });
        return { walletId: wallet.id, walletAddress: wallet.address };
    }
    else {
        const wallet = await privy.walletApi.createWallet({
            chainType: "solana",
        });
        return { walletId: wallet.id, walletAddress: wallet.address };
    }

}

async function getWallet(walletId) {
    const wallet = await privy.walletApi.getWallet({id: walletId});
    return { walletId: wallet.id, walletAddress: wallet.address };

}

async function getOrCreateWallet() {
    if (process.env.WALLET_ID) {
        console.log("Wallet ID found in environment");
        const { walletId, walletAddress } = await getWallet(process.env.WALLET_ID);
        return { walletId, walletAddress };
    }
    else {
        console.log("Creating new wallet");
        const { walletId, walletAddress } = await createWallet(ownerAddress);
        return { walletId, walletAddress };
    }
}

// const { walletId, walletAddress } = await createWallet(ownerAddress);
// console.log(walletId, walletAddress);

// const id = process.env.WALLET_ID;
// const { walletId, walletAddress } = await getWallet(id);
// console.log(walletId, walletAddress);

const { walletId, walletAddress } = await getOrCreateWallet();
console.log(walletAddress);
console.log(walletId);



// =============================
// ======= Checking Balance =======
// =============================

let jupiterTokensCache = null;
let jupiterTokensCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to fetch token metadata using Jupiter API (more reliable)
async function getTokenMetadata(mintAddress) {
  try {
    // Try Jupiter API first (most reliable) with caching
    const now = Date.now();
    if (!jupiterTokensCache || (now - jupiterTokensCacheTime) > CACHE_DURATION) {
      try {
        const jupiterUrl = `https://token.jup.ag/all`;
        const response = await fetch(jupiterUrl, { timeout: 5000 });
        
        if (response.ok) {
          jupiterTokensCache = await response.json();
          jupiterTokensCacheTime = now;
        }
      } catch (cacheError) {
        console.log('Failed to update Jupiter cache:', cacheError.message);
      }
    }
    
    if (jupiterTokensCache) {
      const token = jupiterTokensCache.find(t => t.address === mintAddress);
      
      if (token) {
        return {
          name: token.name || 'Unknown',
          symbol: token.symbol || 'Unknown',
          decimals: token.decimals,
          logoURI: token.logoURI || ''
        };
      }
    }
    
    // Fallback: Try Solana RPC metadata
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const mintPublicKey = new PublicKey(mintAddress);
    
    try {
      const accountInfo = await connection.getAccountInfo(mintPublicKey);
      if (accountInfo) {
        // For SPL tokens, we can get basic info from the mint account
        return {
          name: `Token ${mintAddress.slice(0, 8)}...`,
          symbol: 'SPL',
          decimals: accountInfo.data[44] || 0,
          logoURI: ''
        };
      }
    } catch (rpcError) {
      console.log('RPC metadata fetch failed, using defaults');
    }
    
    // Final fallback: return basic info
    return {
      name: `Token ${mintAddress.slice(0, 8)}...`,
      symbol: 'SPL',
      decimals: 0,
      logoURI: ''
    };
    
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    // Return a default value in case of error
    return {
      name: `Token ${mintAddress.slice(0, 8)}...`,
      symbol: 'SPL',
      decimals: 0,
      logoURI: ''
    };
  }
}
  
  // Fetch the native SOL balance and token balances
  async function getBalances(walletAddress) {
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const publicKey = new PublicKey(walletAddress);
    
    try {
      // Fetch native SOL balance and token accounts in parallel
      const [solBalance, tokenAccounts] = await Promise.all([
        connection.getBalance(publicKey),
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID
        })
      ]);
      
      // Process token balances
      const tokenBalances = await Promise.all(
        tokenAccounts.value.map(async (account) => {
          const { tokenAmount, mint } = account.account.data.parsed.info;
          
          try {
            const metadata = await getTokenMetadata(mint);
            return {
              mint,
              tokenAmount: tokenAmount.amount,
              decimals: tokenAmount.decimals,
              uiAmount: tokenAmount.uiAmount,
              name: metadata.name,
              symbol: metadata.symbol,
              logoURI: metadata.logoURI
            };
          } catch (error) {
            console.log(`Metadata fetch failed for ${mint}:`, error.message);
            return {
              mint,
              tokenAmount: tokenAmount.amount,
              decimals: tokenAmount.decimals,
              uiAmount: tokenAmount.uiAmount,
              name: `Token ${mint.slice(0, 8)}...`,
              symbol: 'SPL',
              logoURI: ''
            };
          }
        })
      );
      
      // Format SOL balance to match token balance structure
      const solBalanceFormatted = {
        mint: 'SOL',
        tokenAmount: solBalance.toString(),
        decimals: 9,
        uiAmount: solBalance / 1e9,
        name: 'Solana',
        symbol: 'SOL',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
      };

      return {
        allBalances: [solBalanceFormatted, ...tokenBalances]
      };
    } catch (error) {
      console.error('Error fetching balances:', error);
      throw error;
    }
  }
  
  // Use the wallet address from getOrCreateWallet()
  getBalances(walletAddress)
    .then(balances => {
      console.log("Unified Balances for wallet:", walletAddress);
      console.log("All Balances:", balances.allBalances);
    })
    .catch(error => {
      console.error("Error fetching balances:", error);
    });


// =============================
// ======= Transfer =======
// =============================

async function transfer(fromWalletId, toAddress, amountInSol) {
  try {
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    
    const fromWalletPublicKey = new PublicKey(walletAddress);
    const toWalletPublicKey = new PublicKey(toAddress);
    const amountInLamports = amountInSol * 1e9;
    
    console.log(`Transfer amount: ${amountInLamports} lamports (${amountInSol} SOL)`);
    
    const instruction = SystemProgram.transfer({
      fromPubkey: fromWalletPublicKey,
      toPubkey: toWalletPublicKey,
      lamports: amountInLamports,
    });
    
    const message = new TransactionMessage({
      payerKey: fromWalletPublicKey,
      instructions: [instruction],
      recentBlockhash: "11111111111111111111111111111111",
    });
    
    const transaction = new VersionedTransaction(message.compileToV0Message());
    
    const { hash } = await privy.walletApi.solana.signAndSendTransaction({
      walletId: fromWalletId,
      caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Mainnet
      transaction: transaction,
    });
    
    console.log(`Transfer transaction sent: hash=${hash}`);
    return { success: true, hash };
    
  } catch (error) {
    console.error('Transfer failed:', error);
    return { success: false, error: error.message };
  }
}

// Example usage
// const recipientAddress = "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ";
// const transferResult = await transfer(walletId, recipientAddress, 0.00001);
// console.log(transferResult);


// =============================
// ======= Swap =======
// =============================

async function swap(fromTokenSymbol, toTokenSymbol, fromAmount, walletAddress) {
  try {
    // Fetch all tokens from Jupiter API
    const jupiterUrl = `https://token.jup.ag/all`;
    const response = await fetch(jupiterUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.status}`);
    }
    
    const tokens = await response.json();
    
    // Find tokens by symbol
    const fromTokenInfo = tokens.find(t => 
      t.symbol.toUpperCase() === fromTokenSymbol.toUpperCase()
    );
    const toTokenInfo = tokens.find(t => 
      t.symbol.toUpperCase() === toTokenSymbol.toUpperCase()
    );
    
    if (!fromTokenInfo) {
      throw new Error(`Token symbol '${fromTokenSymbol}' not found in Jupiter API`);
    }
    if (!toTokenInfo) {
      throw new Error(`Token symbol '${toTokenSymbol}' not found in Jupiter API`);
    }
    
    const fromToken = fromTokenInfo.address;
    const toToken = toTokenInfo.address;
    const fromTokenDecimals = fromTokenInfo.decimals;
    
    console.log(`Swapping ${fromAmount} ${fromTokenSymbol} to ${toTokenSymbol}`);
    console.log(`From token: ${fromToken} (${fromTokenDecimals} decimals)`);
    console.log(`To token: ${toToken}`);
    
    // Convert human-readable amount to raw amount
    const rawAmount = Math.floor(fromAmount * Math.pow(10, fromTokenDecimals));
    
    console.log(`Converting ${fromAmount} ${fromTokenSymbol} (${fromTokenDecimals} decimals) to ${rawAmount} raw units`);
    
    const url = `https://li.quest/v1/quote?fromChain=SOL&toChain=SOL&fromToken=${fromToken}&toToken=${toToken}&fromAddress=${walletAddress}&toAddress=${walletAddress}&fromAmount=${rawAmount}`;
    
    const quoteResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json'
      }
    });
    
    if (!quoteResponse.ok) {
      throw new Error(`HTTP error! status: ${quoteResponse.status}`);
    }
    
    const quote = await quoteResponse.json();
    return { success: true, quote };
    
  } catch (error) {
    console.error('Failed to get swap quote:', error);
    return { success: false, error: error.message };
  }
}

// Example usage - swap SOL to USDC
const swapQuote = await swap('SOL', 'USDC', 1, walletAddress); // 1 SOL to USDC
console.log(swapQuote);


// =============================
// ======= Market Data =======
// =============================  

async function marketData(symbol) {
  try {
    const url = `https://explorer-api.mobula.io/api/1/market/data?shouldFetchPriceChange=24h&symbol=${symbol.toUpperCase()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.MOBULA_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data['data'];
    
  } catch (error) {
    console.error('Failed to get price:', error); 
    return { success: false, error: error.message };
  }
}

// Example usage
const marketData = await marketData('BTC');
console.log(marketData);


// =============================
// ======= Price Feed =======
// =============================

async function price(symbol) {
  try {
    const url = `https://explorer-api.mobula.io/api/1/market/data?shouldFetchPriceChange=24h&symbol=${symbol.toUpperCase()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.MOBULA_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data['data']['price'];
    
  } catch (error) {
    console.error('Failed to get price:', error); 
    return { success: false, error: error.message };
  }
}

const price = await price('BTC');
console.log(price)


// =============================
// ======= Twitter Data =======
// =============================

async function twitter(user, lastTweets = []) {
  try {
    const url = `https://twitter-agent-kz2u.onrender.com/api/tweets/${user}?count=5`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.TWITTER_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const currentTweets = data.data || []; // Extract tweets from data array
    
    // Compare current tweets with inputted lastTweets
    let hasNewTweet = false;
    let newTweet = null;
    
    if (lastTweets.length === 0) {
      // No previous tweets provided, return current tweets without marking as new
      return { hasNewTweet: false, newTweet: null, currentTweets };
    }
    
    // Check if there are new tweets by comparing tweet IDs or content
    for (const currentTweet of currentTweets) {
      const isNewTweet = !lastTweets.some(lastTweet => 
        (currentTweet.id && lastTweet.id && currentTweet.id === lastTweet.id) ||
        (currentTweet.text && lastTweet.text && currentTweet.text === lastTweet.text)
      );
      
      if (isNewTweet) {
        hasNewTweet = true;
        newTweet = currentTweet;
        break; // Return the first new tweet found
      }
    }
    
    return { 
      hasNewTweet, 
      newTweet, 
      currentTweets,
      username: user 
    };
    
  } catch (error) {
    console.error('Failed to fetch tweets:', error);
    return { 
      hasNewTweet: false, 
      newTweet: null, 
      error: error.message,
      username: user 
    };
  }
}

