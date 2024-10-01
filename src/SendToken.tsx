import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { useApi } from './context/ApiContext';
import { useWalletsState } from './context/WalletsStateContext';
import { usdcToBN, solToBN, formatSOLBalance } from './utils';
import { CompressedWallet } from './Wallet';

export interface Token {
    symbol: string;
    compressed: boolean;
}

interface SendTokenProps {
    activeWallet: CompressedWallet;
    token: Token;
}

type BalanceType = 'regular' | 'compressed';

const defaultBalanceType = (activeWallet: CompressedWallet): BalanceType => {
    if (activeWallet.splBalance.gt(activeWallet.zkBalance)) {
        return 'regular'
    }
    return 'compressed';
};

const ToastWithLinkToExplorer = (signature: string, network: string) => (
    <div className="flex items-center">
        <Link href={`https://explorer.solana.com/tx/${signature}?cluster=${network}`} target="_blank">
            <span className="cursor-pointer">
                Transaction sent. View on Solana Explorer
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
            </span>
        </Link>
    </div>
)

const SendToken: React.FC<SendTokenProps> = ({ activeWallet, token }) => {
    const apiClient = useApi();
    const { wallets, updateWalletBalance, updateWalletHistory } = useWalletsState();

    const [amount, setAmount] = useState<string>('');
    const [balanceType, setBalanceType] = useState<BalanceType>(defaultBalanceType(activeWallet));
    const [feePayerWalletIndex, setFeePayerWalletIndex] = useState<number>(0);
    const [recipient, setRecipient] = useState<string>('');
    const [isSending, setIsSending] = useState(false);

    const validateTransferRequest = (amount: string, recipient: string, feePayerWalletIndex: number, activeWallet: CompressedWallet, token: Token, balanceType: BalanceType): string | null => {
        // Validate amount
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            console.error('Invalid amount');
            return 'Invalid amount';
        }

        // Validate recipient
        if (!recipient) {
            console.error('Recipient address is required');
            return 'Recipient address is required';
        }

        // Attempt to create a PublicKey from the recipient string
        // This will throw an error if the address is invalid
        try {
            new PublicKey(recipient);
        } catch (error) {
            console.error('Invalid recipient address');
            return 'Invalid recipient address';
        }

        if (feePayerWalletIndex === -1) {
            console.error('Fee payer wallet is required');
            return 'Fee payer wallet is required';
        }

        // Check if the sender has sufficient SOL balance for fees
        if (wallets[feePayerWalletIndex].solBalance <= 0) {
            console.error(`Insufficient SOL balance for transaction fees: ${formatSOLBalance(wallets[feePayerWalletIndex].solBalance)}`);
            return `Insufficient SOL balance for transaction fees: ${formatSOLBalance(wallets[feePayerWalletIndex].solBalance)}`;
        }

        // Check if the sender has sufficient token balance
        if (token.symbol === 'SOL') {
            if (activeWallet.solBalance.lt(solToBN(amount))) {
                console.error(`Insufficient SOL balance`);
                return `Insufficient SOL balance`;
            }
        } else {
            if (balanceType === 'regular' && activeWallet.splBalance.lt(usdcToBN(amount))) {
                console.error(`Insufficient ${token.symbol} balance`);
                return `Insufficient ${token.symbol} balance`;
            }
            if (balanceType === 'compressed' && activeWallet.zkBalance.lt(usdcToBN(amount))) {
                console.error(`Insufficient ZK ${token.symbol} balance`);
                return `Insufficient ZK ${token.symbol} balance`;
            }
        }
        return null;
    };

    const handleSend = async () => {
        const error = validateTransferRequest(amount, recipient, feePayerWalletIndex, activeWallet, token, balanceType);
        if (error) {
            toast.error(error);
            return;
        }

        setIsSending(true);
        let signature: string | null = null;
        try {
            // If we've made it this far, the request is valid
            // Proceed with sending tokens
            // possible transfers:
            // 1. SOL transfer
            if (token.symbol === 'SOL') {
                console.log('Sending SOL');
                signature = await apiClient.transferSol(
                    wallets[feePayerWalletIndex],
                    activeWallet,
                    new PublicKey(recipient),
                    solToBN(amount),
                );
            }
            // 2. uncompressed to compressed
            else if (token.compressed && balanceType === 'regular') {
                console.log('Sending compressed tokens');
                signature = await apiClient.compress(
                    wallets[feePayerWalletIndex],
                    activeWallet,
                    new PublicKey(recipient),
                    amount,
                );
            }

            // 3. compressed to compressed
            else if (token.compressed && balanceType === 'compressed') {
                // assumes activeWallet is the sender and payer
                console.log('Sending compressed tokens');
                signature = await apiClient.transferZK(
                    wallets[feePayerWalletIndex],
                    activeWallet,
                    new PublicKey(recipient),
                    amount,
                );
            }

            // 4. uncompressed to uncompressed
            else if (!token.compressed && balanceType === 'regular') {
                console.log('Sending regular tokens');
                signature = await apiClient.transferSpl(
                    wallets[feePayerWalletIndex],
                    activeWallet,
                    new PublicKey(recipient),
                    amount,
                );
            }

            // 5. compressed to uncompressed
            else if (!token.compressed && balanceType === 'compressed') {
                console.log('Sending uncompressed tokens');
                signature = await apiClient.decompress(
                    wallets[feePayerWalletIndex],
                    activeWallet,
                    new PublicKey(recipient),
                    amount,
                );
            }

            // TODO: update the UI to show the transaction was sent
            console.log('Transaction sent', signature);
            toast.success(ToastWithLinkToExplorer(signature || '', apiClient.network));
            await updateWalletBalance(activeWallet.publicKey);
            await updateWalletHistory(activeWallet.publicKey);
        } catch (error) {
            console.error('Error sending tokens', error);
            toast.error(`Error sending tokens: ${error}`);
        } finally {
            setIsSending(false);
        }
    };

    if (!token || !token.symbol) {
        return null;
    }

    return (
        <div className="mt-6 p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Send {token.compressed ? 'Compressed' : ''} {token.symbol}</h2>
            <div className="mb-4">
                <label htmlFor="amount" className="block mb-2">Amount:</label>
                <input
                    type="text"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder={`Enter amount of ${token.symbol}`}
                />
            </div>
            {token.symbol !== 'SOL' && (
                <div className="mb-4">
                    <label htmlFor="balanceType" className="block mb-2">Select Balance To Send:</label>
                    <select
                        id="balanceType"
                        onChange={(e) => setBalanceType(e.target.value as BalanceType)}
                        className="w-full p-2 border rounded"
                        value={balanceType}
                    >
                        <option value="regular">Regular Balance</option>
                        <option value="compressed">Compressed Balance</option>
                    </select>
                </div>
            )}
            {wallets.length > 1 && (
                <div className="mb-4">
                    <label htmlFor="walletSelector" className="block mb-2">Select Fee Payer Wallet:</label>
                    <select
                        id="walletSelector"
                        onChange={(e) => setFeePayerWalletIndex(parseInt(e.target.value))}
                        className="w-full p-2 border rounded"
                    >
                        {wallets.map((wallet, index) => (
                            <option key={wallet.publicKey.toString()} value={index}>
                                Wallet {index + 1} - {wallet.publicKey.toString().slice(0, 8)}... {formatSOLBalance(wallet.solBalance)} SOL
                                {wallet.publicKey.equals(activeWallet.publicKey) ? ' (Current)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {wallets.length > 1 && (
                <div className="mb-4">
                    <label htmlFor="walletSelector" className="block mb-2">Select Recipient Wallet:</label>
                    <select
                        id="walletSelector"
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">External Address</option>
                        {wallets.map((wallet, index) => (
                            <option key={wallet.publicKey.toString()} value={wallet.publicKey.toString()}>
                                Wallet {index + 1} - {wallet.publicKey.toString().slice(0, 8)}...
                                {wallet.publicKey.equals(activeWallet.publicKey) ? ' (Current)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div className="mb-4">
                <label htmlFor="recipient" className="block mb-2">Recipient:</label>
                <input
                    type="text"
                    id="recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Enter recipient's address"
                />
            </div>
            <button
                onClick={handleSend}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
            >
                {isSending ? 'Sending...' : `Send ${token.symbol}`}
            </button>
        </div>
    );
};

export default SendToken;
