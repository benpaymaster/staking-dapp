# Polkadot Staking Dashboard DApp

**One-line description:** A comprehensive dashboard for analyzing staking performance, validator rewards, and nominator activity on the Polkadot network.

---

## 📖 Overview

The Polkadot Staking Dashboard connects to live Polkadot nodes, fetches validator and nominator data, computes APY (annualized staking returns), and provides actionable insights into multi-era staking performance.  
This project demonstrates full-stack Web3 development, integrating the Polkadot JS API with TypeScript and React.

**Tech Stack:** React 18, TypeScript, Vite, @polkadot/api, Node.js v22+  
**Role:** Lead Developer – architecture, SDK development, frontend integration, multi-era analysis.

---

## 🏗 Project Structure

```
staking-dapp/
├── frontend/            
│   ├── src/             
│   │   └── App.tsx
│   └── sdk/             
│       └── src/validators.ts
│   └── testValidators.ts # CLI testing script
├── package.json
└── README.md
```

---

## 🚀 Key Features

**Base Functionality**
- Connects to Polkadot via WebSockets (`@polkadot/api`)
- Fetches active validators and computes APY, commission, own stake
- Displays **Top 10 validators by APY** in CLI and frontend

**Advanced Features**
- Multi-era analysis: Track nominator activity over multiple eras
- Validator performance insights: Identify active vs inactive per era
- Reward calculation: Computes individual nominator rewards factoring in validator commission
- Nominator status: Displays bonded amount, selected validators, and reward eligibility
- CLI + Frontend integration: Summarizes validator and nominator data

---

## ⚠️ Challenges & Solutions

| Challenge                | Solution                                                                    |
|---------------------------|-----------------------------------------------------------------------------|
| Module import errors      | Used explicit `.ts` paths and ensured interface consistency               |
| Deprecated API queries    | Updated queries to current APIs (`erasValidatorReward`, `erasStakers`)  |
| Multi-era handling        | Created structured interfaces (`ValidatorData`, `NominatorEraActivity`)|
| Node warnings             | Used `npx ts-node --esm` and ignored harmless deprecation warnings        |
| Lack of DOT for testing   | Fetched historical era data for reward computation                        |

---

## 💻 Installation & Usage

```bash
# Clone repository
git clone <your-repo-url>
cd staking-dapp/frontend

# Install dependencies
npm install
```

**Run SDK (CLI Test)**

```bash
npx ts-node testValidators.ts
```

**Run Frontend**

```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## 🖼 Example Output

```
📌 Last Non-Zero Era: 1918
🔍 Found 600 validators
🏆 Top Validators by APY:
Validator: 12abc...XYZ
  APY: 15.23%
  Commission: 3%
  Own Stake: 1,000,000,000,000
  Total Stake: 50,000,000,000,000
  Reward After Commission: 12,000,000,000

Era 1916:
Validator Activity:
  12abc...XYZ: Active
  34def...PQR: Inactive
Total Nominator Rewards: 12,345,678
```

---

## 📈 Next Steps

- Improve frontend UI with charts and filters
- Add wallet integration (Polkadot.js, Ledger, WalletConnect)
- Support Kusama and parachain staking
- Detect and correct nominators in incorrect staking bags

---

## 📝 Author

Adegbenga Ogungbeje