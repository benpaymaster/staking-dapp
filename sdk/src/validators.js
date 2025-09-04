// sdk/src/validators.js
import { ApiPromise, WsProvider } from '@polkadot/api';

export async function connectApi(
  endpoint = 'wss://rpc.polkadot.io',
  maxRetries = 5
) {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      const wsProvider = new WsProvider(endpoint, 10_000);
      const api = await ApiPromise.create({ provider: wsProvider });

      wsProvider.on('disconnected', () => {
        console.warn('⚠️ Disconnected from node, will attempt reconnect...');
      });

      wsProvider.on('error', (err) => {
        console.error('❌ WebSocket error:', err.message);
      });

      console.log(`✅ Connected to Polkadot on attempt #${attempt + 1}`);
      return api;
    } catch (error) {
      lastError = error;
      attempt++;
      const delay = Math.min(2 ** attempt * 1000, 30_000);
      console.warn(
        `⚠️ Connection attempt #${attempt} failed: ${error.message}. Retrying in ${
          delay / 1000
        }s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(
    `❌ Could not connect to ${endpoint} after ${maxRetries} attempts. Last error: ${lastError?.message}`
  );
}

export async function getValidators(api) {
  const validators = await api.query.session.validators();
  return validators.map((v) => v.toString());
}

export async function getActiveEra(api) {
  const activeEra = await api.query.staking.activeEra();
  return Number(activeEra?.index || 0);
}

export async function getValidatorEraData(api, eraIndex, validatorId) {
  if (eraIndex < 0) throw new Error(`❌ Invalid eraIndex: ${eraIndex}`);
  if (!validatorId) throw new Error(`❌ Invalid validatorId: ${validatorId}`);

  const era = api.createType('EraIndex', eraIndex);
  const accountId = api.createType('AccountId', validatorId);

  const totalPayoutRaw = await api.query.staking.erasValidatorReward(era);
  const totalPayout = totalPayoutRaw ? BigInt(totalPayoutRaw.toString()) : 0n;

  const rewardPointsStruct = await api.query.staking.erasRewardPoints(era);

  const commissionRaw = await api.query.staking.erasValidatorPrefs(
    era,
    accountId
  );
  const commissionRate = commissionRaw?.commission
    ? Number(commissionRaw.commission) / 1_000_000_000
    : 0;

  const stakersOverview = await api.query.staking.erasStakers(era, accountId);
  const totalStake = stakersOverview?.total
    ? BigInt(stakersOverview.total.toString())
    : 0n;
  const ownStake = stakersOverview?.own
    ? BigInt(stakersOverview.own.toString())
    : 0n;

  // ✅ Correctly read reward points
  let rewardPoints = 0n;
  if (rewardPointsStruct?.individual) {
    const points = rewardPointsStruct.individual.get(accountId);
    if (points) {
      rewardPoints = BigInt(points.toString());
    }
  }
  const totalRewardPoints = rewardPointsStruct?.total
    ? BigInt(rewardPointsStruct.total.toString())
    : 0n;

  const validatorShare =
    totalRewardPoints > 0n && rewardPoints > 0n
      ? (rewardPoints * totalPayout) / totalRewardPoints
      : 0n;

  const rewardAfterCommission =
    validatorShare > 0n
      ? validatorShare -
        (validatorShare *
          BigInt(Math.floor(commissionRate * 1_000_000_000))) /
          1_000_000_000n
      : 0n;

  const stakingReturns =
    totalStake > 0n ? Number(rewardAfterCommission) / Number(totalStake) : 0;
  const apy = stakingReturns * 365.24219 * 100;

  return {
    validatorId,
    rewardPoints,
    totalStake,
    ownStake,
    commission: commissionRate,
    rewardAfterCommission,
    apy: Number.isFinite(apy) ? apy : 0,
  };
}

// Run immediately if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const api = await connectApi();
    const era = await getActiveEra(api);
    console.log(`📌 Active Era: ${era}`);

    const validators = await getValidators(api);
    console.log(`🔍 Found ${validators.length} validators`);

    const results = [];
    for (const v of validators) {
      try {
        const data = await getValidatorEraData(api, era, v);
        results.push(data);
      } catch (err) {
        console.warn(`⚠️ Skipping validator ${v}: ${err.message}`);
      }
    }

    const sorted = results.sort((a, b) => b.apy - a.apy).slice(0, 10);
    console.log('🏆 Top 10 Validators by APY:');
    sorted.forEach((v, i) => {
      console.log(
        `${i + 1}. ${v.validatorId}\n` +
        `   APY: ${v.apy.toFixed(2)}%\n` +
        `   Commission: ${(v.commission * 100).toFixed(2)}%\n` +
        `   Own Stake: ${v.ownStake}\n` +
        `   Total Stake: ${v.totalStake}\n` +
        `   Reward After Commission: ${v.rewardAfterCommission}\n`
      );
    });

    process.exit(0);
  })();
}
