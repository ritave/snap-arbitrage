import { BigNumber } from 'ethers';
import { Address } from './constants';

export function onceToPromise<
  Event,
  T extends { once: (event: Event, listener: (result: any) => void) => void },
>(emitter: T, event: Event) {
  return new Promise((resolve) => emitter.once(event, resolve));
}

export function sortTokens(
  tokenA: Address,
  tokenB: Address,
): [Address, Address] {
  if (BigNumber.from(tokenA).lt(tokenB)) {
    return [tokenA, tokenB];
  }
  return [tokenB, tokenA];
}
