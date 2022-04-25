export type Address = string;

export const RETURN_OK = 'Ok';
export const RETURN_FAIL = 'Fail';

const COMMON = {
  contracts: {
    routerV2: {
      abi: [
        'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      ],
    },
    factory: {
      abi: [
        'function getPair(address tokenA, address tokenB) external view returns (address pair)',
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
    factory: {
      address: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      abi: COMMON.contracts.factory.abi,
    },
    pair: {
      abi: COMMON.contracts.pair.abi,
    },
  },
};

// WARNING: The addresses are for rinkeby network, they differ on Sushi
export const SUSHI = {
  contracts: {
    routerV2: {
      address: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      abi: COMMON.contracts.routerV2.abi,
    },
    factory: {
      address: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      abi: COMMON.contracts.factory.abi,
    },
    pair: {
      abi: COMMON.contracts.pair.abi,
    },
  },
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
