import type { Metadata } from "next";
import localFont from "next/font/local";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import { ApiProvider } from "../src/context/ApiContext";
import { WalletsStateProvider } from "../src/context/WalletsStateContext";

const geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});
const geistMono = localFont({
    src: "./fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

export const metadata: Metadata = {
    title: "ZK Wallet Generator",
    description: "Generate a Solana wallet with a ZK balance",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased max-w-5xl mx-auto`}
            >
                <ApiProvider>
                    <WalletsStateProvider>
                        {children}
                    </WalletsStateProvider>
                </ApiProvider>
                <ToastContainer autoClose={5000} />
            </body>
        </html>
    );
}
