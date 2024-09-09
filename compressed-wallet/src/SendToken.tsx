import React, { useState } from 'react';
import { BN } from '@coral-xyz/anchor';
import { CompressedWallet } from './Wallet';
import { PublicKey } from '@solana/web3.js';
import { useApi } from './context/ApiContext';
import { useGlobalState } from './context/GlobalStateContext';

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

const SendToken: React.FC<SendTokenProps> = ({ activeWallet, token }) => {
    const [amount, setAmount] = useState<string>('');
    const [balanceType, setBalanceType] = useState<BalanceType>(defaultBalanceType(activeWallet));
    const [recipient, setRecipient] = useState<string>('');
    const [isSending, setIsSending] = useState(false);
    const apiClient = useApi();
    const { wallets, updateWalletBalance, updateWalletHistory } = useGlobalState();

    const validateTransferRequest = (amount: string, recipient: string, activeWallet: CompressedWallet, token: Token, balanceType: BalanceType): boolean => {
        // Validate amount
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            console.error('Invalid amount');
            return false;
        }

        // Validate recipient
        if (!recipient) {
            console.error('Recipient address is required');
            return false;
        }

        // Attempt to create a PublicKey from the recipient string
        // This will throw an error if the address is invalid
        const recipientPublicKey = new PublicKey(recipient);

        // Check if the sender has sufficient SOL balance for fees
        if (activeWallet.solBalance <= 0) {
            console.error('Insufficient SOL balance for transaction fees');
            return false;
        }

        // Check if the sender has sufficient token balance
        if (balanceType === 'regular' && activeWallet.splBalance.lt(new BN(parseFloat(amount) * 1e6))) {
            console.error(`Insufficient ${token.symbol} balance`);
            return false;
        }
        if (balanceType === 'compressed' && activeWallet.zkBalance.lt(new BN(parseFloat(amount) * 1e6))) {
            console.error(`Insufficient ${token.symbol} balance`);
            return false;
        }
        return true;
    };

    const handleSend = async () => {
        if (!validateTransferRequest(amount, recipient, activeWallet, token, balanceType)) {
            // TODO: show error to user
            return;
        }

        setIsSending(true);
        let signature: string | null = null;
        try {
            // If we've made it this far, the request is valid
            // Proceed with sending tokens
            // possible transfers:
            // 1. compressed to uncompressed
            if (token.compressed && balanceType === 'regular') {
                console.log('Sending compressed tokens');
                signature = await apiClient.compress(
                    activeWallet,
                    new PublicKey(recipient),
                    amount,
                );
            }

            // 2. compressed to compressed
            if (token.compressed && balanceType === 'compressed') {
                // assumes activeWallet is the sender and payer
                console.log('Sending compressed tokens');
                signature = await apiClient.transferZK(
                    activeWallet,
                    new PublicKey(recipient),
                    amount,
                );
            }

            // 3. uncompressed to uncompressed
            if (!token.compressed && balanceType === 'regular') {
                console.log('Sending regular tokens');
                signature = await apiClient.transferSpl(
                    activeWallet,
                    new PublicKey(recipient),
                    amount,
                );
            }
            
            // 4. uncompressed to compressed
            if (!token.compressed && balanceType === 'compressed') {
                console.log('Sending uncompressed tokens');
                signature = await apiClient.decompress(
                    activeWallet,
                    new PublicKey(recipient),
                    amount,
                );
            }

            // TODO: update the UI to show the transaction was sent
            console.log('Transaction sent', signature);
            await updateWalletBalance(activeWallet.publicKey);
            await updateWalletHistory(activeWallet.publicKey);
        } catch (error) {
            console.error('Error sending tokens', error);
            return;
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
