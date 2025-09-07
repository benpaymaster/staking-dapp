// frontend/src/sdk/validators.ts
import { ApiPromise, WsProvider } from "@polkadot/api";
import type { Option, u32 } from "@polkadot/types";
import BN from "bn.js";

// ------------------- TYPES -------------------
export interface ValidatorData {
  validatorId: string;
  commission: number;
  totalStake: number;
  ownStake: number;
  rewardAfterCommission: number;
  apy: number;
  rewardPoints: number;
}

export interface NominatorReward {
  validatorId: string;
  ourShare: bigint;
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
    const eraRewardOpt = (await api.query.staking.erasReward(era)) as Option<any>;
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

// ------------------- NOMINATOR REWARDS -------------------
export async function getNominatorRewards(
  api: ApiPromise,
  address: string,
  era: number
): Promise<{ rewards: NominatorReward[]; total: bigint }> {
  const nominator = await api.query.staking.nominators(address);
  if (nominator.isNone) {
    return { rewards: [], total: 0n };
  }

  const targets = nominator.unwrap().targets.map((t) => t.toString());
  const ledger = await api.query.staking.ledger(address);
  console.log("Active stake:", ledger.isSome ? ledger.unwrap().active.toString() : "none");

  const totalPayoutOpt = (await api.query.staking.erasReward(era)) as Option<any>;
  const totalPayout = totalPayoutOpt.isSome ? BigInt(totalPayoutOpt.unwrap().toString()) : 0n;

  const rewardPoints: any = await api.query.staking.erasRewardPoints(era);

  let totalNominatorRewards = 0n;
  const rewards: NominatorReward[] = [];

  for (const validator of targets) {
    const exposure = await api.query.staking.erasStakers(era, validator);
    const others = exposure.others.toJSON() as any[];
    const ourStake = others.find((o) => o.who === address);

    const indivPoints = rewardPoints.individual.get(validator);
    if (ourStake && indivPoints) {
      const prefs = await api.query.staking.erasValidatorPrefs(era, validator);
      const validatorTotalReward =
        (BigInt(indivPoints.toString()) * totalPayout) / BigInt(rewardPoints.total.toString());

      const commissionRate = Number(prefs.commission) / 1e7;
      const commissionAmount = BigInt(Math.floor(validatorTotalReward * commissionRate));
      const netRewards = validatorTotalReward - commissionAmount;

      const ourShare = (BigInt(ourStake.value) * netRewards) / BigInt(exposure.total.toString());

      rewards.push({ validatorId: validator, ourShare });
      totalNominatorRewards += ourShare;
    }
  }

  return { rewards, total: totalNominatorRewards };
}

// ------------------- MULTI-ERA CHECK -------------------
export async function checkMultipleEras(
  api: ApiPromise,
  address: string,
  fromEra: number,
  toEra: number
): Promise<{ era: number; active: { validatorId: string; status: string }[] }[]> {
  const nominator = await api.query.staking.nominators(address);
  if (nominator.isNone) return [];

  const targets = nominator.unwrap().targets.map((t) => t.toString());
  const results: { era: number; active: { validatorId: string; status: string }[] }[] = [];

  for (let era = fromEra; era <= toEra; era++) {
    const activity: { validatorId: string; status: string }[] = [];
    for (const validator of targets) {
      const exposure = await api.query.staking.erasStakers(era, validator);
      const status = exposure.total.toBn().gt(new BN(0)) ? "Active" : "Inactive";
      activity.push({ validatorId: validator, status });
    }
    results.push({ era, active: activity });
  }

  return results;
}
