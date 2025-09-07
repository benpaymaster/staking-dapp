// frontend/src/App.tsx
import React, { useEffect, useState } from "react";
import "./App.css";
import {
  connectApi,
  getValidators,
  getLastNonZeroEra,
  fetchValidatorsProgressively,
  ValidatorData
} from "./sdk/validators";

const App: React.FC = () => {
  const [validators, setValidators] = useState<ValidatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("Starting...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // for cleanup in case component unmounts

    const fetchValidators = async () => {
      try {
        setProgress("Connecting to Polkadot node...");
        const api = await connectApi();

        setProgress("Fetching validator IDs...");
        const validatorIds = await getValidators(api);

        setProgress("Determining last era with rewards...");
        const lastEra = await getLastNonZeroEra(api);

        setProgress(`Fetching ${validatorIds.length} validators from era ${lastEra}...`);

        // Fetch validators in batches progressively
        await fetchValidatorsProgressively(
          api,
          lastEra,
          validatorIds,
          20,
          (batch) => {
            if (!isMounted) return;

            setValidators((prev) => {
              const updated = [...prev, ...batch].sort((a, b) => b.apy - a.apy);
              setProgress(`Fetched ${Math.min(updated.length, validatorIds.length)} / ${validatorIds.length} validators...`);
              return updated;
            });
          }
        );

        if (!isMounted) return;
        setProgress("All validators fetched!");
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        if (isMounted) {
          setError(err.message || "Unknown error occurred");
          setLoading(false);
        }
      }
    };

    fetchValidators();

    return () => {
      isMounted = false; // cancel state updates if component unmounts
    };
  }, []);

  if (loading) return <div className="loading">Loading… {progress}</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="App">
      <h1>🏆 Top Validators by APY</h1>
      <table>
        <thead>
          <tr>
            <th>Validator</th>
            <th>Commission (%)</th>
            <th>Total Stake</th>
            <th>Own Stake</th>
            <th>Reward After Commission</th>
            <th>APY (%)</th>
            <th>Reward Points</th>
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
              <td>{v.rewardPoints.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {progress && <div className="progress">{progress}</div>}
    </div>
  );
};

export default App;
