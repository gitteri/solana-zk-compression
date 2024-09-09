'use client'

import React from 'react';
import Link from 'next/link';
import { useGlobalState } from './context/GlobalStateContext';
import Wallet from './Wallet';

const Wallets: React.FC = () => {
    const { wallets } = useGlobalState();

    return (
        <div>
            {wallets.map((wallet, index) => (
                <Wallet key={wallet.publicKey.toString()} wallet={wallet} index={index} />
            ))}
        </div>
    );
}

export default Wallets;