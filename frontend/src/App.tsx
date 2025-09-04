// frontend/src/App.tsx
import React, { useEffect, useState } from 'react';
import './App.css';
import {
  connectApi,
  getValidators,
  getActiveEra,
  getValidatorEraData,
} from '../../sdk/src/validators';

interface ValidatorData {
  validatorId: string;
  totalStake: bigint;
  ownStake: bigint;
  commission: number;
  rewardAfterCommission: bigint;
  apy: number;
  rewardPoints: bigint;
}

const App: React.FC = () => {
  const [validators, setValidators] = useState<ValidatorData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchValidators = async () => {
      try {
        setLoading(true);
        const api = await connectApi();
        console.log('✅ Connected to Polkadot');

        const validatorIds = await getValidators(api);
        const eraIndex = await getActiveEra(api);
        console.log(`📌 Active era: ${eraIndex}`);

        // Use previous era if available, otherwise fall back to current
        const targetEra = eraIndex > 0 ? eraIndex - 1 : eraIndex;

        const validatorData: ValidatorData[] = [];
        for (const id of validatorIds) {
          try {
            const data = await getValidatorEraData(api, targetEra, id);
            validatorData.push(data);
          } catch (innerErr: any) {
            console.warn(`⚠️ Skipping validator ${id}: ${innerErr.message}`);
          }
        }

        // Sort by APY descending
        validatorData.sort((a, b) => b.apy - a.apy);
        setValidators(validatorData.slice(0, 16)); // top 16
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchValidators();
  }, []);

  if (loading) return <div className="loading">Loading validators...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="App">
      <h1>🏆 Top 16 Validators by APY</h1>
      <table>
        <thead>
          <tr>
            <th>Validator</th>
            <th>Commission (%)</th>
            <th>Total Stake</th>
            <th>Own Stake</th>
            <th>Reward After Commission</th>
            <th>APY (%)</th>
          </tr>
        </thead>
        <tbody>
          {validators.map((v) => (
            <tr key={v.validatorId}>
              <td>{v.validatorId}</td>
              <td>{(v.commission * 100).toFixed(2)}</td>
              <td>{v.totalStake.toString()}</td>
              <td>{v.ownStake.toString()}</td>
              <td>{v.rewardAfterCommission.toString()}</td>
              <td>{v.apy.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
