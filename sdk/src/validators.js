// sdk/src/validators.js
import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN } from '@polkadot/util';

/**
 * Connect to Polkadot API
 */
export async function connectApi() {
  const wsProvider = new WsProvider('wss://rpc.polkadot.io');
  return await ApiPromise.create({ provider: wsProvider });
}

/**
 * (1) Get all active validators
 */
export async function getValidators(api) {
  const validators = await api.query.session.validators();
  return validators.map(v => v.toString());
}

/**
 * Get current active era index
 */
export async function getActiveEra(api) {
  const activeEra = await api.query.staking.activeEra();
  return activeEra.unwrap().index.toNumber();
}

/**
 * (2) Get validator commission rate
 * (3) + (4) Combine reward entitlement & subtract commission
 * (5) Query erasStakersOverview to get total stake exposure
 * (6) Use these values to prepare APY calculation
 */
export async function getValidatorEraData(api, eraIndex, validatorId) {
  // (2) Commission rate
  const prefs = await api.query.staking.erasValidatorPrefs(eraIndex, validatorId);
  const commission = prefs.commission.toNumber() / 10_000_000; // convert Perbill → %

  // (3) Total rewards available for this era
  const eraRewardRaw = await api.query.staking.erasValidatorReward(eraIndex);
  const eraReward = eraRewardRaw ? new BN(eraRewardRaw.toString()) : new BN(0);

  // (3) Reward points distribution
  const points = await api.query.staking.erasRewardPoints(eraIndex);
  const totalPoints = points.total.toNumber();
  const validatorPoints = points.individual.get(validatorId)?.toNumber() || 0;

  // Validator's entitlement before commission
  const entitledReward =
    totalPoints > 0
      ? eraReward.muln(validatorPoints).divn(totalPoints)
      : new BN(0);

  // (4) Reward after commission
  const rewardAfterCommission = entitledReward.muln(100 - commission).divn(100);

  // (5) Total stake exposure (validator + nominators)
  const exposure = await api.query.staking.erasStakersOverview(eraIndex, validatorId);
  const totalStake = exposure.total ? new BN(exposure.total.toString()) : new BN(0);

  // (6) Return rate & APY calculation
  const returnRate = totalStake.gt(new BN(0))
    ? rewardAfterCommission.muln(1_000_000).div(totalStake).toNumber() / 1_000_000
    : 0;

  const apy = returnRate * 365.25; // annualized

  return {
    validatorId,
    era: eraIndex,
    commission: commission.toFixed(2) + '%',
    entitledReward: entitledReward.toString(),
    rewardAfterCommission: rewardAfterCommission.toString(),
    totalStake: totalStake.toString(),
    returnRate,
    apy
  };
}

/**
 * (3) Get reward history (reward points for a validator over last N eras)
 */
export async function getRewardHistory(api, validatorId, currentEra, lookback = 30) {
  const history = [];

  for (let i = currentEra - lookback; i < currentEra; i++) {
    const points = await api.query.staking.erasRewardPoints(i);
    if (points.individual.has(validatorId)) {
      const rewardPoints = points.individual.get(validatorId).toNumber();
      history.push({ era: i, rewardPoints });
    }
  }

  return history;
}

/**
 * (5) Get erasStakersOverview entries for a validator
 */
export async function getErasStakersOverview(api, eraIndex, validatorId) {
  const overview = await api.query.staking.erasStakersOverview(eraIndex, validatorId);
  return overview.toJSON();
}
