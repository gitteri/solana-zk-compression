'use client'

import React from 'react';
import { useWalletsState } from './context/WalletsStateContext';
import { useNetwork } from './context/ApiContext';
import Wallet from './Wallet';

// Wallets: A React component for displaying a list of wallet summaries
const Wallets: React.FC = () => {
    const { wallets } = useWalletsState();
    const network = useNetwork();

    return (
        <div>
            {wallets.map((wallet, index) => (
                <Wallet key={wallet.publicKey.toString()} wallet={wallet} index={index} network={network} />
            ))}
        </div>
    );
}

export default Wallets;