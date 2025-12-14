/* src/hooks/useVoterDiscovery.js */
import { useState, useEffect, useRef } from "react";
import { usePublicClient } from "wagmi";

export const useVoterDiscovery = () => {
  const [discoveredWallets, setDiscoveredWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient();

  // Use a ref to ensure we only fetch once per session
  const hasFetched = useRef(false);

  // Get addresses dynamically from Env
  const tokenAddress = process.env.REACT_APP_GOVERNANCE_TOKEN_ADDRESS;
  const didAddress = process.env.REACT_APP_DID_REGISTRY_ADDRESS;

  // OPTIMIZATION: Set this to the block number where you deployed your contracts.
  // This prevents scanning millions of empty blocks from 2015.
  // If you don't know it, use a recent block number or "earliest" as a fallback (but "earliest" is slow).
  const DEPLOYMENT_BLOCK = 7000000n; // Example for Sepolia. Change this if you know your specific block.

  useEffect(() => {
    const discoverWallets = async () => {
      if (!publicClient || !tokenAddress || hasFetched.current) return;

      hasFetched.current = true; // Mark as fetched immediately
      setLoading(true);
      const uniqueAddresses = new Set();

      try {
        console.log("🔍 Scanning blockchain for voters (Optimized)...");

        // 1. Fetch Token Transfers
        // We use a Promise.all to run both requests in parallel but catch errors individually
        const [transferLogs, didLogs] = await Promise.all([
          publicClient
            .getLogs({
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
              fromBlock: DEPLOYMENT_BLOCK,
              toBlock: "latest",
            })
            .catch((err) => {
              console.warn("Transfer log fetch failed (Rate Limit?):", err);
              return [];
            }),

          didAddress
            ? publicClient
                .getLogs({
                  address: didAddress,
                  event: {
                    type: "event",
                    name: "VotingRegistrationSuccess",
                    inputs: [
                      { type: "address", indexed: true, name: "controller" },
                      { type: "bytes32", indexed: false, name: "commitment" },
                    ],
                  },
                  fromBlock: DEPLOYMENT_BLOCK,
                  toBlock: "latest",
                })
                .catch((err) => {
                  console.warn("DID log fetch failed (Rate Limit?):", err);
                  return [];
                })
            : Promise.resolve([]),
        ]);

        // Process Token Logs
        transferLogs.forEach((log) => {
          const receiver = log.args.to;
          if (
            receiver &&
            receiver !== "0x0000000000000000000000000000000000000000"
          ) {
            uniqueAddresses.add(receiver);
          }
        });

        // Process DID Logs
        didLogs.forEach((log) => {
          if (log.args.controller) {
            uniqueAddresses.add(log.args.controller);
          }
        });

        const walletList = Array.from(uniqueAddresses);
        console.log(`✅ Discovered ${walletList.length} voters`);
        setDiscoveredWallets(walletList);
      } catch (error) {
        console.error("Error discovering wallets:", error);
      } finally {
        setLoading(false);
      }
    };

    discoverWallets();
  }, [publicClient, tokenAddress, didAddress]); // Removed 'discoverWallets' from dependency array to prevent loops

  return { discoveredWallets, loading };
};
