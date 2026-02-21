import React, { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { formatAddress } from "../../../utils/formatters";
import { useContract } from "../../../hooks/useContract";
import GovernanceTokenABI from "../../../abis/GovernanceToken.json";
import "./WhaleAnalysis.css";

const WhaleAnalysis = ({ testWallets = [] }) => {
  const { address: connectedAddress } = useAccount();
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);

  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 5;

  const { contract, read } = useContract(
    "GovernanceToken",
    GovernanceTokenABI.abi
  );

  // Fetch balances (Only fetches once)
  React.useEffect(() => {
    const fetchBalances = async () => {
      if (!contract || testWallets.length === 0) {
        setLoading(false);
        return;
      }

      const newBalances = {};

      // Fetch in parallel
      await Promise.all(
        testWallets.map(async (addr) => {
          try {
            const bal = await read("balanceOf", [addr]);
            // Convert Wei to Eth format roughly for display
            newBalances[addr] = Number(bal) / 10 ** 18;
          } catch (e) {
            newBalances[addr] = 0;
          }
        })
      );

      setBalances(newBalances);
      setLoading(false);
    };

    fetchBalances();
  }, [contract, testWallets, read]);

  // Total Supply Calculation
  const totalSupply = Object.values(balances).reduce((a, b) => a + b, 0);

  // Filter & Sort Logic
  const processedList = useMemo(() => {
    return testWallets
      .filter((addr) => addr.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((addr) => ({
        address: addr,
        balance: balances[addr] || 0,
        percentage:
          totalSupply > 0 ? ((balances[addr] || 0) / totalSupply) * 100 : 0,
      }))
      .sort((a, b) => b.balance - a.balance); // Sort by highest balance
  }, [testWallets, balances, searchTerm, totalSupply]);

  // Pagination Logic
  const totalPages = Math.ceil(processedList.length / itemsPerPage);
  const paginatedList = processedList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const getBarColor = (percentage) => {
    if (percentage >= 30) return "linear-gradient(90deg, #F44336, #E91E63)";
    if (percentage >= 15) return "linear-gradient(90deg, #FF9800, #FFC107)";
    if (percentage >= 5) return "linear-gradient(90deg, #4CAF50, #8BC34A)";
    return "linear-gradient(90deg, #9E9E9E, #BDBDBD)";
  };

  if (loading)
    return <div className="whale-loading">Loading Voter Data...</div>;

  return (
    <div className="whale-analysis">
      <div className="whale-header">
        <h3 className="whale-title">
          <span className="title-icon">🐋</span>
          Governance Power Distribution
        </h3>
        <span className="total-power">
          Total: {totalSupply.toLocaleString()} Tokens
        </span>
      </div>

      {/* Search Bar */}
      <div className="whale-search">
        <input
          type="text"
          placeholder="Search address..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to page 1 on search
          }}
        />
        <span className="search-icon">🔍</span>
      </div>

      <div className="whale-list">
        {paginatedList.length > 0 ? (
          paginatedList.map((item, index) => {
            // Calculate absolute rank based on page
            const rank = (currentPage - 1) * itemsPerPage + index + 1;
            const isConnected =
              item.address.toLowerCase() === connectedAddress?.toLowerCase();

            return (
              <div
                key={item.address}
                className={`whale-item ${isConnected ? "connected" : ""}`}
              >
                <div className="whale-rank">#{rank}</div>
                <div className="whale-info">
                  <div className="whale-top">
                    <span className="whale-address">
                      {formatAddress(item.address)}
                      {isConnected && (
                        <span className="connected-badge">You</span>
                      )}
                    </span>
                    {rank <= 3 && currentPage === 1 && (
                      <span className="whale-badge">🏆 Top Holder</span>
                    )}
                  </div>
                  <div className="whale-stats">
                    <div className="stat-box">
                      <span className="label">Tokens</span>
                      <span className="value">
                        {item.balance.toLocaleString()}
                      </span>
                    </div>
                    <div className="stat-box">
                      <span className="label">Control</span>
                      <span className="value">
                        {item.percentage.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  {/* Visual Bar */}
                  <div className="power-bar-bg">
                    <div
                      className="power-bar-fill"
                      style={{
                        width: `${item.percentage}%`,
                        background: getBarColor(item.percentage),
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-results">No voters found.</div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="whale-pagination">
          <button onClick={handlePrev} disabled={currentPage === 1}>
            ←
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={handleNext} disabled={currentPage === totalPages}>
            →
          </button>
        </div>
      )}
    </div>
  );
};

export default WhaleAnalysis;
