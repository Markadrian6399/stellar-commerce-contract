# StellarCommerce SDK

A non-custodial, escrow-based payment toolkit for merchants (groceries, retail, digital goods) to accept USDC payments via Soroban smart contracts on the Stellar network.

---

## Why StellarCommerce?

Crypto payments for physical goods have a trust gap: buyers fear non-delivery, merchants fear chargebacks. StellarCommerce solves this with an on-chain escrow:

1. Buyer locks USDC in the contract.
2. Merchant ships the order.
3. Buyer confirms delivery → funds released to merchant.
4. No delivery? Buyer calls refund before the timeout.
5. Timeout reached with no action? Anyone can trigger auto-release.

No intermediary holds the funds. The contract is the escrow.

---

## Repository Structure

```
stellar-commerce-sdk/
├── Cargo.toml                  # Soroban workspace
├── contracts/
│   └── escrow/
│       ├── Cargo.toml
│       └── src/lib.rs          # Core escrow contract (Rust)
├── sdk/
│   ├── package.json
│   └── src/index.ts            # TypeScript SDK
├── cli/
│   ├── package.json
│   └── src/index.ts            # `sc` CLI tool
├── db/
│   └── schema.sql              # PostgreSQL schema
└── docs/
```

---

## Setup on Linux (Debian/Ubuntu)

### 1. Install Rust + wasm target

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
```

### 2. Install Soroban CLI

```bash
cargo install --locked soroban-cli --features opt
```

Verify:

```bash
soroban --version
```

### 3. Install Node.js (v20+)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 4. Clone and build

```bash
git clone https://github.com/your-org/stellar-commerce-sdk.git
cd stellar-commerce-sdk

# Build the Soroban contract
cargo build --release --target wasm32-unknown-unknown

# Optimise the WASM
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/escrow.wasm

# Install SDK + CLI deps
cd sdk && npm install && npm run build && cd ..
cd cli && npm install && npm run build && cd ..
```

### 5. Configure environment

```bash
cp cli/.env.example cli/.env
# Edit cli/.env:
#   CONTRACT_ID=C...
#   NETWORK=testnet
```

### 6. Deploy to Testnet

```bash
# Fund a test account
soroban keys generate merchant --network testnet
soroban keys fund merchant --network testnet

# Deploy
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow.optimized.wasm \
  --source merchant \
  --network testnet

# Initialize (replace addresses)
sc init \
  --merchant G<MERCHANT_ADDRESS> \
  --token C<USDC_CONTRACT_ADDRESS> \
  --secret S<MERCHANT_SECRET>
```

### 7. Set up the database

```bash
sudo apt-get install -y postgresql
sudo -u postgres psql -c "CREATE DATABASE stellarcommerce;"
sudo -u postgres psql -d stellarcommerce -f db/schema.sql
```

---

## CLI Usage

```bash
# Buyer pays into escrow (7-day timeout)
sc pay \
  --buyer G<BUYER> \
  --amount 10000000 \
  --order 1 \
  --timeout 604800 \
  --secret S<BUYER_SECRET>

# Buyer confirms delivery → release to merchant
sc release --caller G<BUYER> --order 1 --secret S<BUYER_SECRET>

# Buyer opens dispute → refund
sc refund --buyer G<BUYER> --order 1 --secret S<BUYER_SECRET>

# Check order status
sc status --order 1
```

---

## Contract Reference

| Function | Auth required | Description |
|---|---|---|
| `initialize(merchant, token)` | merchant | One-time setup |
| `pay_escrow(buyer, amount, order_id, timeout_secs)` | buyer | Lock funds |
| `release_payment(caller, order_id)` | buyer (or permissionless after timeout) | Pay merchant |
| `refund(buyer, order_id)` | buyer | Return funds |
| `get_order(order_id)` | none | Read order state |
| `get_merchant()` | none | Read merchant address |

---

## Drips Wave — Contributor Tasks

This project is part of the **Drips Stellar Wave**. Below are open tasks for contributors:

| Task | Difficulty | Description |
|---|---|---|
| Merchant Dashboard | Medium | React/Next.js UI showing order history, ratings, and revenue pulled from the PostgreSQL schema |
| x402 Protocol Support | Hard | Implement HTTP 402 payment-required flow so any web request can trigger a pay_escrow call automatically |
| Multi-token Support | Medium | Extend the contract to accept a whitelist of tokens (XLM, EURC, etc.) instead of a single token |
| Arbitrator Role | Medium | Add an admin/DAO address that can resolve disputes and split funds |
| Soroban Events Indexer | Medium | Node.js service that listens to contract events and syncs order status to PostgreSQL |
| Mobile SDK | Hard | React Native wrapper around the TypeScript SDK for in-app checkout |
| Merchant Onboarding CLI | Easy | `sc register` command that deploys + initializes a contract in one step |
| IPFS Order Receipts | Medium | Store order metadata (items, quantities) on IPFS and anchor the CID in the contract |

---

## Security Notes

- The contract uses `require_auth()` on all state-changing calls — no spoofed callers.
- Storage TTLs are set explicitly to prevent ledger entry expiry from locking funds.
- The auto-release timeout is set by the buyer at payment time, giving them control over the window.
- This contract has not been audited. Do not use on mainnet without a professional audit.

---

## License

MIT
