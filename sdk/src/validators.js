import { ApiPromise, WsProvider } from '@polkadot/api';

async function Main() {
  const data = new Map();
  const wsProvider = new WsProvider('wss://rpc.polkadot.io');
  const api = await ApiPromise.create({ provider: wsProvider });

  const era = 1916; // example era

  // Fetch data
  const totalPayout = BigInt((await api.query.staking.erasValidatorReward(era)).toString());
  const entries = await api.query.staking.erasRewardPoints(era);
  const commissionEntries = await api.query.staking.erasValidatorPrefs.entries(era);
  const stakersOverviewEntries = await api.query.staking.erasStakersOverview.entries(era);

  // Build initial data from reward points
  if (entries.individual) {
    for (const [address, rewardPoints] of entries.individual) {
      if (!address || rewardPoints === undefined) continue;
      data.set(address.toString(), {
        address: address.toString(),
        rewardPoints: BigInt(rewardPoints.toString()),
      });
    }
  }

  // Add commission safely
  for (const entry of commissionEntries) {
    if (!entry || !entry[0] || !entry[1]) continue;
    const [key, value] = entry;
    const address = key?.args?.[1]?.toString();
    if (!address || value?.commission === undefined) continue;
    if (data.has(address)) {
      const existing = data.get(address);
      data.set(address, {
        ...existing,
        commission: BigInt(value.commission.toString()),
      });
    }
  }

  // Add stakers overview safely
  for (const entry of stakersOverviewEntries) {
    if (!entry || !entry[0] || !entry[1]) continue;
    const [key, value] = entry;
    const address = key?.args?.[1]?.toString();
    if (!address || value?.total === undefined || value?.own === undefined) continue;
    if (data.has(address)) {
      const existing = data.get(address);
      data.set(address, {
        ...existing,
        total: BigInt(value.total.toString()),
        own: BigInt(value.own.toString()),
        nominatorCount: value?.nominatorCount?.toNumber() ?? 0,
      });
    }
  }

  const totalRewardPoints = BigInt(entries.total?.toString() || '0');

  // Calculate APY
  for (const [address, validator] of data.entries()) {
    if (validator.total && validator.commission !== undefined) {
      const validatorShare = (validator.rewardPoints * totalPayout) / totalRewardPoints;
      const commissionRate = Number(validator.commission) / 1_000_000_000;
      const commissionAmount = (validatorShare * BigInt(Math.floor(commissionRate * 1_000_000_000))) / 1_000_000_000n;
      const netRewards = validatorShare - commissionAmount;
      const stakingReturns = Number(netRewards) / Number(validator.total);
      const apy = stakingReturns * 365.24219 * 100;
      data.set(address, { ...validator, apy: apy.toFixed(3) });
    }
  }

  console.log(Array.from(data.values()));
}

Main().catch(console.error);
