'use client'

import React from 'react';
import { BN } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { copyToClipboard, formatSOLBalance, formatUSDCBalance } from './utils';
import { SimpleTransaction } from './WalletHistory';

// CompressedWallet: A type representing a compressed wallet with its public key (address),
// private key, SOL balance, SPL token balance, Compressed token balance, and transaction history
export type CompressedWallet = {
    publicKey: PublicKey;
    privateKey: Uint8Array;
    solBalance: BN;
    splBalance: BN;
    zkBalance: BN;
    txnHistory: SimpleTransaction[];
};

/**
 * Generates a new CompressedWallet with default balances and an empty transaction history.
 * @returns A new CompressedWallet object
 */
export const generateWallet = (): CompressedWallet => {
    const keypair = Keypair.generate();
    return {
        publicKey: keypair.publicKey,
        privateKey: keypair.secretKey,
        solBalance: new BN(0),
        splBalance: new BN(0),
        zkBalance: new BN(0),
        txnHistory: [],
    };
}

/**
 * Renders a wallet card with its public key (address), SOL balance, SPL token balance, compressed token balance,
 * and a link to the wallet's transaction history.
 * @param wallet The CompressedWallet object to be displayed
 * @param index The index of the wallet in the list
 * @returns A React component displaying the wallet details
 */
const Wallet: React.FC<{ wallet: CompressedWallet, index: number, network: string }> = ({ wallet, index, network }) => {
    if (!wallet) {
        return <div>Loading...</div>;
    }
    
    return (
        <div key={wallet.publicKey.toString()}
            className="bg-white shadow-md rounded-lg p-4 border border-gray-200 my-2"
        >
            <div className="flex justify-between items-center mb-2">
                <Link href={`/wallet/${wallet.publicKey.toString()}`}>
                    <h3 className="text-lg font-medium">Wallet {index + 1}</h3>
                </Link>
                <Link href={`https://explorer.solana.com/address/${wallet.publicKey.toString()}?cluster=${network}`}
                    passHref target="_blank">
                    <span className="cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                    </span>
                </Link>
            </div>
            <div className="border-b border-gray-200 opacity-50 mb-2"></div>
            <div className="space-y-2">
                <p className="text-sm flex items-center">
                    <span className="font-semibold">Address:</span>{' '}
                    <span className="font-mono text-xs break-all">{wallet.publicKey.toString()}</span>
                    <button
                        onClick={() => {
                            copyToClipboard(wallet.publicKey.toString());
                        }}
                        className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        title="Copy to clipboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </p>
                <p className="text-sm">
                    <span className="font-semibold">SOL Balance:</span>{' '}
                    {formatSOLBalance(wallet.solBalance)} SOL
                </p>
                <p className="text-sm">
                    <span className="font-semibold">SPL Token Balance:</span>{' '}
                    {formatUSDCBalance(wallet.splBalance)} USDC
                </p>
                <p className="text-sm">
                    <span className="font-semibold">Compressed Token Balance:</span>{' '}
                    {formatUSDCBalance(wallet.zkBalance)} Compressed USDC
                </p>
            </div>
        </div>
    )
}

export default Wallet;