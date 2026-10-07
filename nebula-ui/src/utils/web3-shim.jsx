/**
 * web3-shim.jsx  —  UI-ONLY MOCK REPLACEMENTS for wagmi / viem / @rainbow-me/rainbowkit
 *
 * ⚠️ This file was generated when the Nebula Labs UI was extracted from the full
 * dApp. Every wallet/chain dependency (wagmi, viem, rainbowkit) was removed so the
 * project runs as a pure frontend. All functions below are NO-OP / MOCK versions
 * that keep the interface identical to the real libraries but perform no on-chain
 * work. Wire this file up to your own web3 stack (or delete it) when you integrate
 * real functionality into your new project.
 */
/* eslint-disable react-refresh/only-export-components */

/* ------------------------------------------------------------------ */
/* viem replacements                                                   */
/* ------------------------------------------------------------------ */

/** Decimal-aware division of a bigint by 10^decimals -> string (mirrors viem formatUnits). */
export const formatUnits = (value, decimals = 18) => {
  try {
    const v = BigInt(value ?? 0);
    const d = Number(decimals ?? 0);
    const base = 10n ** BigInt(d);
    const whole = v / base;
    const frac = (v % base < 0n ? -v % base : v % base).toString().padStart(d, '0');
    return d > 0 ? `${whole}.${frac}` : whole.toString();
  } catch {
    return '0';
  }
};

/** Decimal-aware multiplication of a decimal string -> bigint (mirrors viem parseUnits). */
export const parseUnits = (value, decimals = 18) => {
  try {
    const d = Number(decimals ?? 0);
    const [intPart, fracPart = ''] = String(value ?? '0').split('.');
    const padded = (fracPart + '0'.repeat(d)).slice(0, d);
    return BigInt((intPart || '0') + padded);
  } catch {
    return 0n;
  }
};

export const maxUint256 =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

/** Naive EVM address check (same shape as viem isAddress). */
export const isAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(String(value ?? ''));

/** Ether version of parseUnits (mirrors viem parseEther). */
export const parseEther = (value) => parseUnits(value, 18);

/** No-op transport factory (mirrors viem http). */
export const http = (_url) => () => ({});

/** No-op fallback transport combiner (mirrors viem fallback). */
export const fallback = (transports) => transports?.[0] ?? (() => ({}));

const MOCK_CHAIN_KEYS = ['id', 'name', 'nativeCurrency', 'rpcUrls', 'blockExplorers', 'test', 'iconUrl'];
const makeMockChain = (id, name, symbol) => {
  const chain = {
    id,
    name,
    nativeCurrency: { name, symbol, decimals: 18 },
    rpcUrls: { default: { http: [`https://mock-rpc.local/${name.toLowerCase()}`] } },
    blockExplorers: { default: { name: 'Explorer', url: 'https://etherscan.io' } },
    test: false,
  };
  return new Proxy(chain, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && MOCK_CHAIN_KEYS.includes(prop)) return undefined;
      // Unknown property -> treat as another mock chain object (keeps destructuring safe)
      return makeMockChain(0, 'Unknown', 'ETH');
    },
  });
};

/** Mock chain descriptors replacing `viem/chains` exports. */
export const mainnet   = makeMockChain(1, 'Ethereum', 'ETH');
export const polygon   = makeMockChain(137, 'Polygon', 'MATIC');
export const bsc       = makeMockChain(56, 'BNB Chain', 'BNB');
export const arbitrum  = makeMockChain(42161, 'Arbitrum', 'ETH');
export const optimism  = makeMockChain(10, 'Optimism', 'ETH');
export const base      = makeMockChain(8453, 'Base', 'ETH');
export const avalanche = makeMockChain(43114, 'Avalanche', 'AVAX');
export const fantom    = makeMockChain(250, 'Fantom', 'FTM');
export const gnosis    = makeMockChain(100, 'Gnosis', 'xDAI');

/** Mock public client factory (mirrors viem createPublicClient). */
export const createPublicClient = ({ chain } = {}) => ({
  chain,
  async getBalance() { return 0n; },
  async readContract() { return 0n; },
  async getGasPrice() { return 1000000000n; },
  async getTransactionCount() { return 0; },
  async call() { return '0x'; },
  async getTransactionReceipt() { return null; },
});

/* ------------------------------------------------------------------ */
/* wagmi hook replacements                                             */
/* ------------------------------------------------------------------ */

const DEMO_ADDRESS = '0x000000000000000000000000000000000000dEaD';

export const useAccount = () => ({
  address: undefined,
  isConnected: false,
  isConnecting: false,
  connector: undefined,
  chain: null,
});

export const useConnect = () => ({
  connect: (_opts) => Promise.resolve(),
  connectAsync: async () => {
    throw new Error('UI-only build: wallet connections are disabled (see src/utils/web3-shim.jsx)');
  },
  connectors: [],
  isConnected: false,
  isPending: false,
});

export const useDisconnect = () => ({
  disconnect: () => {},
  disconnectAsync: async () => {},
});

export const useSwitchChain = () => ({
  switchChain: (_opts) => {},
  switchChainAsync: async () => {
    throw new Error('UI-only build: chain switching is disabled (see src/utils/web3-shim.jsx)');
  },
});

export const useChainId = () => 1;

export const useSendTransaction = () => ({
  sendTransaction: (_opts) => {},
  sendTransactionAsync: async () => {
    throw new Error('UI-only build: transactions are disabled (see src/utils/web3-shim.jsx)');
  },
  data: undefined,
  hash: undefined,
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  reset: () => {},
});

export const useWaitForTransactionReceipt = (_params) => ({
  data: undefined,
  isLoading: false,
  isSuccess: false,
  isError: false,
});

export const useConfig = () => ({
  chains: [],
  connectors: [],
  getConnector: () => undefined,
});

export const usePublicClient = () => undefined;

export const useBalance = (_params) => ({
  data: undefined,
  isLoading: false,
  isError: false,
});

export const useReadContract = (_params) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: () => Promise.resolve(),
});

export const useWriteContract = () => ({
  writeContract: (_opts) => {},
  writeContractAsync: async () => {
    throw new Error('UI-only build: contract writes are disabled (see src/utils/web3-shim.jsx)');
  },
  data: undefined,
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  reset: () => {},
});

/* ------------------------------------------------------------------ */
/* @rainbow-me/rainbowkit replacements                                 */
/* ------------------------------------------------------------------ */

export const useConnectModal = () => ({
  openConnectModal: () => {
    console.warn('[UI-only] openConnectModal called – wallet modal removed. See src/utils/web3-shim.jsx');
  },
});

export const ConnectButton = ({ label = 'Connect Wallet', ...props }) => (
  <button
    type="button"
    onClick={() =>
      console.warn('[UI-only] ConnectButton clicked – wallet connection removed. See src/utils/web3-shim.jsx')
    }
    style={{
      padding: '10px 18px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 107, 53, 0.4)',
      background: 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,107,53,0.05))',
      color: '#fff',
      fontWeight: 600,
      fontSize: '0.875rem',
      cursor: 'pointer',
      fontFamily: 'inherit',
      ...props.style,
    }}
  >
    {label}
  </button>
);

/* ------------------------------------------------------------------ */
/* @wagmi/core replacements                                            */
/* ------------------------------------------------------------------ */

export const simulateContract = async (_config, _request) => {
  throw new Error('UI-only build: simulateContract is disabled (see src/utils/web3-shim.jsx)');
};

export const fetchBalance = async (_params) => ({
  formatted: '0',
  value: 0n,
});

/* ------------------------------------------------------------------ */
/* wagmi config replacement (used by hooks/services as a pass-through) */
/* ------------------------------------------------------------------ */

export const config = {
  chains: [],
  connectors: [],
  transports: {},
};

/* ------------------------------------------------------------------ */
/* React context providers (UI-only pass-throughs)                     */
/* ------------------------------------------------------------------ */

export const WagmiProvider = ({ children }) => children;

export const RainbowKitProvider = ({ children }) => children;

export const darkTheme = (_opts) => ({ variables: {} });

/** Mock createConfig (mirrors wagmi createConfig). */
export const createConfig = (cfg) => ({
  chains: cfg?.chains ?? [],
  connectors: cfg?.connectors ?? [],
  transports: cfg?.transports ?? {},
});

/** Mock connector factories (mirrors wagmi/connectors). */
export const injected = () => ({ id: 'injected', name: 'Mock Injected' });
export const coinbaseWallet = (_opts) => ({ id: 'coinbase', name: 'Mock Coinbase Wallet' });
export const walletConnect = (_opts) => ({ id: 'walletConnect', name: 'Mock WalletConnect' });
