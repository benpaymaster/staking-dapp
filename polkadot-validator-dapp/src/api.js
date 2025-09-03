// sdk/src/apy.js
import { ApiPromise, WsProvider } from "@polkadot/api";

let api;

/**
 * Lazy init for API
 */
export async function getApi() {
  if (!api) {
    const wsProvider = new WsProvider("wss://rpc.polkadot.io");
    api = await ApiPromise.create({ provider: wsProvider });
  }
  return api;
}

/**
 * Calculate APY for validators in a given era
 *
 * Steps:
 * 1. Get total reward for the era
 * 2. Use reward points to calculate validator share
 * 3. Subtract commission
 * 4. Divide by total stake (erasStakersOverview)
 * 5. Annualize → APY
 */
export async function calculateAPY(api, validators, eraIndex) {
  const results = [];

  // 1. Total reward for this era
  const totalEraReward = await api.query.staking.erasValidatorReward(eraIndex);

  // 2. Reward points distribution
  const rewardPoints = await api.query.staking.erasRewardPoints(eraIndex);

  for (const val of validators) {
    const validatorId = val.toString();

    // 3. Commission rate
    const prefs = await api.query.staking.erasValidatorPrefs(eraIndex, validatorId);
    const commission = prefs.commission.toNumber() / 10_000_000; // perbill → %

    // 4. Validator reward share
    let validatorReward = 0;
    if (rewardPoints.individual.has(validatorId)) {
      const points = rewardPoints.individual.get(validatorId).toNumber();
      const totalPoints = rewardPoints.total.toNumber();
      validatorReward = totalEraReward.toBn().muln(points).divn(totalPoints);
    }

    // 5. Subtract commission
    const rewardAfterCommission = validatorReward.sub(
      validatorReward.muln(commission * 100).divn(100) // convert % to integer math
    );

    // 6. Get total stake (exposure)
    const exposure = await api.query.staking.erasStakersOverview(eraIndex, validatorId);
    const totalStake = exposure.total.toBn();

    let apy = 0;
    if (!totalStake.isZero()) {
      const returnRate = rewardAfterCommission.toNumber() / totalStake.toNumber();
      apy = returnRate * 365.25; // annualized
    }

    results.push({
      validatorId,
      commission: (commission * 100).toFixed(2) + "%",
      apy: (apy * 100).toFixed(2) + "%"
    });
  }

  return results;
}
