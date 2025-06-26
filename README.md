# Sen3AI - Blockchain Risk Assessment Platform

A comprehensive blockchain risk assessment platform that analyzes smart contracts and addresses across multiple blockchains using various data providers.

## Features

- **Multi-Chain Support**: Ethereum, BSC, Base, Solana, and more
- **Real-Time Data**: Integrates with DexScreener, Coingecko, AMLBot, and Bubblemap
- **Risk Assessment**: Comprehensive risk scoring with detailed explanations
- **Web Interface**: Modern, responsive web UI for easy interaction
- **Cross-Chain Search**: Find contracts across multiple blockchains

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure your API keys:
```bash
cp .env.example .env
```

Required API keys:
- `BUBBLEMAP_API_KEY` - For Bubblemap data
- `AMLBOT_TM_ID` and `AMLBOT_ACCESS_KEY` - For AMLBot risk assessment

### 3. Start the Server
```bash
npm run dev
# or
ts-node src/index.ts
```

### 4. Access the Web Interface
Open your browser and navigate to: `http://localhost:3000`

## Web Interface Usage

1. **Search for Contracts**: Enter a contract address in the search box
2. **Autocomplete**: Select from the dropdown of found contracts
3. **Risk Assessment**: View detailed risk analysis and explanations
4. **Cross-Chain**: Search across multiple blockchains simultaneously

### Example Usage
1. Enter: `0xcda4e840411c00a614ad9205caec807c7458a0e3`
2. Select "PureFi Token (UFI)" from the dropdown
3. View risk assessment results

## API Endpoints

### Risk Assessment
```
GET /risk/:chain/:address
```
Returns comprehensive risk assessment for a specific address on a blockchain.

**Example:**
```bash
curl "http://localhost:3000/risk/ethereum/0xcda4e840411c00a614ad9205caec807c7458a0e3"
```

### Cross-Chain Search
```
GET /search/:address
```
Searches for a contract across multiple blockchains.

**Example:**
```bash
curl "http://localhost:3000/search/0xcda4e840411c00a614ad9205caec807c7458a0e3"
```

### Health Check
```
GET /health
```
Returns system status and available providers.

## Data Providers

- **DexScreener**: Trading pair and liquidity data
- **Coingecko**: Market data and token information
- **AMLBot**: Risk assessment and compliance data
- **Bubblemap**: Holder distribution and decentralization metrics

## Configuration

Edit `config/config.json` to:
- Enable/disable providers
- Configure supported blockchains
- Set timeouts and retry limits

## Development

### Project Structure
```
src/
├── config/          # Configuration management
├── providers/       # Data provider implementations
├── processors/      # Risk assessment processors
└── index.ts        # Main application entry point

public/
└── index.html      # Web interface

tests/              # Test files
```

### Running Tests
```bash
npm test
```

### Building
```bash
npm run build
```

## License

MIT License - see LICENSE file for details.