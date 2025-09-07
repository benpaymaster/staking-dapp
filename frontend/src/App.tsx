import React, { useEffect, useState } from "react";
import {
  connectApi,
  getValidators,
  getLastNonZeroEra,
  fetchValidatorsProgressively,
  ValidatorData,
} from "./sdk/validators";

function App() {
  const [apiStatus, setApiStatus] = useState("Connecting...");
  const [validators, setValidators] = useState<ValidatorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setApiStatus("Connecting to Polkadot...");
        const api = await connectApi();

        setApiStatus("Fetching validators...");
        const validatorIds = await getValidators(api);

        setApiStatus("Finding last active era...");
        const era = await getLastNonZeroEra(api);

        setApiStatus("Fetching validator data...");
        const collected: ValidatorData[] = [];

        await fetchValidatorsProgressively(
          api,
          era,
          validatorIds,
          10, // batch size
          (batch) => {
            collected.push(...batch);
            setValidators([...collected]); // progressively update state
          }
        );

        setApiStatus("Done");
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setApiStatus("Error: " + (err as Error).message);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Polkadot Validators Dashboard</h1>
      <p>Status: {apiStatus}</p>

      {loading && <p>Loading validator data...</p>}

      {!loading && (
        <table
          border={1}
          cellPadding={8}
          style={{ borderCollapse: "collapse", marginTop: "20px" }}
        >
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
                <td>{v.commission.toFixed(2)}</td>
                <td>{v.totalStake.toLocaleString()}</td>
                <td>{v.ownStake.toLocaleString()}</td>
                <td>{v.rewardAfterCommission.toLocaleString()}</td>
                <td>{v.apy.toFixed(2)}</td>
                <td>{v.rewardPoints.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;