# Polkadot Staking Dashboard DApp

A staking analytics dashboard for the Polkadot network.  
Connects to a live Polkadot node, fetches validator and nominator data, computes APY (annualized staking returns), and provides insights into multi-era staking performance.

---

## 📦 Project Structure

```
staking-dapp/
├── frontend/             # React frontend and test scripts
│   ├── src/             # React source code
│   │   └── App.tsx
│   └── sdk/             # Backend SDK to fetch data from Polkadot
│       └── src/validators.ts
│   └── testValidators.ts # CLI script to test SDK functionality
├── package.json
└── README.md
```

---

## 🚀 Features

### Part 1 – Base Functionality

- Connects to Polkadot via WebSockets (`@polkadot/api`)
- Fetches all active validators in the current era
- Computes validator rewards, commission, own stake, and APY
- Displays **Top 10 validators by APY** in CLI and frontend

### Part 2 – Add-ons

- Multi-era analysis: Check nominator activity across multiple eras
- Validator performance insights: Identify active vs inactive validators per era
- Reward calculation: Computes individual nominator rewards factoring in validator commission
- Nominator status: Shows bonded amount, selected validators, and reward eligibility
- Staking bag insights: Identify nominators in wrong bags or not earning rewards
- CLI and Frontend integration: Displays summary of validator and nominator data

---

## ⚠️ Problems Encountered

| Problem                | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| Module import errors   | TypeScript/ESM could not locate validators.ts or specific exported interfaces. |
| Deprecated API queries | Some Polkadot API calls like `erasReward` were removed or replaced.         |
| Multi-era handling     | Iterating eras and handling optional types (Option) required careful BN arithmetic. |
| Syntax errors          | Import/export mismatches caused SyntaxError or Cannot find module.           |
| Node warnings          | `--experimental-loader` and `fs.Stats` deprecation occurred with Node v22+. |
| Lack of DOT            | Testing rewards without DOT holdings required fetching historical era data.  |

---

## 💡 Solutions Implemented

| Problem                | Solution                                                                    |
|------------------------|-----------------------------------------------------------------------------|
| Module import errors   | Used exact file paths with `.ts` extension and ensured exported interfaces match imports. |
| Deprecated API queries | Updated queries (`erasValidatorReward`, `erasStakers`, etc.) and handled all BN arithmetic correctly. |
| Multi-era handling     | Created structured interfaces (`ValidatorData`, `NominatorEraActivity`) and iterated eras safely. |
| Syntax errors          | Maintained correct TypeScript syntax and fixed import/export mismatches.     |
| Node warnings          | Ignored harmless warnings or used `npx ts-node --esm` for ES module compatibility. |
| Lack of DOT            | Fetched historical era data for reward calculation rather than using live staking. |

---

## 🔧 Installation & Usage

```bash
# Clone repository
git clone <your-repo-url>
cd staking-dapp/frontend

# Install dependencies
npm install
```

---

## ▶️ Running the SDK (Backend)

Test validators and nominator analysis:
```bash
npx ts-node testValidators.ts
```

---

## 🖥️ Example Output

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

## 💻 Running the Frontend

```bash
npm run dev
```

Visit 👉 [http://localhost:3000](http://localhost:3000)

---

## 📊 Tech Stack

- React 18 + TypeScript
- Vite (frontend bundler)
- @polkadot/api (Polkadot JS SDK)
- Node.js v22+

---

## 🚀 Next Steps

- Improve frontend UI with charts and filtering
- Validator search and sorting features
- Wallet integration (Polkadot.js, Ledger, WalletConnect)
- Support for Kusama / parachains
- Detect and correct nominators in wrong staking bags

---

## 📝 Author

Adegbenga Ogungbeje  
