import { targetWallets } from "./config";
import { subscribeTxn } from "./txnListner";

const run = () => {
  targetWallets.forEach((wallet) => subscribeTxn(wallet));
};
run();
