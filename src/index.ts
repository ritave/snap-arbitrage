import type { BIP44CoinTypeNode } from '@metamask/key-tree';
import { getBIP44AddressKeyDeriver } from '@metamask/key-tree';
import type { SnapProvider } from '@metamask/snap-types';
import { ethers, Wallet } from 'ethers';

// TODO(ritave): Remove types after https://github.com/MetaMask/snaps-skunkworks/issues/367 is fixed
declare const wallet: SnapProvider;

const RETURN_OK = 'Ok';
const RETURN_FAIL = 'Fail';

/**
 * Used to stop the infinite execution loop.
 * The main execute fuction waits for new trade events forever
 * unless the stopPromise returns
 */
let stopPromise:
  | { promise: Promise<typeof RETURN_OK>; resolve: () => void }
  | undefined;

async function getSigner(provider: ethers.providers.Provider): Promise<Wallet> {
  // Metamask uses default HD derivation path
  // https://metamask.zendesk.com/hc/en-us/articles/360060331752-Importing-a-seed-phrase-from-another-wallet-software-derivation-path
  const ethereumNode = (await wallet.request({
    method: 'snap_getBip44Entropy_60',
  })) as unknown as BIP44CoinTypeNode;
  const deriveEthereumAccount = getBIP44AddressKeyDeriver(ethereumNode);
  // A bug:
  // The current public version of @metamask/key-tree's derive function returns the private key and chain code in a single buffer
  // Ether.js also accepts a 64 byte buffer without errors and returns wrong keys
  // Related issue: https://github.com/ethers-io/ethers.js/issues/2926
  // TODO(ritave): Update to newest key-tree when available and use deriveEthereumAccount(0).privateKey
  const mainAccountKey = deriveEthereumAccount(0).slice(0, 32);
  return new Wallet(mainAccountKey, provider);
}

async function execute() {
  const provider = new ethers.providers.Web3Provider(wallet as any);
  // We use a private keys directly to skip Metamask send transaction user requests
  const signer = await getSigner(provider);

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
    return RETURN_FAIL;
  }

  let promise: Promise<typeof RETURN_OK>;
  let resolve: () => void;
  promise = new Promise((r) => (resolve = () => r(RETURN_OK)));
  stopPromise = { promise, resolve };

  while (true) {
    const result = await Promise.race([stopPromise.promise]);
    if (result === RETURN_OK) {
      return RETURN_OK;
    }
  }
}

async function stop() {
  if (stopPromise === undefined) {
    return RETURN_FAIL;
  }
  stopPromise.resolve();
  stopPromise = undefined;
  return RETURN_OK;
}

wallet.registerRpcMessageHandler(async (_originString, requestObject) => {
  switch (requestObject.method) {
    case 'execute':
      return await execute();
    case 'stop':
      return await stop();
    default:
      throw new Error('Method not found.');
  }
});
