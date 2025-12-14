require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3001;
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY;
const RPC_URL =
  process.env.RPC_URL || "https://sepolia.infura.io/v3/104845fd11af4611b886d2269eb925ee";

// --- 1. SETUP PROVIDER & WALLET ---
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);

// --- 2. TOKEN CONTRACT SETUP ---
// PASTE YOUR GOVERNANCE TOKEN ADDRESS HERE!
const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS;
const MIN_TOKENS_REQUIRED = ethers.parseEther("1"); // User needs at least 1 Token

// Minimal ABI to check balance
const TOKEN_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const tokenContract = new ethers.Contract(
  GOVERNANCE_TOKEN_ADDRESS,
  TOKEN_ABI,
  provider
);

// --- 3. MOCK DATABASE ---
const identityDatabase = {};

console.log("------------------------------------------------");
console.log("🏛️  Token-Gated Identity Issuer Started");
console.log(`📝 Issuer Address: ${wallet.address}`);
console.log(`💰 Token Gate: ${GOVERNANCE_TOKEN_ADDRESS}`);
console.log("------------------------------------------------");

app.post("/issue-credential", async (req, res) => {
  try {
    const { userAddress, nationalID } = req.body;

    if (!userAddress || !nationalID) {
      return res.status(400).json({ error: "Missing Address or National ID" });
    }

    console.log(
      `\n🔍 Processing: ID [${nationalID}] -> Wallet [${userAddress}]`
    );

    // --- CHECK 1: SYBIL RESISTANCE (National ID) ---
    if (
      identityDatabase[nationalID] &&
      identityDatabase[nationalID].toLowerCase() !== userAddress.toLowerCase()
    ) {
      console.log(`❌ BLOCK: Sybil Attack (ID already used)`);
      return res
        .status(403)
        .json({
          success: false,
          error: "Sybil Attack: National ID already registered.",
        });
    }

    // --- CHECK 2: STAKE REQUIREMENT (Token Balance) ---
    // This fulfills your "Adaptive Weight" promise (Token + Identity)
    try {
      const balance = await tokenContract.balanceOf(userAddress);
      console.log(`   💎 Token Balance: ${ethers.formatEther(balance)} tokens`);

      if (balance < MIN_TOKENS_REQUIRED) {
        console.log(`❌ BLOCK: Insufficient Stake`);
        return res.status(403).json({
          success: false,
          error: `Insufficient Stake: You need at least 1 Governance Token to register.`,
        });
      }
    } catch (err) {
      console.error("   ⚠️ Failed to check token balance:", err.message);
      // Optional: Fail open or closed depending on preference. Here we fail closed.
      return res
        .status(500)
        .json({ error: "Failed to verify token balance on-chain" });
    }

    // --- SUCCESS: BIND IDENTITY ---
    identityDatabase[nationalID] = userAddress;

    // --- SIGN CREDENTIAL ---
    const messageHash = ethers.solidityPackedKeccak256(
      ["address"],
      [userAddress]
    );
    const messageBytes = ethers.getBytes(messageHash);
    const signature = await wallet.signMessage(messageBytes);

    console.log(`✅ SUCCESS: Credential Issued`);

    res.json({ success: true, signature: signature });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
