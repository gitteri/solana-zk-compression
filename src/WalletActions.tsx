import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { DEVNET, useApi } from './context/ApiContext';
import { useWalletsState } from './context/WalletsStateContext';
import { CompressedWallet } from './Wallet';
import SendToken, { Token } from './SendToken';

/**
 * WalletActions: A React component for performing actions on a wallet.
 * It allows airdropping SOL, sending USDC, and sending compressed USDC.
 * It also handles the state of the active token being sent.
 */
const WalletActions: React.FC<{ wallet: CompressedWallet }> = ({ wallet }) => {
    const [activeToken, setActiveToken] = useState<Token>({ symbol: '', compressed: false });
    const [isAirdropping, setIsAirdropping] = useState(false);

    const { updateWalletSolBalance } = useWalletsState();
    const apiService = useApi();

    const handleAirdrop = async (publicKey: PublicKey) => {
        // Implement airdrop logic
        setIsAirdropping(true);
        const airdrop = await apiService.airdropSolana(publicKey);
        console.log('Airdrop requested', airdrop);
        await updateWalletSolBalance(publicKey);
        toast.success('Received airdropped SOL', { autoClose: 2000 });
        setIsAirdropping(false);
    };

    const handleSendSOL = async () => {
        setActiveToken({ symbol: 'SOL', compressed: false });
    };

    const handleSendUSDC = async () => {
        setActiveToken({ symbol: 'USDC', compressed: false });
    };

    const handleSendCompressedUSDC = async () => {
        setActiveToken({ symbol: 'USDC', compressed: true });
    };

    return (
        <React.Fragment>
            <div className="grid grid-cols-2 gap-4">
                {/* Show the faucet for SOL & USDC on devnet */}
                {apiService.network === DEVNET && (
                    <React.Fragment>
                        <button onClick={() => handleAirdrop(wallet.publicKey)}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
                        >
                            {isAirdropping ? 'Airdropping...' : 'Airdrop SOL'}
                        </button>
                        <Link href="https://faucet.circle.com/" target="_blank">
                            <button
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
                                title="Can only receive 1 airdrop per hour"
                            >
                                Receive USDC
                            </button>
                        </Link>
                    </React.Fragment>
                )}
                <button onClick={handleSendSOL}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
                >
                    Send SOL
                </button>
                <button onClick={handleSendUSDC}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
                >
                    Send USDC
                </button>
                <button onClick={handleSendCompressedUSDC}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
                >
                    Send USDC Compressed
                </button>
            </div>
            <SendToken token={activeToken} activeWallet={wallet} />
        </React.Fragment>
    )
}

export default WalletActions;