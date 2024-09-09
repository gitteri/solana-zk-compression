'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { CompressedWallet } from '../Wallet';
import { SimpleTransaction } from '../WalletHistory';
import { useApi } from './ApiContext';

interface GlobalState {
    wallets: CompressedWallet[];
    setWallets: React.Dispatch<React.SetStateAction<CompressedWallet[]>>;
    updateWalletBalance: (address: PublicKey) => Promise<void>;
    updateWalletSolBalance: (address: PublicKey) => Promise<void>;
    updateWalletZkBalance: (address: PublicKey) => Promise<void>;
    updateWalletHistory: (address: PublicKey) => Promise<void>;
    hydrated: boolean;
}

const getCompressedWallets = (): CompressedWallet[] => {
    return parseCompressedWallets(localStorage?.getItem('wallets') || '[]');
}

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


const GlobalStateContext = createContext<GlobalState>({
    wallets: [],
    setWallets: () => { },
    updateWalletBalance: async () => { },
    updateWalletSolBalance: async () => { },
    updateWalletZkBalance: async () => { },
    updateWalletHistory: async () => { },
    hydrated: false,
});

export const useGlobalState = () => useContext(GlobalStateContext);

export const GlobalStateProvider = ({ children }: { children: React.ReactNode }) => {
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
        }, 10000); // Update every 1 seconds


        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, [wallets]); // Depend on the wallets array

    return (
        <GlobalStateContext.Provider value={{ wallets, setWallets, updateWalletBalance, updateWalletSolBalance, updateWalletZkBalance, updateWalletHistory, hydrated }}>
            {children}
        </GlobalStateContext.Provider>
    );
}