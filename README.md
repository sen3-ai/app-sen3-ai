# Sen3AI - Blockchain Risk Assessment API

A TypeScript-based API service that provides comprehensive risk assessment for blockchain addresses across multiple networks including Ethereum, Polygon, BSC, Arbitrum, Optimism, and Solana.

## Features

- **Multi-Blockchain Support**: EVM-compatible chains (Ethereum, Polygon, BSC, Arbitrum, Optimism) and Solana
- **Configurable Data Providers**: Blockchain, reputation, social media, and on-chain analysis providers
- **Flexible Risk Processors**: Multiple risk assessment algorithms with weighted merging
- **Environment-Based Configuration**: Secure credential management via environment variables
- **Comprehensive Testing**: Jest-based test suite with full coverage
- **TypeScript**: Full type safety and modern development experience

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sen3ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your API keys and configuration
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Configuration

### Environment Variables (.env)

Create a `.env` file based on `env.example` with your API credentials:

```bash
# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development
LOG_LEVEL=info

# API Credentials
BLOCKCHAIN_API_KEY=your_blockchain_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
SOLSCAN_API_KEY=your_solscan_api_key_here
REPUTATION_API_KEY=your_reputation_api_key_here
SOCIAL_API_KEY=your_social_api_key_here
ONCHAIN_API_KEY=your_onchain_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sen3ai
DB_USERNAME=postgres
DB_PASSWORD=your_database_password_here
```

### Configuration File (config/config.json)

The application uses a JSON configuration file for non-sensitive settings:

```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "cors": {
      "origin": ["http://localhost:3000", "http://localhost:3001"],
      "credentials": false
    }
  },
  "blockchains": [
    {
      "name": "ethereum",
      "regex": "^0x[0-9a-fA-F]{40}$",
      "enabled": true
    },
    {
      "name": "solana",
      "regex": "^[1-9A-HJ-NP-Za-km-z]{32,44}$",
      "enabled": true
    }
  ],
  "providers": [
    {
      "name": "blockchain",
      "enabled": true,
      "priority": 1,
      "timeout": 5000,
      "retries": 3
    }
  ],
  "processors": [
    {
      "name": "comprehensive",
      "enabled": true,
      "weight": 1.0
    }
  ]
}
```

## API Endpoints

### Risk Assessment

**GET** `/risk/:address`

Assess the risk of a blockchain address.

**Parameters:**
- `address` (string, required): The blockchain address to assess

**Response:**
```json
{
  "result": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "addressType": "evm",
    "riskScore": 45,
    "description": "EVM address. Risk factors: High transaction volume, Multiple contract interactions. Final risk score: 45/100.",
    "confidence": 0.85,
    "explanations": [
      "High transaction volume detected",
      "Multiple contract interactions found"
    ],
    "processorCount": 1,
    "processorAssessments": [...],
    "providerData": {...},
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Health Check

**GET** `/health`

Check the health status of the API.

**Response:**
```json
{
  "result": true,
  "data": {
    "status": "healthy",
    "environment": "development",
    "providers": ["blockchain", "reputation", "social", "onchain"],
    "processors": ["comprehensive"],
    "blockchains": ["ethereum", "polygon", "bsc", "solana"],
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Configuration (Development Only)

**GET** `/config`

View current configuration (disabled in production).

## Supported Blockchains

| Blockchain | Address Format | Regex Pattern |
|------------|----------------|---------------|
| Ethereum | `0x...` (40 hex chars) | `^0x[0-9a-fA-F]{40}$` |
| Polygon | `0x...` (40 hex chars) | `^0x[0-9a-fA-F]{40}$` |
| BSC | `0x...` (40 hex chars) | `^0x[0-9a-fA-F]{40}$` |
| Arbitrum | `0x...` (40 hex chars) | `^0x[0-9a-fA-F]{40}$` |
| Optimism | `0x...` (40 hex chars) | `^0x[0-9a-fA-F]{40}$` |
| Solana | Base58 (32-44 chars) | `^[1-9A-HJ-NP-Za-km-z]{32,44}$` |

## Data Providers

### Blockchain Provider
- **Purpose**: Collects basic blockchain data (balance, transactions, contract interactions)
- **Data**: Balance, transaction count, last activity, contract interactions
- **APIs**: Etherscan, Polygonscan, BSCScan, Solscan

### Reputation Provider
- **Purpose**: Assesses address reputation and trust scores
- **Data**: Reputation score, risk level, flagged incidents, blacklist status
- **APIs**: Various reputation and blacklist services

### Social Provider
- **Purpose**: Analyzes social media presence and sentiment
- **Data**: Social presence, followers, mentions, sentiment, verified accounts
- **APIs**: Twitter, Telegram, Discord, GitHub APIs

### On-chain Provider
- **Purpose**: Deep on-chain analysis (DeFi protocols, NFTs, smart contracts)
- **Data**: DeFi protocols, NFT holdings, token holdings, smart contract interactions
- **APIs**: Various DeFi and NFT analytics services

## Risk Processors

### Comprehensive Risk Processor
- **Purpose**: Primary risk assessment algorithm
- **Features**: Multi-factor analysis, weighted scoring, detailed explanations
- **Factors**: Transaction patterns, reputation scores, social signals, on-chain behavior

## Development

### Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Linting
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Project Structure

```
sen3ai/
├── src/
│   ├── config/           # Configuration management
│   ├── providers/        # Data collection providers
│   ├── processors/       # Risk assessment processors
│   └── index.ts         # Main application entry point
├── config/
│   └── config.json      # Application configuration
├── tests/               # Test files
├── env.example          # Environment variables template
└── package.json
```

### Adding New Providers

1. Create a new provider class extending `BaseProvider`:
```typescript
import { BaseProvider } from './Provider';
import { Config } from '../config/Config';

export class CustomProvider extends BaseProvider {
  private config = Config.getInstance();

  getName(): string {
    return 'custom';
  }

  async fetch(address: string): Promise<any> {
    return this.safeFetch(async () => {
      // Your data collection logic here
      return {
        // Your data
      };
    });
  }
}
```

2. Add the provider to the configuration:
```json
{
  "providers": [
    {
      "name": "custom",
      "enabled": true,
      "priority": 5,
      "timeout": 5000,
      "retries": 3
    }
  ]
}
```

3. Register the provider in `src/index.ts`:
```typescript
case 'custom':
  dataCollector.addProvider(new CustomProvider());
  break;
```

### Adding New Processors

1. Create a new processor class extending `BaseResponseProcessor`:
```typescript
import { BaseResponseProcessor } from './BaseResponseProcessor';

export class CustomProcessor extends BaseResponseProcessor {
  getName(): string {
    return 'custom';
  }

  async processData(address: string, addressType: string, collectedData: any): Promise<any> {
    // Your risk assessment logic here
    return {
      score: 50,
      confidence: 0.8,
      explanations: ['Custom analysis completed']
    };
  }
}
```

2. Add the processor to the configuration:
```json
{
  "processors": [
    {
      "name": "custom",
      "enabled": true,
      "weight": 0.7
    }
  ]
}
```

3. Register the processor in `src/index.ts`:
```typescript
case 'custom':
  processorManager.addProcessor(new CustomProcessor());
  break;
```

## Security

- **Environment Variables**: All sensitive data (API keys, passwords) are stored in environment variables
- **Configuration Validation**: All configuration is validated on startup
- **Error Handling**: Comprehensive error handling prevents information leakage
- **CORS**: Configurable CORS settings for production deployment

## Testing

The project includes comprehensive tests covering:
- Address validation
- Provider data collection
- Risk assessment algorithms
- Configuration loading
- Error handling

Run tests with:
```bash
npm test
```

## Deployment

### Production Setup

1. Set environment variables:
```bash
NODE_ENV=production
PORT=3000
# Add all required API keys
```

2. Build the application:
```bash
npm run build
```

3. Start the production server:
```bash
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

[Add your license here]

## Support

For support and questions, please [create an issue](link-to-issues) or contact [your-email]. 