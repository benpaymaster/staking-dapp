// sdk/src/validators.js
import { ApiPromise, WsProvider } from '@polkadot/api';

/**
 * Connect to Polkadot node with retry + exponential backoff
 */
export async function connectApi(
  endpoint = 'wss://rpc.polkadot.io',
  maxRetries = 5
) {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      const wsProvider = new WsProvider(endpoint, 10_000); // 10s timeout
      const api = await ApiPromise.create({ provider: wsProvider });

      // ✅ Listen for disconnects & auto-reconnect
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
      const delay = Math.min(2 ** attempt * 1000, 30_000); // exponential backoff (capped at 30s)
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

/**
 * Get all active validators for the current session
 */
export async function getValidators(api) {
  const validators = await api.query.session.validators();
  return validators.map((v) => v.toString());
}

/**
 * Get the current active era
 */
export async function getActiveEra(api) {
  const activeEra = await api.query.staking.activeEra();
  return Number(activeEra?.index || 0);
}

/**
 * Get validator data for a specific era
 */
export async function getValidatorEraData(api, eraIndex, validatorId) {
  // ✅ Runtime checks
  if (eraIndex < 0) {
    throw new Error(`❌ Invalid eraIndex: ${eraIndex} (must be >= 0)`);
  }
  if (!validatorId || typeof validatorId !== 'string') {
    throw new Error(`❌ Invalid validatorId: ${validatorId}`);
  }

  // ✅ Ensure correct Substrate types
  const era = api.createType('EraIndex', eraIndex);
  const accountId = api.createType('AccountId', validatorId);

  // Total payout for this era
  const totalPayoutRaw = await api.query.staking.erasValidatorReward(era);
  const totalPayout = totalPayoutRaw ? BigInt(totalPayoutRaw.toString()) : 0n;

  // Reward points for all validators
  const entries = await api.query.staking.erasRewardPoints(era);

  // Validator commission prefs
  const commissionRaw = await api.query.staking.erasValidatorPrefs(
    era,
    accountId
  );
  const commissionRate = commissionRaw?.commission
    ? Number(commissionRaw.commission) / 1_000_000_000
    : 0;

  // Staker info
  const stakersOverview = await api.query.staking.erasStakers(era, accountId);
  const totalStake = stakersOverview?.total
    ? BigInt(stakersOverview.total.toString())
    : 0n;
  const ownStake = stakersOverview?.own
    ? BigInt(stakersOverview.own.toString())
    : 0n;

  // Extract this validator’s reward points
  let rewardPoints = 0n;
  if (entries?.individual) {
    const found = entries.individual.find(
      ([id]) => id.toString() === validatorId
    );
    if (found) {
      rewardPoints = BigInt(found[1].toString());
    }
  }
  const totalRewardPoints = entries?.total
    ? BigInt(entries.total.toString())
    : 0n;

  // Validator share of payout
  const validatorShare =
    totalRewardPoints > 0n && rewardPoints > 0n
      ? (rewardPoints * totalPayout) / totalRewardPoints
      : 0n;

  // Net rewards after commission
  const rewardAfterCommission =
    validatorShare > 0n
      ? validatorShare -
        (validatorShare *
          BigInt(Math.floor(commissionRate * 1_000_000_000))) /
          1_000_000_000n
      : 0n;

  // APY calculation
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
