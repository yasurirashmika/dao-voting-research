/* src/hooks/useVoterDiscovery.js */
import { useState, useEffect, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { useDeployment } from "../context/DeploymentContext";

export const useVoterDiscovery = () => {
  const [discoveredWallets, setDiscoveredWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { mode } = useDeployment();
  const publicClient = usePublicClient();

  // Get addresses dynamically from Env
  const tokenAddress = process.env.REACT_APP_GOVERNANCE_TOKEN_ADDRESS;
  const didAddress = process.env.REACT_APP_DID_REGISTRY_ADDRESS;

  const discoverWallets = useCallback(async () => {
    if (!publicClient || !tokenAddress) return;

    setLoading(true);
    const uniqueAddresses = new Set();

    try {
      console.log("🔍 Scanning blockchain for voters...");

      // 1. Fetch Token Transfers (Finds Public Voters)
      const transferLogs = await publicClient.getLogs({
        address: tokenAddress,
        event: {
          type: "event",
          name: "Transfer",
          inputs: [
            { type: "address", indexed: true, name: "from" },
            { type: "address", indexed: true, name: "to" },
            { type: "uint256", indexed: false, name: "value" },
          ],
        },
        fromBlock: "earliest",
      });

      transferLogs.forEach((log) => {
        const receiver = log.args.to;
        if (
          receiver &&
          receiver !== "0x0000000000000000000000000000000000000000"
        ) {
          uniqueAddresses.add(receiver);
        }
      });

      // 2. Fetch DID Registrations (Finds Private Voters)
      if (didAddress) {
        const didLogs = await publicClient.getLogs({
          address: didAddress,
          event: {
            type: "event",
            name: "VotingRegistrationSuccess",
            inputs: [
              { type: "address", indexed: true, name: "controller" },
              { type: "bytes32", indexed: false, name: "commitment" },
            ],
          },
          fromBlock: "earliest",
        });

        didLogs.forEach((log) => {
          if (log.args.controller) {
            uniqueAddresses.add(log.args.controller);
          }
        });
      }

      const walletList = Array.from(uniqueAddresses);
      console.log(`✅ Discovered ${walletList.length} voters`);
      setDiscoveredWallets(walletList);
    } catch (error) {
      console.error("Error discovering wallets:", error);
    } finally {
      setLoading(false);
    }
  }, [publicClient, tokenAddress, didAddress]);

  useEffect(() => {
    discoverWallets();
  }, [discoverWallets]);

  return { discoveredWallets, loading };
};
