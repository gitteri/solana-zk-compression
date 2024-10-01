import { Rpc, createRpc, CompressedTransaction, WithCursor, SignatureWithMetadata } from '@lightprotocol/stateless.js';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, transferChecked } from '@solana/spl-token';
import { PublicKey, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { transfer, compress, decompress } from '@lightprotocol/compressed-token';
import { DEVNET, MAINNET } from '../context/ApiContext';
import { usdcToBN } from '../utils';
import { CompressedWallet } from '../Wallet';
import { SimpleTransaction } from '../WalletHistory';

const USDC_DECIMALS = 6;

// ApiService: A class for interacting with the Helius API for Solana blockchain operations
// It provides methods to get the connection to the Helius API, airdrop SOL, get SOL and SPL balances,
// get transaction history, and perform various token operations like transfer, compress, and decompress.
//
// Note that the Helius API has rate limits, especially for compressed tokens (Photon), so be mindful of the number of requests you make.
export class ApiService {
    public connection: Rpc;
    public network: string;

    constructor(api_key: string, network: string = DEVNET) {
        this.connection = this.getConnection(api_key, network);
        this.network = network;
    }

    getConnection(api_key: string, network: string = DEVNET): Rpc {
        if (!api_key) {
            api_key = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '';
        }
        const RPC_ENDPOINT = `https://${network}.helius-rpc.com?api-key=${api_key}`
        const COMPRESSION_RPC_ENDPOINT = RPC_ENDPOINT;
        const connection: Rpc = createRpc(RPC_ENDPOINT, COMPRESSION_RPC_ENDPOINT)
        console.log("Debug: connection to ", COMPRESSION_RPC_ENDPOINT, " created");
        return connection;
    }

    // USDC mint information from Circle's documentation
    getUSDCMint(): PublicKey {
        if (this.network === DEVNET) {
            // https://developers.circle.com/stablecoins/docs/usdc-on-test-networks
            return new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
        } else if (this.network === MAINNET) {
            // https://developers.circle.com/stablecoins/docs/usdc-on-mainnet
            return new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
        }

        throw new Error("Invalid network");
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
                    mint: this.getUSDCMint()
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
        const balance = response.items.find((item) => item.mint.toBase58() === this.getUSDCMint().toBase58());
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

    async transferSol(feePayerWallet: CompressedWallet, fromWallet: CompressedWallet, recipientPublicKey: PublicKey, amount: BN): Promise<string> {
        try {
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromWallet.publicKey,
                    toPubkey: recipientPublicKey,
                    lamports: amount.toNumber()
                })
            );

            const feePayer = Keypair.fromSecretKey(feePayerWallet.privateKey);
            const from = Keypair.fromSecretKey(fromWallet.privateKey);

            transaction.feePayer = feePayer.publicKey;
            const latestBlockhash = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = latestBlockhash.blockhash;

            transaction.sign(feePayer, from);

            const signature = await this.connection.sendRawTransaction(transaction.serialize());

            await this.connection.confirmTransaction({
                signature,
                ...latestBlockhash
            });

            console.log("Debug: SOL transfer transaction submitted onchain with signature ", signature);
            return signature;
        } catch (error) {
            console.error("Error in transferSol:", error);
            if (error instanceof Error) {
                throw new Error(`Failed to transfer SOL: ${error.message}`);
            } else {
                throw new Error("Failed to transfer SOL: Unknown error");
            }
        }
    }

    async transferZK(feePayerWallet: CompressedWallet, fromWallet: CompressedWallet, recipientPublicKey: PublicKey, amount: string): Promise<string> {
        // Convert amount string to BN using utils.formatUSDCBalance
        const amountBN = usdcToBN(amount);
        const from = Keypair.fromSecretKey(fromWallet.privateKey);
        const feePayer = Keypair.fromSecretKey(feePayerWallet.privateKey);
        try {
            const signature = await transfer(this.connection, feePayer, this.getUSDCMint(), amountBN, from, recipientPublicKey);
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

    async transferSpl(feePayerWallet: CompressedWallet, fromWallet: CompressedWallet, recipientPublicKey: PublicKey, amount: string): Promise<string> {
        const amountBN = usdcToBN(amount);
        const usdcMint = this.getUSDCMint();
        const from = Keypair.fromSecretKey(fromWallet.privateKey);
        const feePayer = Keypair.fromSecretKey(feePayerWallet.privateKey);
        const fromATA = getAssociatedTokenAddressSync(usdcMint, from.publicKey);
        const recipientATA = await getOrCreateAssociatedTokenAccount(this.connection, from, usdcMint, recipientPublicKey)
        const signature = await transferChecked(this.connection, feePayer, fromATA, usdcMint, recipientATA.address, from, amountBN, USDC_DECIMALS);
        console.log("Debug: transaction submitted onchain with signature ", signature);
        return signature;
    }

    async compress(feePayerWallet: CompressedWallet, fromWallet: CompressedWallet, recipientPublicKey: PublicKey, amount: string): Promise<string> {
        const amountBN = usdcToBN(amount);
        const from = Keypair.fromSecretKey(fromWallet.privateKey);
        const feePayer = Keypair.fromSecretKey(feePayerWallet.privateKey);
        const usdcMint = this.getUSDCMint();
        const fromATA = getAssociatedTokenAddressSync(usdcMint, from.publicKey);
        const signature = await compress(this.connection, feePayer, usdcMint, amountBN, from, fromATA, recipientPublicKey);
        console.log("Debug: transaction submitted onchain with signature ", signature);
        return signature;
    }

    async decompress(feePayerWallet: CompressedWallet, fromWallet: CompressedWallet, recipientPublicKey: PublicKey, amount: string): Promise<string> {
        const amountBN = usdcToBN(amount);
        const from = Keypair.fromSecretKey(fromWallet.privateKey);
        const feePayer = Keypair.fromSecretKey(feePayerWallet.privateKey);
        const usdcMint = this.getUSDCMint();
        const recipientATA = await getOrCreateAssociatedTokenAccount(this.connection, from, usdcMint, recipientPublicKey)
        console.log("Debug: recipientATA", recipientATA);
        const signature = await decompress(this.connection, feePayer, usdcMint, amountBN, from, recipientATA.address);
        console.log("Debug: transaction submitted onchain with signature ", signature);
        return signature;
    }
}
