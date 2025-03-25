import {
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import { connection, WSOL } from "./config";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { wait } from "./jito.bundle";

export type SwapParam = {
  wallet: Keypair;
  mint: string;
  token_decimals: number;
  amount: number;
  is_buy: boolean;
};

export type SwapResult = {
  success: boolean;
  signature: string;
  error: any;
};

export const jupiterSwap = async (
  swapParam: SwapParam
): Promise<SwapResult> => {
  try {
    const { wallet, mint, token_decimals, amount, is_buy } = swapParam;
    const decimals = is_buy? 9: token_decimals
    const buyAmountRatio = 0.0001;
    const swapAmount = is_buy ? amount * buyAmountRatio : await getTokenBalance(wallet.publicKey.toBase58(), mint);
    if(swapAmount <= 0)
      throw new Error(`Insufficient token balance: ${swapAmount}`);
    // const amountInLamports = swapAmount.toFixed(0);
    const amountInLamports = (swapAmount * 10 ** decimals).toFixed(0);
    const inputMint = is_buy ? WSOL : mint;
    const outputMint = is_buy ? mint : WSOL;
    const slippage = is_buy ? 100 : 100;
    const jitoTipLamports = is_buy ? 100000: 100000

    //   const solBal = (await connection.getBalance(wallet.publicKey)) / LAMPORTS_PER_SOL;
    //   if(is_buy)
    //   {
    //     const requiredSol = amount + jito_tip + Number(SYS_FEE) / LAMPORTS_PER_SOL;
    //     if(solBal < requiredSol)
    //       return {
    //         success: false,
    //         signature: '',
    //         error: "Insufficient SOL balance!. Required: " + requiredSol.toFixed(9) + " SOL, Available: " + solBal.toFixed(9) + " SOL"
    //       };
    //   }
    //   else{
    //     const requiredSol = jito_tip + Number(SYS_FEE) / LAMPORTS_PER_SOL;
    //     if(solBal < requiredSol)
    //       return {
    //         success: false,
    //         signature: '',
    //         error: "Insufficient SOL balance!. Required: " + requiredSol.toFixed(9) + " SOL, Available: " + solBal.toFixed(9) + " SOL"
    //       };
    //     else
    //     {
    //       const splBal = await getTokenBalance(mint, wallet.publicKey)
    //       if(splBal < amount)
    //         return {
    //           success: false,
    //           signature: '',
    //           error: "Insufficient SPL token balance!. Required: " + amount + " " + ", Available: " + splBal
    //         };
    //     }
    //   }

    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}\&outputMint=${outputMint}\&amount=${amountInLamports}\&slippageBps=${
      slippage * 100
    }`;
    const quoteResponse = await (await fetch(url)).json();
    if(!quoteResponse)
      throw new Error("Error fetching quote");
    // console.log("got swap quote")
    const swapTxnResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: wallet.publicKey.toBase58(),
        dynamicComputeUnitLimit: true,
        wrapAndUnwrapSol: true,
        // dynamicSlippage: true,
        prioritizationFeeLamports: {
          // priorityLevelWithMaxLamports: {
          //   maxLamports: 100000,
          //   global: false,
          //   priorityLevel: "veryHigh",
          // },
          jitoTipLamports, // note that this is FIXED LAMPORTS not a max cap
        },
      }),
    });

    const swapTransaction = (await swapTxnResponse.json()).swapTransaction;
    if (!swapTxnResponse.ok){
      console.log("Error swap transaction", swapTxnResponse);
      throw new Error("Error fetching swap transaction");
    }
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(swapTransaction, "base64")
    );
    transaction.sign([wallet]);
    const transactionBinary = transaction.serialize();
    const signature = await connection.sendRawTransaction(transactionBinary, {
      // maxRetries: 2,
      skipPreflight: true,
    });
    return {
      success: true,
      signature,
      error: null,
    };
  } catch (e: any) {
    console.log(e);
    return {
      success: false,
      signature: "",
      error: e.message,
    };
  }
};

async function getTokenBalance(
  walletAddress: string,
  tokenMintAddress: string
) {
  try {
    // Get associated token account
    const associatedTokenAddress = getAssociatedTokenAddressSync(
      new PublicKey(tokenMintAddress),
      new PublicKey(walletAddress)
    );
    const tokenAccountInfo = await connection.getTokenAccountBalance(
      associatedTokenAddress
    );

    return Number(tokenAccountInfo.value.uiAmount);
  } catch (error) {
    return 0;
  }
}


async function getTxnStatus(signature: string) {
  const MAX_CHECK_JITO = 30;
  let retries = 0;
  // const now = Date.now();
  while (retries < MAX_CHECK_JITO) {
    try {
      retries++;
      const res = await connection.getSignatureStatus(signature);
      // console.log(res.value?.confirmationStatus);
      if (res.value?.err) {
        await wait(1000);
        continue;
      }

      if(res.value?.confirmationStatus === "confirmed" || res.value?.confirmationStatus === "finalized")
      {
        retries = 0;
        // console.log("Got txn status in ", (Date.now() - now) + "ms");
        break;
      }
    } catch (error) {
      // console.error("GetBundleStatus Failed");
    }
  }
  if (retries === 0) return true;
  return false;
}