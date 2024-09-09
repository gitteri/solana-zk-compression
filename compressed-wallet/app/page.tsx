import GenerateWallet from '../src/GenerateWallet';
import Wallets from '../src/Wallets';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold">Solana ZK Wallet Generator</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-full">
          <GenerateWallet />
          <Wallets />
        </div>
      </main>

      <footer className="py-4">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <span role="img" aria-label="document" className="mr-2">📄</span>
          <span>Learn More</span>
        </div>
      </footer>
    </div>
  );
}
