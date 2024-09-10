'use client'

import React from 'react';
import { useWalletsState } from './context/WalletsStateContext';
import Wallet from './Wallet';

// Wallets: A React component for displaying a list of wallet summaries
const Wallets: React.FC = () => {
    const { wallets } = useWalletsState();

    return (
        <div>
            {wallets.map((wallet, index) => (
                <Wallet key={wallet.publicKey.toString()} wallet={wallet} index={index} />
            ))}
        </div>
    );
}

export default Wallets;