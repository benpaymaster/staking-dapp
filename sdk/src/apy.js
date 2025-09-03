// sdk/src/apy.js

/**
 * Calculate APY and return full validator info
 */
export async function calculateAPY(api, validators, era) {
  const prevEra = era ?? ((await api.query.staking.activeEra()).unwrap().index.toNumber() - 1);

  // Get era reward pool
  const eraReward = (await api.query.staking.erasValidatorReward(prevEra)).toBigInt();

  // Get reward points
  const eraRewardPoints = await api.query.staking.erasRewardPoints(prevEra);

  const results = [];

  for (const validatorId of validators) {
    const points = eraRewardPoints.individual.get(validatorId);
    if (!points) continue;

    const validatorPoints = points.toBigInt();
    const totalPoints = eraRewardPoints.total.toBigInt();

    // Validator share of total rewards
    const validatorReward = (eraReward * validatorPoints) / totalPoints;

    // Subtract commission
    const prefs = await api.query.staking.erasValidatorPrefs(prevEra, validatorId);
    const commission = prefs.commission.toNumber() / 10_000_000; // perbill → %

    const netReward =
      validatorReward - (validatorReward * BigInt(Math.floor(commission * 1e7))) / 10_000_000n;

    // Divide by total stake
    const exposure = await api.query.staking.erasStakersOverview(prevEra, validatorId);
    const totalStake = exposure.total.toBigInt();
    const ownStake = exposure.own.toBigInt();
    const nominatorCount = exposure.nominatorCount.toNumber();

    if (totalStake === 0n) continue;

    const returnRate = Number(netReward) / Number(totalStake);
    const apy = returnRate * 365.25; // annualize

    results.push({
      validatorId: validatorId.toString(),
      apy: apy * 100, // %
      totalStake: Number(totalStake),
      ownStake: Number(ownStake),
      rewardPoints: Number(validatorPoints),
      commission: commission,
      nominatorCount: nominatorCount,
    });
  }

  return results;
}
