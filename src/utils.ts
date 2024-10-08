import { BN } from '@coral-xyz/anchor';
import { toast } from 'react-toastify';
/**
 * Converts a BN balance to a string representation with the specified number of decimals.
 * @param balance The balance as a BN object
 * @param decimals The number of decimal places for the asset
 * @returns A string representation of the balance
 */
export function formatBalance(balance: BN, decimals: number): string {
    const balanceString = balance.toString().padStart(decimals + 1, '0');
    const integerPart = balanceString.slice(0, -decimals) || '0';
    const fractionalPart = balanceString.slice(-decimals);
    return `${integerPart}.${fractionalPart}`;
}

/**
 * Formats a USDC balance with 6 decimal places.
 * @param balance The USDC balance as a BN object
 * @returns A string representation of the USDC balance
 */
export function formatUSDCBalance(balance: BN): string {
    return formatBalance(balance, 6);
}

/**
 * Formats a SOL balance with 9 decimal places.
 * @param balance The SOL balance as a BN object
 * @returns A string representation of the SOL balance
 */
export function formatSOLBalance(balance: BN): string {
    return formatBalance(balance, 9);
}

/**
 * Converts a float string to BN for SOL (9 decimal places).
 * @param amount The SOL amount as a float string
 * @returns A BN representation of the SOL amount
 */
export function solToBN(amount: string): BN {
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat)) {
        throw new Error("Invalid amount: unable to parse float");
    }
    const lamports = Math.floor(amountFloat * 1e9);
    return new BN(lamports);
}

/**
 * Converts a float string to BN for USDC (6 decimal places).
 * @param amount The USDC amount as a float string
 * @returns A BN representation of the USDC amount
 */
export function usdcToBN(amount: string): BN {
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat)) {
        throw new Error("Invalid amount: unable to parse float");
    }
    const microUsdc = Math.floor(amountFloat * 1e6);
    return new BN(microUsdc);
}

/**
 * Copies text to the clipboard and displays a popup notification.
 * @param text The text to be copied to the clipboard
 */
export function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', { autoClose: 2000 });
}
