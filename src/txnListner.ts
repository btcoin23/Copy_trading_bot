import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { connection, wallet, WSOL } from "./config";
import { jupiterSwap, SwapParam } from "./jupiterSwap";
import { initLogger } from "./logger";

initLogger();

export const subscribeTxn = (key: string) => {
  console.log("Subscribe to trading events for key:", key);
  const anaylzeSignature = async (log: any) => {
    try {
      const { logs, err, signature } = log;
      if (err) return;
      // Handle new trading events
      // console.log("New trading event:", signature);
      const txn = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      if (
        txn &&
        txn.meta &&
        txn.meta.preTokenBalances &&
        txn.meta.postTokenBalances
      ) {
        // console.log("predata", txn.meta.preTokenBalances);
        // console.log("posttokendata", txn.meta.postTokenBalances);
        // console.log("loaced addresses", txn.meta.innerInstructions);
        const signer = txn.transaction.message.accountKeys
          .find(
            (key) => key.signer && key.writable && key.source === "transaction"
          )
          ?.pubkey.toBase58();
        if (!signer) throw new Error(`Singer not found ${signature}`);
        const delta_sol =
          (txn.meta.postBalances[0] - txn.meta.preBalances[0] + txn.meta.fee) /
          LAMPORTS_PER_SOL;
        const txnData = getTxnData(
          signer,
          txn.meta.preTokenBalances,
          txn.meta.postTokenBalances
        );
        if (!txnData) return;
        // throw new Error(`Txn data not found ${signature}`);

        console.log(
          `${
            txnData.is_buy ? "🟢 Buy" : "🔴 Sell"
          } | ${signature} from wallet: ${key}
            | Token: ${txnData.mint}
            | Amount: ${txnData.delta_token.toFixed(3)}
            | SOL: ${delta_sol.toFixed(9)}
            | WSOL: ${txnData.delta_wsol.toFixed(9)} ⚡`
        );

        const amount = txnData.is_buy
          ? Math.abs(Math.min(txnData.delta_wsol, delta_sol))
          : delta_sol;

        const swapData: SwapParam = {
          wallet,
          mint: txnData.mint,
          token_decimals: txnData.decimals,
          is_buy: txnData.is_buy,
          amount,
        };

        jupiterSwap(swapData).then((result) => {
          if (result.success) {
            console.log(`✅ Swap successful: ${result.signature}`);
          } else {
            console.error(`❌ Swap failed: ${result.error}`);
          }
        });
      }
    } catch (error: any) {
      console.error("Error subscribing to trading events:", error.message);
    }
  };
  return connection.onLogs(new PublicKey(key), anaylzeSignature, "processed");
};

const getTxnData = (signer: string, preData: any[], postData: any[]) => {
  // console.log("preData")
  // preData.forEach(item => console.log(item.mint, item.owner, item.uiTokenAmount.uiAmount))
  // console.log("postData")
  // postData.forEach(item => console.log(item.mint, item.owner, item.uiTokenAmount.uiAmount))
  let mint = "";
  let is_buy = false;
  let decimals = 0;
  let delta_wsol = 0;
  let delta_token = 0;

  let preTokenBalance = 0;
  let postTokenBalance = 0;
  for (const item1 of preData) {
    const _mint1 = item1.mint;
    const _owner1 = item1.owner;
    if (_mint1 != WSOL && _owner1 === signer) {
      preTokenBalance = Number(item1.uiTokenAmount.uiAmount);
    }
    for (const item2 of postData) {
      const _mint2 = item2.mint;
      const _owner2 = item2.owner;
      if (_mint2 != WSOL && _owner2 === signer) {
        postTokenBalance = Number(item2.uiTokenAmount.uiAmount);
      }
      if (_mint1 === WSOL && _mint2 === WSOL) {
        if (_owner1 === _owner2 && _owner1 != signer) {
          delta_wsol +=
            Number(item1.uiTokenAmount.uiAmount) -
            Number(item2.uiTokenAmount.uiAmount);
        }
      } else if (_owner1 === _owner2 && _mint1 === _mint2) {
        mint = _mint1;
        decimals = item1.uiTokenAmount.decimals;
      }
    }
  }
  delta_token = postTokenBalance - preTokenBalance;

  is_buy = delta_token > 0 && delta_wsol <= 0;
  if (mint === "" || decimals === 0 || delta_token === 0) return null;
  return {
    mint,
    is_buy,
    decimals,
    delta_wsol,
    delta_token,
  };
};
