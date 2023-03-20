import React from 'react';
import { useEffect, useState } from "react";

import './App.css';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction
} from "@solana/web3.js";
window.Buffer = window.Buffer || require("buffer").Buffer;

type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};


function App() {

  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );
  const [senderWalletSecretKey, setsenderWalletSecretKey] = useState([] as any);
  const [senderWalletStorage, setsenderWallet] = useState("");
  const [walletKey, setWalletKey] = useState<any>();

  // this is the function that runs whenever the component updates (e.g. render, refresh)
  useEffect(() => {
    const provider = getProvider();

    // if the phantom provider exists, set this as the provider
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  let senderWallet = Keypair.generate();

  const generateacc = async () => {
    setsenderWallet(senderWallet.publicKey.toString());
    setsenderWalletSecretKey(senderWallet.secretKey);

    console.log("Airdopping some SOL to Sender wallet!");

    const fromAirDropSignature = await connection.requestAirdrop(
      new PublicKey(senderWallet.publicKey),
      2 * LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(fromAirDropSignature);

    console.log("Airdrop completed for the Sender account");

  }

  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    if (solana) {
      try {

        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());

        setWalletKey(response.publicKey.toString());
      } catch (err) {
        // { code: 4001, message: 'User rejected the request.' }
      }
    }
  };
  const disconnectWallet = async () => {
    const { solana } = window;
    if (walletKey && solana) {
      await (solana as PhantomProvider).disconnect();
      setWalletKey("");
      console.log("disconnected")
    }
  }
  const transfer = async () => {
    try {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const senderPublicKey = new PublicKey(senderWalletStorage);
      const receiverPublicKey = new PublicKey(walletKey.toString());
      const secret = Uint8Array.from(senderWalletSecretKey);
      const senderKeyPair = Keypair.fromSecretKey(secret);

      var transaction = new Transaction().add(

        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: receiverPublicKey,
          lamports: 1.999 * 1000000000,
        })
      );

      // sign and send the transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeyPair]);

      console.log('Transaction signature:', signature);
    } catch (error) {
      console.log('Error transferring SOL:', error);
    }
  }


  return (
    <div className="App">
      <header className="App-header">

        <h2>Create a new Solana Account</h2>
        <button style={{
          fontSize: "16px",
          padding: "15px",
          fontWeight: "bold",
          borderRadius: "5px",
        }} onClick={generateacc}>Create</button>
        <h2>Connect to Phantom Wallet</h2>

        {provider && !walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={connectWallet}
          >
            Connect to Phantom Wallet
          </button>
        )}
        {provider && walletKey && <p>Connected account</p>}

        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>

        )}
        <h2>Transfer</h2>
        <button style={{
          fontSize: "16px",
          padding: "15px",
          fontWeight: "bold",
          borderRadius: "5px",
        }} onClick={() => transfer()}>Transfer to new wallet</button>
        <div><h2>Disconnect Wallet</h2><button style={{
          fontSize: "16px",
          padding: "15px",
          fontWeight: "bold",
          borderRadius: "5px",
        }} onClick={disconnectWallet}>Disconnect Wallet</button></div>
      </header>
    </div>
  );
}

export default App;
