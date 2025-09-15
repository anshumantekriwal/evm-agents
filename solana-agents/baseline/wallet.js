import { PrivyClient } from "@privy-io/server-auth";
import {
    PublicKey,
    SystemProgram,
    VersionedTransaction,
    TransactionMessage,
    Connection,
    clusterApiUrl,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import dotenv from "dotenv";

dotenv.config();

// =============================
// ======= GLOBAL INSTANCES =======
// =============================

export const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);
export const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

// Global cache for Jupiter tokens (shared across all operations)
let jupiterTokensCache = null;
let jupiterTokensCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// =============================
// ======= SHARED UTILITIES =======
// =============================

// Optimized Jupiter token fetcher (shared across all functions)
export async function getJupiterTokens() {
    const now = Date.now();
    if (!jupiterTokensCache || (now - jupiterTokensCacheTime) > CACHE_DURATION) {
        try {
            const response = await fetch('https://token.jup.ag/all', { timeout: 5000 });
            if (response.ok) {
                jupiterTokensCache = await response.json();
                jupiterTokensCacheTime = now;
            }
        } catch (error) {
            console.log('Failed to update Jupiter cache:', error.message);
            if (!jupiterTokensCache) throw new Error('Unable to fetch token list from Jupiter API');
        }
    }
    return jupiterTokensCache;
}

// =============================
// ======= Wallet Operations =======
// =============================

export async function createWallet(ownerAddress) {
    const walletConfig = { chainType: "solana" };
    if (ownerAddress) walletConfig.ownerAddress = ownerAddress;
    
    const wallet = await privy.walletApi.createWallet(walletConfig);
    return { walletId: wallet.id, walletAddress: wallet.address };
}

export async function getWallet(walletId) {
    const wallet = await privy.walletApi.getWallet({ id: walletId });
    return { walletId: wallet.id, walletAddress: wallet.address };
}

export async function getOrCreateWallet(ownerAddress) {
    if (process.env.WALLET_ID) {
        console.log("Wallet ID found in environment");
        return await getWallet(process.env.WALLET_ID);
    } else {
        console.log("Creating new wallet");
        return await createWallet(ownerAddress);
    }
}

// =============================
// ======= Token Metadata =======
// =============================

export async function getTokenMetadata(mintAddress) {
    try {
        const tokens = await getJupiterTokens();
        const token = tokens.find(t => t.address === mintAddress);
        
        if (token) {
            return {
                name: token.name || 'Unknown',
                symbol: token.symbol || 'Unknown',
                decimals: token.decimals,
                logoURI: token.logoURI || ''
            };
        }
        
        // Fallback: Try Solana RPC metadata
        const mintPublicKey = new PublicKey(mintAddress);
        try {
            const accountInfo = await connection.getAccountInfo(mintPublicKey);
            if (accountInfo) {
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
        
        // Final fallback
        return {
            name: `Token ${mintAddress.slice(0, 8)}...`,
            symbol: 'SPL',
            decimals: 0,
            logoURI: ''
        };
    } catch (error) {
        console.error('Error fetching token metadata:', error);
        return {
            name: `Token ${mintAddress.slice(0, 8)}...`,
            symbol: 'SPL',
            decimals: 0,
            logoURI: ''
        };
    }
}

// =============================
// ======= Balance Operations =======
// =============================

export async function getBalances(walletAddress) {
    const publicKey = new PublicKey(walletAddress);
    
    try {
        // Fetch native SOL balance and token accounts in parallel
        const [solBalance, tokenAccounts] = await Promise.all([
            connection.getBalance(publicKey),
            connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })
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
        
        // SOL balance formatted
        const solBalanceFormatted = {
            mint: 'SOL',
            tokenAmount: solBalance.toString(),
            decimals: 9,
            uiAmount: solBalance / 1e9,
            name: 'Solana',
            symbol: 'SOL',
            logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
        };

        return { allBalances: [solBalanceFormatted, ...tokenBalances] };
    } catch (error) {
        console.error('Error fetching balances:', error);
        throw error;
    }
}

// =============================
// ======= Transfer Operations =======
// =============================

export async function transfer(fromWalletId, toAddress, amountInSol, fromWalletAddress) {
    try {
        const fromWalletPublicKey = new PublicKey(fromWalletAddress);
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
            caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            transaction: transaction,
        });
        
        console.log(`Transfer transaction sent: hash=${hash}`);
        return { success: true, hash };
    } catch (error) {
        console.error('Transfer failed:', error);
        return { success: false, error: error.message };
    }
}

// =============================
// ======= Account Utilities =======
// =============================

export async function checkTokenAccountExists(walletAddress, mintAddress) {
    try {
        const publicKey = new PublicKey(walletAddress);
        const mintPublicKey = new PublicKey(mintAddress);
        
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: mintPublicKey
        });
        
        return tokenAccounts.value.length > 0;
    } catch (error) {
        console.error('Error checking token account:', error);
        return false;
    }
}

// =============================
// ======= Token Mint Address =======
// =============================

export async function getTokenMintAddress(symbol) {
    try {
        const tokens = await getJupiterTokens();
        
        // Find token by symbol (case-insensitive)
        const token = tokens.find(t => 
            t.symbol && t.symbol.toUpperCase() === symbol.toUpperCase()
        );
        
        if (!token) {
            throw new Error(`Token with symbol '${symbol}' not found`);
        }
        
        return {
            success: true,
            mintAddress: token.address,
            tokenInfo: {
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                logoURI: token.logoURI || ''
            }
        };
    } catch (error) {
        console.error('Failed to get token mint address:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}
