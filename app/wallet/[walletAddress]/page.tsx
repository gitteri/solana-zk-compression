'use client'

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useWalletsState } from '../../../src/context/WalletsStateContext';
import Wallet from '../../../src/Wallet';
import WalletHistory from '../../../src/WalletHistory';
import WalletActions from '../../../src/WalletActions';

const WalletPage: React.FC = () => {
    const params = useParams();
    const router = useRouter();

    const walletAddress = params.walletAddress as string;
    const { wallets, hydrated } = useWalletsState();
    const wallet = wallets.find(w => w.publicKey.toString() === walletAddress);

    useEffect(() => {
        if (!wallet && hydrated) {
            router.push('/');
        }
    }, [wallet, hydrated, router]);

    return (
        <div className="container mx-auto p-4">
            <div className="flex items-center mb-6">
                <Link href="/" className="text-blue-500 hover:text-blue-600 transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </Link>
            </div>
            {wallet && (
                <React.Fragment>
                    <h1 className="text-3xl font-bold mb-6">Wallet Details</h1>
                    <Wallet wallet={wallet} index={wallets.indexOf(wallet)} />
                    <WalletHistory transactions={wallet.txnHistory} />
                    <WalletActions wallet={wallet} />
                </React.Fragment>
            )}
        </div>
    );
};

export default WalletPage;
