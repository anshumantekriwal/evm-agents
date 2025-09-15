import { PrivyClient } from "@privy-io/server-auth";
import {
    PublicKey,
    Connection,
    clusterApiUrl,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import dotenv from "dotenv";

dotenv.config();

// =============================
// ======= GLOBAL INSTANCES =======
// =============================

export const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);
export const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

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
// ======= Balance Operations =======
// =============================

export async function getBalances(walletAddress) {
    const publicKey = new PublicKey(walletAddress);
    
    try {
        // Import token utilities from trading.js to avoid circular dependency
        const { getTokenMetadata } = await import('./trading.js');
        
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