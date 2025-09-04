# Polkadot Staking Dashboard DApp

This project is a staking analytics dashboard for the Polkadot network.  
It connects to a live Polkadot node, fetches validator data, and computes APY (annualized staking returns) for active validators.  

---

## 📦 Project Structure

staking-dapp/
├── sdk/ # Backend SDK to fetch data from Polkadot
│ └── src/validators.js
├── src/ # Frontend React app
│ └── App.tsx
├── package.json
└── README.md


---

## 🚀 Features

- Connects to Polkadot via WebSockets (`@polkadot/api`)
- Fetches all active validators in the current era
- Computes validator rewards, commission, own stake, and APY
- Displays **Top 10 validators by APY** in CLI and frontend

---

## 🔧 Installation & Usage

```bash
# Clone repository
git clone <your-repo-url>
cd staking-dapp

# Install dependencies
npm install

---

▶️ Running the SDK (Backend)

npm run sdk:test

---

## Example Output 

📌 Active Era: 1200
🔍 Found 600 validators

🏆 Top 10 Validators by APY:
1. 12abc...XYZ
   APY: 15.23%
   Commission: 3.00%
   Own Stake: 1000000000000
   Total Stake: 50000000000000
   Reward After Commission: 12000000000

   ---

💻 Running the Frontend

npm run dev

Visit 👉 http://localhost:3000
📊 Tech Stack

    React 18 + TypeScript

    Vite (frontend bundler)

    @polkadot/api (Polkadot JS API SDK)

    Node.js (tested on v22+)

    ---

🚀 Next Steps

    Improve UI design with charts and filters

    Add validator search and sorting

    Extend support to Kusama / parachains

    ---

📝 Author

    Your Name : Adegbenga Ogungbeje

    Assignment Deadline: 4th Sept, 13:00