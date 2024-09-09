'use client'

import React from 'react';
import { useGlobalState } from './context/GlobalStateContext';
import { generateWallet } from './Wallet';

const GenerateWallet = () => {
    const { wallets, setWallets } = useGlobalState();

    return (
        <div className="my-2">
            <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300"
                onClick={() => {
                    const wallet = generateWallet();
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('wallets', JSON.stringify([...wallets, wallet]));
                    }
                    setWallets([...wallets, wallet]);
                }}
            >
                Generate Wallet
            </button>
        </div>
    )
}

export default GenerateWallet;