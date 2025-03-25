import { NATIVE_MINT } from "@solana/spl-token";
import { Connection, Keypair } from "@solana/web3.js";
import { configDotenv } from "dotenv";
import bs58 from "bs58";
configDotenv();

const RPC_URL = process.env.RPC_URL || "https://mainnet-beta.solana.com";
const WSS_URL = process.env.WSS_URL || "wss://mainnet-beta.solana.com";
export const connection = new Connection(RPC_URL, {
  wsEndpoint: WSS_URL,
  commitment: `processed`,
});

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
export const wallet = Keypair.fromSecretKey(Uint8Array.from(bs58.decode(PRIVATE_KEY)));
export const WSOL = NATIVE_MINT.toBase58();

export const targetWallets = [
  //input your target wallets
];
