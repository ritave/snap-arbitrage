import { BigNumber } from 'ethers';
import { Address } from './constants';

export function onceToPromise<
  Event,
  T extends { once: (event: Event, listener: (result: any) => void) => void },
>(emitter: T, event: Event) {
  return new Promise((resolve) => emitter.once(event, resolve));
}

export function sortAddresses(
  tokenAAddress: Address,
  tokenBAddress: Address,
): [Address, Address] {
  if (BigNumber.from(tokenAAddress).lt(tokenBAddress)) {
    return [tokenAAddress, tokenBAddress];
  }
  return [tokenBAddress, tokenAAddress];
}
