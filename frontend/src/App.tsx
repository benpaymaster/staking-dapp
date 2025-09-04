// frontend/src/App.tsx
import React, { useEffect, useState } from 'react';
import './App.css';


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
  const [progress, setProgress] = useState<string>("Starting...");

  useEffect(() => {
    const fetchValidators = async () => {
      try {
        setLoading(true);
        setProgress("Connecting to Polkadot…");

        // Use more reliable public endpoint
        const api = await connectAp("wss://polkadot-rpc.publicnode.com");  
        console.log("✅ Connected to Polkadot");

        const validatorIds = await getValidators(api);
        console.log(`📡 Got ${validatorIds.length} validators`);

        const eraIndex = await getActiveEra(api);
        console.log(`📌 Active era: ${eraIndex}`);
        const targetEra = eraIndex > 0 ? eraIndex - 1 : eraIndex;

        const validatorData: ValidatorData[] = [];

        // Limit to first 5 for debugging
        const sampleIds = validatorIds.slice(0, 5);

        for (let i = 0; i < sampleIds.length; i++) {
          const id = sampleIds[i];
          setProgress(`Fetching validator ${i + 1}/${sampleIds.length}`);
          try {
            console.log(`🔎 Fetching data for validator ${id}`);
            const data = await getValidatorEraData(api, targetEra, id);
            validatorData.push(data);
          } catch (innerErr: any) {
            console.warn(`⚠️ Skipping validator ${id}: ${innerErr.message}`);
          }
        }

        validatorData.sort((a, b) => b.apy - a.apy);
        setValidators(validatorData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Unknown error occurred");
      } finally {
        setLoading(false);
        setProgress("");
      }
    };

    fetchValidators();
  }, []);

  if (loading) return <div className="loading">Loading validators… {progress}</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="App">
      <h1>🏆 Top Validators by APY (sample)</h1>
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
