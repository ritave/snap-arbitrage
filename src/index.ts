import {
  BIP44CoinTypeNode,
  getBIP44AddressKeyDeriver,
} from '@metamask/key-tree';
// TODO(ritave): Remove types after https://github.com/MetaMask/snaps-skunkworks/issues/367 is fixed
import type { SnapProvider } from '@metamask/snap-types';
import { ethers, Wallet } from 'ethers';
declare const wallet: SnapProvider;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function execute() {
  // Metamask uses default HD derivation path
  // https://metamask.zendesk.com/hc/en-us/articles/360060331752-Importing-a-seed-phrase-from-another-wallet-software-derivation-path
  const ethereumNode = (await wallet.request({
    method: 'snap_getBip44Entropy_60',
  })) as unknown as BIP44CoinTypeNode;
  const dervideEthereumAccount = getBIP44AddressKeyDeriver(ethereumNode);
  const mainAccount = dervideEthereumAccount(0);

  const provider = new ethers.providers.Web3Provider(wallet as any);
  // We use a signer to skip Metamask send transaction user requests
  const signer = new Wallet(mainAccount, provider);

  const shouldContinue = await wallet.request({
    method: 'snap_confirm',
    params: [
      {
        prompt: 'Do you want to use this account?',
        textAreaContent: `Do you want to use the account "${signer.address}" for algorithmic trading?`,
      },
    ],
  });
  if (!shouldContinue) {
    return 'Fail';
  }
  return 'Ok';
}

wallet.registerRpcMessageHandler(async (_originString, requestObject) => {
  switch (requestObject.method) {
    case 'execute':
      return await execute();
    default:
      throw new Error('Method not found.');
  }
});
