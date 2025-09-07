import { ApiPromise, WsProvider } from "@polkadot/api";
import type { Option, u32 } from "@polkadot/types";
import BN from "bn.js";

// Use only numbers in ValidatorData for frontend compatibility
export interface ValidatorData {
  validatorId: string;
  commission: number;
  totalStake: number;
  ownStake: number;
  rewardAfterCommission: number;
  apy: number;
  rewardPoints: number;
}

// ------------------- CONNECT -------------------
export async function connectApi(
  endpoint = "wss://rpc.polkadot.io"
): Promise<ApiPromise> {
  const provider = new WsProvider(endpoint);
  const api = await ApiPromise.create({ provider });
  await api.isReady;
  return api;
}

// ------------------- VALIDATORS -------------------
export async function getValidators(api: ApiPromise): Promise<string[]> {
  const validatorIds = await api.query.session.validators();
  return validatorIds.map((id) => id.toString());
}

// ------------------- ERA -------------------
export async function getLastNonZeroEra(api: ApiPromise): Promise<number> {
  const currentEraOpt = (await api.query.staking.currentEra()) as Option<u32>;
  if (currentEraOpt.isNone) return 0;
  const currentEra = currentEraOpt.unwrap().toNumber();

  for (let era = currentEra; era > 0; era--) {
    const rewardPoints: any = await api.query.staking.erasRewardPoints(era);
    if (rewardPoints?.total?.gtn(0)) {
      return era;
    }
  }
  return currentEra;
}

// ------------------- FETCH VALIDATORS -------------------
export async function fetchValidatorsProgressively(
  api: ApiPromise,
  era: number,
  validatorIds: string[],
  batchSize: number,
  onBatch: (batch: ValidatorData[]) => void
): Promise<void> {
  for (let i = 0; i < validatorIds.length; i += batchSize) {
    const batch = validatorIds.slice(i, i + batchSize);
    const batchResults: ValidatorData[] = [];

    const rewardPoints: any = await api.query.staking.erasRewardPoints(era);

    // Total reward pot for the era
    const eraRewardOpt = (await api.query.staking.erasValidatorReward(era)) as Option<any>;
    const eraReward = eraRewardOpt.isSome ? eraRewardOpt.unwrap().toBn() : new BN(0);

    for (const validatorId of batch) {
      const [exposure, prefs] = await Promise.all([
        api.query.staking.erasStakers(era, validatorId),
        api.query.staking.erasValidatorPrefs(era, validatorId),
      ]);

      const commission = prefs.commission.toNumber() / 1e7;
      const totalStakeBN = exposure.total.toBn();
      const ownStakeBN = exposure.own.toBn();

      const indivPoints =
        (rewardPoints as any).individual.get(validatorId) || new BN(0);

      // Validator’s portion of era rewards
      const validatorReward =
        rewardPoints.total?.gtn(0) && indivPoints?.gtn(0)
          ? eraReward.mul(indivPoints.toBn()).div((rewardPoints as any).total.toBn())
          : new BN(0);

      // After commission
      const rewardAfterCommissionBN = validatorReward
        .mul(new BN(1e7 - prefs.commission.toNumber()))
        .div(new BN(1e7));

      // APY = (rewardAfterCommission / totalStake) * 365 * 100
      let apy = 0;
      if (totalStakeBN.gt(new BN(0))) {
        apy =
          rewardAfterCommissionBN
            .mul(new BN(365 * 10000))
            .div(totalStakeBN)
            .toNumber() / 100;
      }

      batchResults.push({
        validatorId,
        commission,
        totalStake: totalStakeBN.toNumber(),
        ownStake: ownStakeBN.toNumber(),
        rewardAfterCommission: rewardAfterCommissionBN.toNumber(),
        apy,
        rewardPoints: indivPoints.toNumber(),
      });
    }

    onBatch(batchResults);
  }

}