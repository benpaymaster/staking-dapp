// frontend/testValidators.ts
import {
  connectApi,
  getValidators,
  getLastNonZeroEra,
  fetchValidatorsProgressively,
  checkValidatorActivityAcrossEras,
  ValidatorData,NominatorEra
  NominatorEraActivity,
} from "./src/sdk/validators.ts";

const address = "15baxrY52pfE1ZvrCdyc6xsujq7cWKTUiqeMeQ9ftMiAQV5N";
const startEra = 1914;
const endEra = 1918;

async function main() {
  try {
    const api = await connectApi();
    console.log("✅ Connected to Polkadot node");

    // --- Fetch validators ---
    const validatorIds = await getValidators(api);
    console.log("Fetched validator IDs (first 5):", validatorIds.slice(0, 5));

    // --- Get last non-zero era ---
    const lastEra = await getLastNonZeroEra(api);
    console.log("Last non-zero era:", lastEra);

    // --- Fetch validators progressively for the last era ---
    console.log("\n⏳ Fetching validators progressively for the last era...");
    await fetchValidatorsProgressively(api, lastEra, validatorIds, 5, (batch: ValidatorData[]) => {
      console.log("Batch fetched (first 2 for readability):", batch.slice(0, 2));
    });

    // --- Check multiple eras for a nominator ---
    console.log(`\n🔎 Checking validator activity for address ${address} across eras ${startEra}–${endEra}`);
    const activity: NominatorEraActivity[] = await checkValidatorActivityAcrossEras(api, address, startEra, endEra);

    activity.forEach((entry) => {
      console.log(`Era ${entry.era} — Validator ${entry.validator}: ${entry.active ? "Active" : "Inactive"}`);
    });

    console.log("\n✅ Test complete!");
    process.exit(0);
    activity.forEach((entry) => {
      console.log(`Era ${entry.era} — Validator ${entry.validator}: ${entry.active ? "Active" : "Inactive"}`);
    });

    console.log("\n✅ Test complete!");
    process.exit(0);
  } catch (err: any) {
    console.error("Error in testValidators:", err);
    process.exit(1);
  }
}

main();

