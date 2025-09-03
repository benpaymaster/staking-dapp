// sdk/src/apy.js

/**
 * Calculate APY for a list of validators
 */
export async function calculateAPY(api, validators) {
  const activeEra = (await api.query.staking.activeEra()).unwrap().index.toNumber();
  const prevEra = activeEra - 1;

  // Get era reward pool
  const eraReward = (await api.query.staking.erasValidatorReward(prevEra)).toBigInt();

  // Get reward points
  const eraRewardPoints = await api.query.staking.erasRewardPoints(prevEra);

  const results = [];

  for (const validatorId of validators) {
    // Points for this validator
    const points = eraRewardPoints.individual.get(validatorId);
    if (!points) continue;

    const validatorPoints = points.toBigInt();
    const totalPoints = eraRewardPoints.total.toBigInt();

    // Validator share of total rewards
    const validatorReward = (eraReward * validatorPoints) / totalPoints;

    // Subtract commission
    const prefs = await api.query.staking.erasValidatorPrefs(prevEra, validatorId);
    const commission = prefs.commission.toNumber() / 10_000_000; // perbill → %
    const netReward = validatorReward - (validatorReward * BigInt(Math.floor(commission * 1e7))) / 10_000_000n;

    // Divide by total stake
    const exposure = await api.query.staking.erasStakersOverview(prevEra, validatorId);
    const totalStake = exposure.total.toBigInt();

    if (totalStake === 0n) continue;

    const returnRate = Number(netReward) / Number(totalStake);
    const apy = returnRate * 365.25; // annualize

    results.push({
      validatorId: validatorId.toString(),
      apy: apy * 100, // %
    });
  }

  // Sort by APY descending
  results.sort((a, b) => b.apy - a.apy);
  return results;
}
