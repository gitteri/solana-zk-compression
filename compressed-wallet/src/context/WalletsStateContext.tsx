'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { CompressedWallet } from '../Wallet';
import { SimpleTransaction } from '../WalletHistory';
import { useApi } from './ApiContext';

// WalletsStateContext: A React context for managing the state of the wallets
// It provides the current state of the wallets, a function to set the wallets, and functions to update the balances and transaction history of the wallets
interface WalletsState {
    wallets: CompressedWallet[];
    setWallets: React.Dispatch<React.SetStateAction<CompressedWallet[]>>;
    updateWalletBalance: (address: PublicKey) => Promise<void>;
    updateWalletSolBalance: (address: PublicKey) => Promise<void>;
    updateWalletZkBalance: (address: PublicKey) => Promise<void>;
    updateWalletHistory: (address: PublicKey) => Promise<void>;
    hydrated: boolean;
}

// getCompressedWallets: A helper function to retrieve the wallets from local storage and convert them to CompressedWallet objects
const getCompressedWallets = (): CompressedWallet[] => {
    return parseCompressedWallets(localStorage?.getItem('wallets') || '[]');
}

// parseCompressedWallets: A helper function to parse the wallets from local storage and convert them to CompressedWallet objects
const parseCompressedWallets = (walletStrings: string): CompressedWallet[] => {
    const walletsData = JSON.parse(walletStrings);
    return walletsData.map((wallet: { publicKey: string, privateKey: object, solBalance: string, splBalance: string, zkBalance: string, txnHistory: SimpleTransaction[] }) => {
        return {
            ...wallet,
            publicKey: new PublicKey(wallet.publicKey),
            privateKey: new Uint8Array(Object.values(wallet.privateKey)),
            solBalance: new BN(wallet.solBalance, 16),
            splBalance: new BN(wallet.splBalance, 16),
            zkBalance: new BN(wallet.zkBalance, 16),
            txnHistory: wallet.txnHistory || [],
        };
    });
};

// WalletsStateContext: A React context for managing the state of the wallets
// It provides the current state of the wallets, a function to set the wallets, and functions to update the balances and transaction history of the wallets
const WalletsStateContext = createContext<WalletsState>({
    wallets: [],
    setWallets: () => { },
    updateWalletBalance: async () => { },
    updateWalletSolBalance: async () => { },
    updateWalletZkBalance: async () => { },
    updateWalletHistory: async () => { },
    hydrated: false,
});

// useWalletsState: A custom hook that allows components to easily access the wallets state and functions
export const useWalletsState = () => useContext(WalletsStateContext);

// WalletsStateProvider: A component that wraps the application and provides the wallets state and functions to all child components
// It initializes the wallets state and updates the balances and transaction history of the wallets
export const WalletsStateProvider = ({ children }: { children: React.ReactNode }) => {
    const [wallets, setWallets] = useState<CompressedWallet[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const apiService = useApi();

    const updateWalletSolBalance = async (address: PublicKey) => {
        const solBalance = await apiService.getSolBalance(address);
        console.log('Updating SOL balance for', address.toString(), 'to', solBalance);
        setWallets((prevWallets) =>
            prevWallets.map(wallet =>
                wallet.publicKey.equals(address) ? {
                    ...wallet,
                    solBalance: solBalance,
                } : wallet
            )
        );
    };

    const updateWalletZkBalance = async (address: PublicKey) => {
        const zkBalance = await apiService.getZkBalance(address);
        console.log('Updating ZK balance for', address.toString(), 'to', zkBalance);
        setWallets((prevWallets) =>
            prevWallets.map(wallet =>
                wallet.publicKey.equals(address) ? {
                    ...wallet,
                    zkBalance: zkBalance,
                } : wallet
            )
        );
    };

    const updateAllWalletBalances = async () => {
        wallets.forEach(wallet => updateWalletBalance(wallet.publicKey));
    };

    const updateWalletBalance = async (address: PublicKey) => {
        console.log('Updating balance for', address.toString());
        const allBalances = await apiService.getAllBalances(address);
        console.log('All balances for', address.toString(), 'are', allBalances);

        setWallets((prevWallets) =>
            prevWallets.map(wallet =>
                wallet.publicKey.equals(address) ? {
                    ...wallet,
                    solBalance: allBalances.solBalance,
                    splBalance: allBalances.splBalance,
                    zkBalance: allBalances.zkBalance,
                } : wallet
            )
        );
    };

    const updateAllWalletHistory = async () => {
        wallets.forEach(wallet => updateWalletHistory(wallet.publicKey));
    };

    const updateWalletHistory = async (address: PublicKey) => {
        const history = await apiService.getTxnHistory(address);
        console.log('Updating transaction history for', address.toString(), 'to', history);
        setWallets((prevWallets) =>
            prevWallets.map(wallet =>
                wallet.publicKey.equals(address) ? {
                    ...wallet,
                    txnHistory: history,
                } : wallet
            )
        );
    };

    useEffect(() => {
        console.log("Debug: loading initial state");
        setWallets(getCompressedWallets());
        updateAllWalletBalances();
        updateAllWalletHistory();
        setHydrated(true);
    }, []);

    useEffect(() => {
        // Periodically update balances for all wallets
        const intervalId = setInterval(() => {
            wallets.forEach(wallet => updateWalletBalance(wallet.publicKey));
            wallets.forEach(wallet => updateWalletHistory(wallet.publicKey));

            if (typeof window !== 'undefined') {
                localStorage.setItem('wallets', JSON.stringify(wallets));
            }
        }, 10000); // Update every 10 seconds


        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, [wallets]);

    return (
        <WalletsStateContext.Provider value={{ wallets, setWallets, updateWalletBalance, updateWalletSolBalance, updateWalletZkBalance, updateWalletHistory, hydrated }}>
            {children}
        </WalletsStateContext.Provider>
    );
}