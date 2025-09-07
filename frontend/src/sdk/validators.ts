// frontend/src/sdk/validators.ts
import { ApiPromise, WsProvider } from '@polkadot/api';

export interface ValidatorData {
  era: number;
  validatorId: string;
  totalStake: bigint;
  ownStake: bigint;
  commission: number;
  rewardAfterCommission: bigint;
  apy: number;
  rewardPoints: bigint;
}

// ----------------- FUNCTIONS -----------------

export async function connectApi(endpoint = 'wss://rpc.polkadot.io'): Promise<ApiPromise> {
  const provider = new WsProvider(endpoint);
  const api = await ApiPromise.create({ provider });

  provider.on('disconnected', () => console.warn('⚠️ Disconnected from node.'));
  provider.on('error', (err: any) => console.error('❌ WebSocket error:', err.message));

  console.log('✅ Connected to Polkadot');
  return api;
}

export async function getValidators(api: ApiPromise): Promise<string[]> {
  const validators = await api.query.session.validators();
  return validators.map((v) => v.toString());
}

export async function getLastNonZeroEra(api: ApiPromise): Promise<number> {
  let activeEraOpt: any = await api.query.staking.activeEra();
  let era = Number(activeEraOpt?.index || 0) - 1;

  while (era >= 0) {
    const reward = await api.query.staking.erasValidatorReward(era);
    if (reward && reward.toBigInt() > 0n) break;
    era--;
  }
  return era >= 0 ? era : 0;
}

export async function getValidatorEraData(
  api: ApiPromise,
  eraIndex: number,
  validatorId: string,
  debug = false
): Promise<ValidatorData> {
  const era = api.createType('EraIndex', eraIndex);
  const accountId = api.createType('AccountId', validatorId);

  const totalPayoutRaw = await api.query.staking.erasValidatorReward(era);
  const totalPayout = totalPayoutRaw ? BigInt(totalPayoutRaw.toString()) : 0n;

  const rewardPointsStruct = await api.query.staking.erasRewardPoints(era);
  const points = rewardPointsStruct?.individual?.get(accountId);
  const rewardPoints = points ? BigInt(points.toString()) : 0n;
  const totalRewardPoints = rewardPointsStruct?.total ? BigInt(rewardPointsStruct.total.toString()) : 0n;

  const prefs = await api.query.staking.erasValidatorPrefs(era, accountId);
  const commission = prefs?.commission ? Number(prefs.commission.toString()) / 1_000_000_000 : 0;

  const stakersOverview = await api.query.staking.erasStakers(era, accountId);
  const totalStake = stakersOverview?.total ? BigInt(stakersOverview.total.toString()) : 0n;
  const ownStake = stakersOverview?.own ? BigInt(stakersOverview.own.toString()) : 0n;

  let validatorShare = 0n;
  if (totalRewardPoints > 0n && rewardPoints > 0n) {
    validatorShare = (totalPayout * rewardPoints) / totalRewardPoints;
  }
  const rewardAfterCommission = BigInt(Math.floor(Number(validatorShare) * (1 - commission)));

  const stakingReturns = totalStake > 0n ? Number(rewardAfterCommission) / Number(totalStake) : 0;
  const apy = stakingReturns * 365.24219 * 100;

  if (debug) {
    console.log(`Validator ${validatorId} Era ${eraIndex}`);
    console.log({
      totalPayout: totalPayout.toString(),
      rewardPoints: rewardPoints.toString(),
      totalRewardPoints: totalRewardPoints.toString(),
      totalStake: totalStake.toString(),
      ownStake: ownStake.toString(),
      commission,
      rewardAfterCommission: rewardAfterCommission.toString(),
      apy
    });
  }

  return {
    era: eraIndex,
    validatorId,
    totalStake,
    ownStake,
    commission,
    rewardAfterCommission,
    apy: Number.isFinite(apy) ? apy : 0,
    rewardPoints
  };
}

// Progressive fetching in batches
export async function fetchValidatorsProgressively(
  api: ApiPromise,
  era: number,
  validatorIds: string[],
  batchSize = 20,
  onBatchComplete?: (batchResults: ValidatorData[]) => void,
  debug = false
): Promise<ValidatorData[]> {
  const results: ValidatorData[] = [];
  for (let i = 0; i < validatorIds.length; i += batchSize) {
    const batch = validatorIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((id) => getValidatorEraData(api, era, id, debug))
    );
    results.push(...batchResults);
    if (onBatchComplete) onBatchComplete(batchResults);
  }
  return results;
}
