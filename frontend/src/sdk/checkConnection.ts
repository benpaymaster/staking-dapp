import { connectApi } from "./validators";

async function main() {
  try {
    console.log("Connecting to Polkadot node...");
    const api = await connectApi("wss://rpc.polkadot.io");
    console.log("✅ Connected to Polkadot node!");

    // Optional: fetch chain name to verify
    const chain = await api.rpc.system.chain();
    console.log("Connected chain:", chain.toString());

    await api.disconnect();
  } catch (err) {
    console.error("❌ Connection failed:", err);
  }
}

main();
