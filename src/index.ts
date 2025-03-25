import { subscribeTxn } from "./txnListner";

const monitorWallets = [
  "3iyasajvLWsNTeujYqciwpUdWVbRrjAGQrCFEDsq8BEH",
  "EfiKUQy9xwiYJefSHLUf4HnpJaWtgGsYwFYEWkw5WDRS",
  "5RVAcmwVdjumYGnqBKH9MvjQ1M2apkGhCNoHpvv1yNEj",
  "GW8s7MPgveVFc6RFMDsRQQBQbwbjLrLSCx9YnqubCifS",
];

const run = () => {
  monitorWallets.forEach((wallet) => subscribeTxn(wallet));
};
run();
