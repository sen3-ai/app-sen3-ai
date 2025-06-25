import fetch from 'node-fetch';
import { Config } from '../config/Config';

export interface ChainConfig {
  name: string;
  chainId: number;
}

const SUPPORTED_CHAINS: ChainConfig[] = [
  { name: 'ethereum', chainId: 1 },
  { name: 'polygon', chainId: 137 },
  { name: 'bsc', chainId: 56 },
  { name: 'arbitrum', chainId: 42161 },
  { name: 'optimism', chainId: 10 },
  { name: 'avalanche', chainId: 43114 },
  { name: 'fantom', chainId: 250 },
  { name: 'gnosis', chainId: 100 }
];

export class ContractVerifier {
  private config = Config.getInstance();
  private readonly baseUrl = 'https://api.etherscan.io/v2/api';
  private readonly apiKey: string;

  constructor() {
    const credentials = this.config.getCredentials();
    this.apiKey = credentials.etherscanApiKey || '';
  }

  /**
   * Detects the EVM chain based on address format and available config
   * For now, defaults to Ethereum Mainnet (chainId 1)
   * You can enhance this to detect chain by address prefix or user input
   */
  private detectChain(address: string): ChainConfig {
    // TODO: Enhance detection if needed
    return SUPPORTED_CHAINS[0]; // Default to Ethereum
  }

  /**
   * Checks if an address is a smart contract on the specified chain
   */
  async isContractAddress(address: string, chainName?: string): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error('No Etherscan API key configured. Please set ETHERSCAN_API_KEY in your environment.');
    }

    let chain: ChainConfig;
    if (chainName) {
      chain = SUPPORTED_CHAINS.find(c => c.name === chainName) || SUPPORTED_CHAINS[0];
    } else {
      chain = this.detectChain(address);
    }

    try {
      const url = `${this.baseUrl}?chainid=${chain.chainId}&module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`API error: ${data.error.message || 'Unknown error'}`);
      }

      const code = data.result;
      return code && code !== '0x' && code !== '0x0';
    } catch (error) {
      console.error(`Error checking contract status for ${address}:`, error);
      throw new Error(`Failed to verify contract address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates that an address is a smart contract, throws error if not
   */
  async validateContractAddress(address: string, chainName?: string): Promise<void> {
    const isContract = await this.isContractAddress(address, chainName);
    if (!isContract) {
      throw new Error(`Address ${address} is not a smart contract. Only smart contract addresses are supported.`);
    }
  }

  /**
   * Gets available chains for verification
   */
  getAvailableChains(): string[] {
    return SUPPORTED_CHAINS.map(c => c.name);
  }

  /**
   * Checks if the Etherscan API key is configured
   */
  hasApiKeys(): boolean {
    return !!this.apiKey;
  }
} 