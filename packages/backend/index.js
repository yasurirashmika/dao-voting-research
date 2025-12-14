require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3001;
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || "https://sepolia.infura.io/v3/104845fd11af4611b886d2269eb925ee";
const WORLDCOIN_APP_ID = process.env.WORLDCOIN_APP_ID;
const WORLDCOIN_ACTION = process.env.WORLDCOIN_ACTION || "dao-voter-registration";
const WORLDCOIN_API_URL = process.env.WORLDCOIN_API_URL || "https://developer.worldcoin.org/api/v2/verify";

// --- SETUP PROVIDER & WALLET ---
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);

// --- TOKEN CONTRACT ---
const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS;
const MIN_TOKENS_REQUIRED = ethers.parseEther("1");
const TOKEN_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const tokenContract = new ethers.Contract(GOVERNANCE_TOKEN_ADDRESS, TOKEN_ABI, provider);

// --- DATABASE: HUMAN REGISTRY ---
// ✅ KEY CHANGE: Track humans by nullifier_hash (not nationalID)
const humanRegistry = new Map(); // nullifier_hash -> { wallet, registeredAt }
const walletToNullifier = new Map(); // wallet -> nullifier_hash (for lookups)

console.log("------------------------------------------------");
console.log("🌍 Proof-of-Personhood Identity Issuer Started");
console.log(`📝 Issuer Address: ${wallet.address}`);
console.log(`🔐 Worldcoin App: ${WORLDCOIN_APP_ID}`);
console.log(`💰 Token Gate: ${GOVERNANCE_TOKEN_ADDRESS}`);
console.log("------------------------------------------------");

// ✅ HELPER: Verify Worldcoin Proof
async function verifyWorldcoinProof(proof, signal) {
  try {
    const response = await axios.post(WORLDCOIN_API_URL, {
      nullifier_hash: proof.nullifier_hash,
      merkle_root: proof.merkle_root,
      proof: proof.proof,
      verification_level: proof.verification_level,
      action: WORLDCOIN_ACTION,
      signal: signal,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data.success === true;
  } catch (error) {
    console.error("❌ Worldcoin API Error:", error.response?.data || error.message);
    return false;
  }
}

// ✅ MAIN ENDPOINT: Issue Credential with PoP
app.post("/issue-credential", async (req, res) => {
  try {
    const { userAddress, worldcoinProof } = req.body;

    // --- VALIDATION ---
    if (!userAddress) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing wallet address" 
      });
    }

    if (!worldcoinProof || !worldcoinProof.nullifier_hash) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing Worldcoin proof. Please verify your identity with Worldcoin first." 
      });
    }

    console.log(`\n🔍 Processing Registration for: ${userAddress}`);
    console.log(`   🌍 Nullifier: ${worldcoinProof.nullifier_hash.substring(0, 16)}...`);

    // --- STEP 1: VERIFY PROOF OF PERSONHOOD ---
    console.log("   🔐 Verifying Worldcoin Proof...");
    const isValidHuman = await verifyWorldcoinProof(worldcoinProof, userAddress);
    
    if (!isValidHuman) {
      console.log("❌ BLOCKED: Invalid Worldcoin Proof");
      return res.status(403).json({
        success: false,
        error: "Worldcoin verification failed. Please try again or contact support.",
      });
    }
    console.log("   ✅ Worldcoin: Valid Human");

    // --- STEP 2: CHECK IF THIS HUMAN ALREADY REGISTERED (SYBIL RESISTANCE) ---
    const existingRegistration = humanRegistry.get(worldcoinProof.nullifier_hash);
    
    if (existingRegistration) {
      const existingWallet = existingRegistration.wallet;
      
      // Same wallet re-registering? Allow (idempotent)
      if (existingWallet.toLowerCase() === userAddress.toLowerCase()) {
        console.log("   ℹ️  Same wallet re-registering (idempotent)");
      } else {
        // Different wallet = SYBIL ATTACK
        console.log(`❌ BLOCKED: Sybil Attack Detected`);
        console.log(`   This human already registered with wallet: ${existingWallet}`);
        return res.status(403).json({
          success: false,
          error: "This identity is already registered with another wallet. One person = one vote.",
        });
      }
    }

    // --- STEP 3: CHECK TOKEN BALANCE (OPTIONAL STAKE REQUIREMENT) ---
    try {
      const balance = await tokenContract.balanceOf(userAddress);
      console.log(`   💎 Token Balance: ${ethers.formatEther(balance)} GOV`);

      if (balance < MIN_TOKENS_REQUIRED) {
        console.log(`❌ BLOCKED: Insufficient Stake`);
        return res.status(403).json({
          success: false,
          error: `Insufficient Stake: You need at least 1 Governance Token to register.`,
        });
      }
    } catch (err) {
      console.error("   ⚠️ Failed to check token balance:", err.message);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to verify token balance on-chain" 
      });
    }

    // --- STEP 4: REGISTER HUMAN → WALLET BINDING ---
    humanRegistry.set(worldcoinProof.nullifier_hash, {
      wallet: userAddress,
      registeredAt: new Date().toISOString(),
    });
    walletToNullifier.set(userAddress.toLowerCase(), worldcoinProof.nullifier_hash);

    console.log(`   💾 Registered: Human → Wallet binding saved`);

    // --- STEP 5: SIGN CREDENTIAL FOR BLOCKCHAIN ---
    const messageHash = ethers.solidityPackedKeccak256(["address"], [userAddress]);
    const messageBytes = ethers.getBytes(messageHash);
    const signature = await wallet.signMessage(messageBytes);

    console.log(`✅ SUCCESS: Credential Issued`);
    console.log(`   Total Registered Humans: ${humanRegistry.size}`);

    res.json({ 
      success: true, 
      signature: signature,
      nullifier_hash: worldcoinProof.nullifier_hash, // Send back for frontend confirmation
    });

  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Internal Server Error" 
    });
  }
});

// ✅ NEW: Status Endpoint (for debugging)
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    registeredHumans: humanRegistry.size,
    issuerAddress: wallet.address,
    worldcoinApp: WORLDCOIN_APP_ID,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Status: http://localhost:${PORT}/status\n`);
});