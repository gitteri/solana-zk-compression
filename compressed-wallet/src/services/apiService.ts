import { Rpc, createRpc, CompressedTransaction, WithCursor, SignatureWithMetadata } from '@lightprotocol/stateless.js';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, transferChecked } from '@solana/spl-token';
import { PublicKey, Keypair } from '@solana/web3.js';
import { transfer, compress, decompress } from '@lightprotocol/compressed-token';
import { usdcToBN } from '../utils';
import { CompressedWallet } from '../Wallet';
import { SimpleTransaction } from '../WalletHistory';

// Assuming USDC mint address on devnet
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const USDC_DECIMALS = 6;

// Program IDs and Accounts for Devnet
export const LIGHT_SYSTEM_PROGRAM_ID = new PublicKey("SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7");
export const COMPRESSED_TOKEN_PROGRAM_ID = new PublicKey("cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m");
export const ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq");
export const SHARED_PUBLIC_STATE_TREE_ID = new PublicKey("smt1NamzXdq4AMqS2fS2F1i5KTYPZRhoHgWx38d8WsT");
export const SHARED_PUBLIC_NULLIFIER_QUEUE_ID = new PublicKey("nfq1NvQDJ2GEgnS8zt9prAe8rjjpAW1zFkrvZoBR148");
export const SHARED_PUBLIC_ADDRESS_TREE_ID = new PublicKey("amt1Ayt45jfbdw5YSo7iz6WZxUmnZsQTYXy82hVwyC2");
export const SHARED_PUBLIC_ADDRESS_QUEUE_ID = new PublicKey("aq1S9z4reTSQAdgWHGD2zDaS39sjGrAxbR31vxJ2F4F");
export const DEFAULT_LOOKUP_TABLE_1 = new PublicKey("qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V");

export class ApiService {
    public connection: Rpc;

    constructor(api_key: string) {
        this.connection = this.getConnection(api_key);
    }

    getConnection(api_key: string): Rpc {
        if (!api_key) {
            api_key = process.env.HELIUS_API_KEY || '';
        }
        const RPC_ENDPOINT = `https://devnet.helius-rpc.com?api-key=${api_key}`
        const COMPRESSION_RPC_ENDPOINT = RPC_ENDPOINT;
        const connection: Rpc = createRpc(RPC_ENDPOINT, COMPRESSION_RPC_ENDPOINT)
        console.log("Debug: connection to ", COMPRESSION_RPC_ENDPOINT, " created");
        return connection;
    }

    async airdropSolana(publicKey: PublicKey, amount: number = 1): Promise<string> {
        try {
            // Convert SOL to lamports (1 SOL = 1e9 lamports)
            const lamports = amount * 1e9;

            // Request airdrop
            const signature = await this.connection.requestAirdrop(publicKey, lamports);

            // Wait for confirmation
            const latestBlockhash = await this.connection.getLatestBlockhash();
            await this.connection.confirmTransaction({
                signature,
                ...latestBlockhash
            });

            console.log(`Debug: Successfully airdropped ${amount} SOL to ${publicKey.toBase58()}`);
            return signature;
        } catch (error) {
            console.error("Error airdropping SOL:", error);
            throw error;
        }
    }

    async getSolBalance(publicKey: PublicKey): Promise<number> {
        try {
            console.log("Debug: getting SOL balance for ", publicKey.toBase58());
            const balance = await this.connection.getBalance(publicKey);
            if (balance === 0) {
                console.warn(`Debug: SOL balance for ${publicKey.toBase58()} is 0`);
                return 0;
            }
            console.log(`Debug: SOL balance for ${publicKey.toBase58()} is ${balance / 1e9} SOL`);
            return balance;
        } catch (error) {
            console.error("Error fetching SOL balance:", error);
            throw error;
        }
    }

    async getSplBalance(publicKey: PublicKey): Promise<BN> {
        try {
            const response = await this.connection.getTokenAccountsByOwner(
                publicKey,
                {
                    mint: USDC_MINT
                }
            );

            if (response.value.length === 0) {
                console.log("No USDC token account found for this wallet");
                return new BN(0);
            }

            const tokenAccountInfo = response.value[0].account.data;
            const balance = new BN(tokenAccountInfo.subarray(64, 72), 'le');

            console.log("Debug: SPL balance for ", publicKey.toBase58(), " is ", balance.toString());

            return balance;
        } catch (error) {
            console.error("Error fetching SPL balance:", error);
            throw error;
        }
    }

    async getZkBalance(publicKey: PublicKey): Promise<BN> {
        const response = await this.connection.getCompressedTokenBalancesByOwner(publicKey);
        if (response.items.length === 0) {
            console.log("Debug: No response from getCompressedTokenBalancesByOwner");
            return new BN(0)
        }
        console.log("Debug: response from getCompressedTokenBalancesByOwner", response.items[0].mint.toBase58());
        const balance = response.items.find((item) => item.mint.toBase58() === USDC_MINT.toBase58());
        if (!balance) {
            console.log("Debug: No balance found for ", publicKey.toBase58());
            return new BN(0);
        }

        console.log("Debug: balance for ", publicKey.toBase58(), " is ", balance);
        return balance.balance;
    }

    async getAllBalances(publicKey: PublicKey): Promise<{ solBalance: BN; splBalance: BN; zkBalance: BN; }> {
        const solBalance = await this.getSolBalance(publicKey);
        const splBalance = await this.getSplBalance(publicKey);
        const zkBalance = await this.getZkBalance(publicKey);
        return { solBalance: new BN(solBalance), splBalance: splBalance, zkBalance: zkBalance };
    }

    async getTxnHistory(publicKey: PublicKey): Promise<SimpleTransaction[]> {
        const sigHistory = await this.connection.getSignaturesForAddress(publicKey);
        const zkSigHistory = await this.connection.getCompressionSignaturesForTokenOwner(publicKey);

        // Filter out signatures that are already in zkSigHistory
        const combinedHistory = [...zkSigHistory.items, ...sigHistory.filter(sig => !zkSigHistory.items.some(item => item.signature === sig.signature))]

        return combinedHistory
            // Sort by slot in descending order
            .sort((a, b) => b.slot - a.slot)
            .map(sig => {
                const isCompressed = 'items' in zkSigHistory && zkSigHistory.items.some(item => item.signature === sig.signature);
                return {
                    signature: sig.signature,
                    slot: sig.slot,
                    isCompressed: isCompressed
                };
                // Limit the result to the most recent 50 transactions
            }).slice(0, 50);
    }

    async getCompressedSigHistory(publicKey: PublicKey): Promise<WithCursor<SignatureWithMetadata[]>> {
        const sigHistory = await this.connection.getCompressionSignaturesForOwner(publicKey);
        console.log("Debug: sig history for ", publicKey.toBase58(), " is ", sigHistory);
        return sigHistory;
    }

    async getTransactionWithCompressedInfo(signature: string): Promise<CompressedTransaction | null> {
        const transaction = await this.connection.getTransactionWithCompressionInfo(signature);
        console.log("Debug: transaction details for ", signature, " is ", transaction);
        return transaction;
    }

    async transferZK(fromWallet: CompressedWallet, recipientPublicKey: PublicKey, amount: string): Promise<string> {
        // Convert amount string to BN using utils.formatUSDCBalance
        const amountBN = usdcToBN(amount);
        const from = Keypair.fromSecretKey(fromWallet.privateKey);
        try {
            const signature = await transfer(this.connection, from, USDC_MINT, amountBN, from, recipientPublicKey);
            console.log("Debug: transaction submitted onchain with signature ", signature);
            return signature;
        } catch (error) {
            console.error("Error in transferZK:", error);
            if (error instanceof Error) {
                throw new Error(`Failed to transfer ZK tokens: ${error.message}`);
            } else {
                throw new Error("Failed to transfer ZK tokens: Unknown error");
            }
        }
    }

    async transferSpl(fromWallet: CompressedWallet, recipientPublicKey: PublicKey, amount: string): Promise<string> {
        const amountBN = usdcToBN(amount);
        const from = Keypair.fromSecretKey(fromWallet.privateKey);
        const fromATA = getAssociatedTokenAddressSync(USDC_MINT, from.publicKey);
        const recipientATA = await getOrCreateAssociatedTokenAccount(this.connection, from, USDC_MINT, recipientPublicKey)
        const signature = await transferChecked(this.connection, from, fromATA, USDC_MINT, recipientATA.address, from, amountBN, USDC_DECIMALS);
        console.log("Debug: transaction submitted onchain with signature ", signature);
        return signature;
    }

    async compress(fromWallet: CompressedWallet, recipientPublicKey: PublicKey, amount: string): Promise<string> {
        const amountBN = usdcToBN(amount);
        const from = Keypair.fromSecretKey(fromWallet.privateKey);
        const fromATA = getAssociatedTokenAddressSync(USDC_MINT, from.publicKey);
        const signature = await compress(this.connection, from, USDC_MINT, amountBN, from, fromATA, recipientPublicKey);
        console.log("Debug: transaction submitted onchain with signature ", signature);
        return signature;
    }

    async decompress(fromWallet: CompressedWallet, recipientPublicKey: PublicKey, amount: string): Promise<string> {
        const amountBN = usdcToBN(amount);
        const from = Keypair.fromSecretKey(fromWallet.privateKey);
        const recipientATA = await getOrCreateAssociatedTokenAccount(this.connection, from, USDC_MINT, recipientPublicKey)
        console.log("Debug: recipientATA", recipientATA);
        const signature = await decompress(this.connection, from, USDC_MINT, amountBN, from, recipientATA.address);
        console.log("Debug: transaction submitted onchain with signature ", signature);
        return signature;
    }
}
