import React from 'react';

/**
 * SimpleTransaction: A type representing a simple transaction with its signature, slot, and compression status.
 * note: for simplicity, we're not including the actual transaction data, just the signature, slot, and compression status
 * in a real-world application, you would likely want to include more data, such as the transaction's data, fee, and other metadata
 */
export type SimpleTransaction = {
    signature: string;
    slot: number;
    isCompressed: boolean;
}

interface WalletHistoryProps {
    transactions: SimpleTransaction[];
}

/**
 * WalletHistory: A React component for displaying a wallet's transaction history.
 * @param transactions An array of SimpleTransaction objects representing the wallet's transactions
 * @returns A React component displaying the wallet's transaction history in a collapsible details section
 */
const WalletHistory: React.FC<WalletHistoryProps> = ({ transactions }) => {
    if (!transactions || transactions.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 mb-6">
            <details className="bg-gray-100 rounded-lg p-4">
                <summary className="font-semibold text-lg cursor-pointer">
                    Transaction History
                </summary>
                <div className="mt-4">
                    <ul className="space-y-2">
                        {transactions.map((tx, index) => (
                            <li key={index} className="bg-white p-3 rounded shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-sm truncate w-2/3">
                                        <a href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline"
                                        >
                                            {tx.signature}
                                        </a>
                                    </span>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${tx.isCompressed ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'}`}>
                                        {tx.isCompressed ? 'Compressed' : 'Regular'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Slot: {tx.slot}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </details>
        </div>
    )
}

export default WalletHistory;