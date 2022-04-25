import type { BIP44CoinTypeNode } from '@metamask/key-tree';
import { getBIP44AddressKeyDeriver } from '@metamask/key-tree';
import type { SnapProvider } from '@metamask/snap-types';
import { Mutex } from 'async-mutex';
import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import {
  Address,
  ERC20,
  RETURN_FAIL,
  RETURN_OK,
  SUSHI,
  UNISWAP,
} from './constants';
import { onceToPromise, sortAddresses } from './utils';

// TODO(ritave): Remove types after https://github.com/MetaMask/snaps-skunkworks/issues/367 is fixed
declare const wallet: SnapProvider;

interface TradeLog {
  tokenA: {
    name: string;
    difference: string;
  };
  tokenB: {
    name: string;
    difference: string;
  };
  timestamp: number;
}

type State = {
  logs: TradeLog[];
};

/**
 * Used to stop the infinite execution loop.
 * The main execute fuction waits for new trade events forever
 * unless the stopPromise returns
 */
let stopPromise:
  | { promise: Promise<typeof RETURN_OK>; resolve: () => void }
  | undefined;

const stateMutex = new Mutex();

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

function timestamp(): number {
  return Math.round(new Date().getTime() / 1000);
}

async function execute(tokenAAddress: Address, tokenBAddress: Address) {
  const provider = new ethers.providers.Web3Provider(wallet as any);
  // We use a private keys directly to skip Metamask send transaction user requests
  const signer = await getSigner(provider);

  if ((await provider.getNetwork()).name !== 'rinkeby') {
    return RETURN_FAIL;
  }

  const tokenA = new Contract(tokenAAddress, ERC20.abi, signer);
  const tokenB = new Contract(tokenBAddress, ERC20.abi, signer);

  // Asynchronous calls instead of linear
  const tokenData: [string, string, string] = await Promise.all([
    tokenA.name(),
    tokenA.symbol(),
    tokenB.name(),
  ]);

  const tokenAData = {
    name: tokenData[0],
    symbol: tokenData[1],
  };

  const tokenBData = {
    name: tokenData[2],
  };

  const shouldContinue = await wallet.request({
    method: 'snap_confirm',
    params: [
      {
        prompt: 'Do you want to use this account?',
        textAreaContent: `Do you want to use the account "${signer.address}" for algorithmic trading between "${tokenAData.name}" and "${tokenBData.name}"?`,
      },
    ],
  });
  if (!shouldContinue) {
    return RETURN_FAIL;
  }

  const uniswapFactory = new Contract(
    UNISWAP.contracts.factory.address,
    UNISWAP.contracts.factory.abi,
    signer,
  );
  const sushiFactory = new Contract(
    SUSHI.contracts.factory.address,
    SUSHI.contracts.factory.abi,
    signer,
  );

  const [uniswapPair, sushiPair]: Contract[] = await Promise.all([
    uniswapFactory
      .getPair(...sortAddresses(tokenAAddress, tokenBAddress))
      .then(
        (pair: Address) =>
          new Contract(pair, UNISWAP.contracts.pair.abi, signer),
      ),
    sushiFactory
      .getPair(...sortAddresses(tokenAAddress, tokenBAddress))
      .then(
        (pair: Address) => new Contract(pair, SUSHI.contracts.pair.abi, signer),
      ),
  ]);

  const uniswapRouterV2 = new Contract(
    UNISWAP.contracts.routerV2.address,
    UNISWAP.contracts.routerV2.abi,
    signer,
  );
  const sushiRouterV2 = new Contract(
    SUSHI.contracts.routerV2.address,
    SUSHI.contracts.routerV2.abi,
    signer,
  );

  let promise: Promise<typeof RETURN_OK>;
  let resolve!: () => void;
  promise = new Promise((r) => {
    resolve = () => r(RETURN_OK);
  });
  stopPromise = { promise, resolve };

  while (true) {
    console.log('TRADER', 'Listening for events');
    // Wait for any change of state or request to finish
    const result = await Promise.race([
      stopPromise.promise,
      onceToPromise(uniswapPair, uniswapPair.filters.Sync()),
      onceToPromise(sushiPair, sushiPair.filters.Sync()),
    ]);

    if (result === RETURN_OK) {
      console.log('TRADER', 'Requested to stop');
      stopPromise = undefined;
      return RETURN_OK;
    }
    console.log('TRADER', 'Sync happened, calculating trade');

    // In real life, swaps and estimation would be done in a smart-contract to be atomic
    const [startBalance, tokenBInitialBalance]: BigNumber[] = await Promise.all(
      [tokenA.balanceOf(signer.address), tokenB.balanceOf(signer.address)],
    );
    // We're trading only half to avoid bugs and not to lose all of our tokens
    const startingTradeAmount = startBalance.div(2);
    const [, amountBackUniswap]: BigNumber[] =
      await uniswapRouterV2.getAmountsOut(startingTradeAmount, [
        tokenAAddress,
        tokenBAddress,
      ]);
    const [, amountBackSushi]: BigNumber[] = await sushiRouterV2.getAmountsOut(
      amountBackUniswap,
      [tokenBAddress, tokenAAddress],
    );
    console.log(
      'TRADER',
      `Expected amount gained ${amountBackSushi.toString()}${
        tokenAData.symbol
      }`,
    );
    // Example strategy
    if (amountBackSushi.sub(startingTradeAmount).gt(0)) {
      console.log('TRADER', 'Can earn tokens, executing trade');
      // Swap 1
      await (
        await tokenA.approve(uniswapRouterV2.address, startingTradeAmount)
      ).wait();
      await (
        await uniswapRouterV2.swapExactTokensForTokens(
          startingTradeAmount,
          1,
          [tokenAAddress, tokenBAddress],
          signer.address,
          timestamp() + 300,
        )
      ).wait();
      // Swap 2
      const tokenBBalance: BigNumber = await tokenB.balanceOf(signer.address);
      const tradeableAmount = tokenBBalance.sub(tokenBInitialBalance);
      await (
        await tokenB.approve(sushiRouterV2.address, tradeableAmount)
      ).wait();
      await (
        await sushiRouterV2.swapExactTokensForTokens(
          tradeableAmount,
          1,
          [tokenBAddress, tokenAAddress],
          signer.address,
          timestamp() + 300,
        )
      ).wait();

      // Success
      const endBalanceA: BigNumber = await tokenA.balanceOf(signer.address);
      const endBalanceB: BigNumber = await tokenB.balanceOf(signer.address);

      await stateMutex.runExclusive(async () => {
        const state: State = ((await wallet.request({
          method: 'snap_manageState',
          params: ['get'],
        })) as State | null) ?? { logs: [] };

        state.logs.push({
          tokenA: {
            name: tokenAData.name,
            difference: endBalanceA.sub(startingTradeAmount).toString(),
          },
          tokenB: {
            name: tokenBData.name,
            difference: endBalanceB.sub(tokenBInitialBalance).toString(),
          },
          timestamp: timestamp(),
        });

        await wallet.request({
          method: 'snap_manageState',
          params: ['update', state],
        });
      });

      console.log(
        'TRADER',
        `Executed trade, gained ${endBalanceA.sub(startBalance).toString()}${
          tokenAData.symbol
        } tokens`,
      );
    }
  }
}

async function getExecuted() {
  return (
    ((await wallet.request({
      method: 'snap_manageState',
      params: ['get'],
    })) as State | null) ?? { logs: [] }
  ).logs;
}

async function stop() {
  if (stopPromise === undefined) {
    return RETURN_FAIL;
  }
  stopPromise.resolve();
  return RETURN_OK;
}

wallet.registerRpcMessageHandler(async (_originString, requestObject) => {
  switch (requestObject.method) {
    case 'execute':
      if (stopPromise !== undefined) {
        return RETURN_FAIL;
      }
      return await execute(
        requestObject.tokenA as Address,
        requestObject.tokenB as Address,
      );
    case 'stop':
      return await stop();
    case 'get_executed':
      return await getExecuted();
    default:
      throw new Error('Method not found.');
  }
});
