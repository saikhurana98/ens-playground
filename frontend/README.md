# ENS Playground - React + TypeScript app (Vite)

Search for ENS names and view blockchain data including profile information and recent transactions.

## Setup

1. **Install dependencies:**
   ```bash
   yarn
   ```

2. **Configure Etherscan API Key (Required for transaction history):**
   - Get a free API key from [Etherscan](https://etherscan.io/myapikey)
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your API key:
     ```
     VITE_ETHERSCAN_API_KEY=your_actual_api_key_here
     ```

## How to Run

- **Dev server:** `yarn dev`
- **Build:** `yarn build`
- **Preview build:** `yarn preview`
- **Deploy to GitHub Pages:** `yarn deploy`

## Features

- ENS name resolution
- Profile card with avatar, name, description, and URL
- Recent transaction history (last 10 transactions)
- Comprehensive blockchain data logging

