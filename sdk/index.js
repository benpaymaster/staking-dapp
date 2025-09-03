// sdk/index.js
import { connectApi, getValidators, getActiveEra, getValidatorEraData } from './src/validators.js';

/**
 * Main entry point
 */
async function main() {
  try {
    // Connect to Polkadot node
    const api = await connectApi();
    console.log('✅ Connected to Polkadot');

    // Step 1: Get all active validators
    const validators = await getValidators(api);
    console.log(`📊 Found ${validators.length} active validators`);

    // Step 2: Get current active era
    const eraIndex = await getActiveEra(api);
    console.log(`📌 Using era: ${eraIndex}`);

    // Step 3: Compute validator APY
    const validatorData = [];
    for (const val of validators) {
      const data = await getValidatorEraData(api, eraIndex - 1, val); // use previous era
      validatorData.push(data);
    }

    // Step 4: Sort by APY descending
    validatorData.sort((a, b) => b.apy - a.apy);

    // Step 5: Print top 16 validators
    console.log('\n🏆 Top 16 validators by APY:');
    console.table(
      validatorData.slice(0, 16).map(v => ({
        Validator: v.validatorId,
        Commission: v.commission,
        'Total Stake': v.totalStake,
        'Reward After Commission': v.rewardAfterCommission,
        APY: v.apy.toFixed(2) + '%'
      }))
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run main
main();
