import { ethers } from 'ethers';
export type Address = string;

export const RETURN_OK = 'Ok';
export const RETURN_FAIL = 'Fail';

// https://github.com/Uniswap/v2-periphery/blob/2efa12e0f2d808d9b49737927f0e416fafa5af68/contracts/libraries/UniswapV2Library.sol#L18
function pairForBase(
  factory: Address,
  tokenA: Address,
  tokenB: Address,
  pairCodeHash: ethers.utils.BytesLike,
): Address {
  return ethers.utils.getCreate2Address(
    factory,
    ethers.utils.keccak256(
      ethers.utils.solidityPack(['address', 'address'], [tokenA, tokenB]),
    ),
    pairCodeHash,
  );
}
const COMMON = {
  contracts: {
    routerV2: {
      abi: [
        'function getAmountsOut(uint amountIn, address[] memory path) internal view returns (uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      ],
    },
    pair: {
      abi: ['event Sync(uint112 reserve0, uint112 reserve1)'],
    },
  },
};

export const UNISWAP = {
  contracts: {
    routerV2: {
      address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      abi: COMMON.contracts.routerV2.abi,
    },
    pair: {
      abi: COMMON.contracts.pair.abi,
    },
  },
  pairFor: (tokenA: Address, tokenB: Address) =>
    pairForBase(
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      tokenA,
      tokenB,
      '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
    ),
};

// WARNING: The addresses are for rinkeby network, they differ on Sushi
export const SUSHI = {
  contracts: {
    routerV2: {
      address: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      abi: COMMON.contracts.routerV2.abi,
    },
    pair: {
      abi: COMMON.contracts.pair.abi,
    },
  },
  pairFor: (tokenA: Address, tokenB: Address) =>
    pairForBase(
      '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      tokenA,
      tokenB,
      '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303',
    ),
};

export const ERC20 = {
  abi: [
    'function name() public view returns (string)',
    'function symbol() public view returns (string)',
    'function decimals() public view returns (uint8)',
    'function totalSupply() public view returns (uint256)',
    'function balanceOf(address _owner) public view returns (uint256 balance)',
    'function transfer(address _to, uint256 _value) public returns (bool success)',
    'function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)',
    'function approve(address _spender, uint256 _value) public returns (bool success)',
    'function allowance(address _owner, address _spender) public view returns (uint256 remaining)',
    'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
    'event Approval(address indexed _owner, address indexed _spender, uint256 _value)',
  ],
};
