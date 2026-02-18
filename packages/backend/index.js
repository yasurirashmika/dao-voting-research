require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();

// --- SECURITY: CORS Configuration ---
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));

app.use(express.json({ limit: "10kb" })); // Limit payload size

// --- SIMPLE RATE LIMITING (In-Memory) ---
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10;

function simpleRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }
  
  const requests = requestCounts.get(ip);
  // Remove old requests outside the window
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: "Too many requests, please try again later"
    });
  }
  
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  next();
}

app.use("/issue-credential", simpleRateLimit);

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3001;
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const WORLDCOIN_APP_ID = process.env.WORLDCOIN_APP_ID;
const WORLDCOIN_ACTION = process.env.WORLDCOIN_ACTION || "dao_vote";
const WORLDCOIN_TIMEOUT = 30000; // 30 second timeout (Worldcoin can be slow)

// DEVELOPMENT MODE - Set to 'true' to bypass Worldcoin verification for testing
// NEVER USE IN PRODUCTION - This skips proof verification entirely
const DEV_MODE_SKIP_WORLDCOIN = process.env.DEV_MODE_SKIP_WORLDCOIN === "true";

if (DEV_MODE_SKIP_WORLDCOIN) {
  console.warn("WARNING: Worldcoin verification is DISABLED (DEV MODE)");
  console.warn("This should NEVER be used in production!");
}

// Validate required env vars
if (!ISSUER_PRIVATE_KEY || !RPC_URL || !WORLDCOIN_APP_ID) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// --- SETUP PROVIDER & WALLET ---
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);

// --- TOKEN CONTRACT ---
const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS;
const MIN_TOKENS_REQUIRED = ethers.parseEther("1");
const TOKEN_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const tokenContract = new ethers.Contract(
  GOVERNANCE_TOKEN_ADDRESS,
  TOKEN_ABI,
  provider
);

// --- IN-MEMORY HUMAN REGISTRY (PoP) ---
// TODO: Replace with persistent database (Redis/PostgreSQL) for production
const humanRegistry = new Map();
const walletToNullifier = new Map();
const registrationLocks = new Map(); // Prevent race conditions

console.log("------------------------------------------------");
console.log("🌍 Proof-of-Personhood Identity Issuer Started");
console.log(`📝 Issuer Address: ${wallet.address}`);
console.log(`🔐 Worldcoin App: ${WORLDCOIN_APP_ID}`);
console.log(`💰 Token Gate: ${GOVERNANCE_TOKEN_ADDRESS}`);
console.log("------------------------------------------------");

// =====================================================
// INPUT VALIDATION
// =====================================================
function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidWorldcoinProof(proof) {
  return (
    proof &&
    typeof proof.nullifier_hash === "string" &&
    typeof proof.merkle_root === "string" &&
    typeof proof.proof === "string" &&
    typeof proof.verification_level === "string" &&
    proof.nullifier_hash.length > 0 &&
    proof.merkle_root.length > 0 &&
    proof.proof.length > 0
  );
}

// =====================================================
// Worldcoin Verification with Enhanced Debugging
// =====================================================
async function verifyWorldcoinProof(proof, signal) {
  const endpoint = `https://developer.worldcoin.org/api/v2/verify/${WORLDCOIN_APP_ID.trim()}`;

  // Try multiple signal formats to identify the issue
  const signalVariations = [
    signal.toLowerCase(),           // 0xced1b...
    signal,                         // Original case
    signal.toLowerCase().slice(2),  // Remove 0x prefix
    signal.slice(2),               // Remove 0x prefix (original case)
  ];

  console.log("\n==================== WORLDCOIN VERIFICATION DEBUG ====================");
  console.log("Endpoint:", endpoint);
  console.log("App ID:", WORLDCOIN_APP_ID);
  console.log("Action:", WORLDCOIN_ACTION);
  console.log("Verification Level:", proof.verification_level);
  console.log("Signal Variations to Test:");
  signalVariations.forEach((v, i) => console.log(`   ${i + 1}. "${v}"`));
  console.log("======================================================================\n");

  const payload = {
    nullifier_hash: proof.nullifier_hash,
    merkle_root: proof.merkle_root,
    proof: proof.proof,
    verification_level: proof.verification_level,
    action: WORLDCOIN_ACTION,
    signal: signal.toLowerCase(), // Start with lowercase
  };

  console.log(" Sending Payload:", JSON.stringify(payload, null, 2));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WORLDCOIN_TIMEOUT);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (response.ok && data.success) {
      console.log("Worldcoin verification successful");
      return { success: true };
    } else {
      console.error("Worldcoin verification failed:");
      console.error("   Status Code:", response.status);
      console.error("   Code:", data.code);
      console.error("   Detail:", data.detail);
      console.error("   Attribute:", data.attribute);
      console.error("   Full Response:", JSON.stringify(data, null, 2));
      
      // Additional debugging hints
      if (data.code === "invalid_proof") {
        console.error("\nDEBUGGING HINTS:");
        console.error("   1. Check if frontend signal matches backend signal");
        console.error("   2. Verify action is the same on frontend and backend");
        console.error("   3. Confirm app_id matches between frontend and backend");
        console.error("   4. Ensure verification was completed successfully on frontend");
        console.error(`   5. Frontend should use signal: "${signal.toLowerCase()}"`);
      }
      
      return { success: false, error: data.detail || "Verification failed" };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Worldcoin API timeout");
      return { success: false, error: "Verification timeout" };
    }
    console.error("Network error:", error.message);
    return { success: false, error: "Network error during verification" };
  }
}

// =====================================================
// MAIN ENDPOINT: ISSUE CREDENTIAL
// =====================================================
app.post("/issue-credential", async (req, res) => {
  try {
    const { userAddress, worldcoinProof } = req.body;

    console.log("\n==================== NEW REGISTRATION REQUEST ====================");
    console.log("📥 Wallet:", userAddress);
    console.log("==================================================================\n");

    // --- VALIDATION ---
    if (!userAddress || !worldcoinProof) {
      return res.status(400).json({
        success: false,
        error: "Missing wallet address or Worldcoin proof",
      });
    }

    if (!isValidEthereumAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Ethereum address format",
      });
    }

    if (!isValidWorldcoinProof(worldcoinProof)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Worldcoin proof format",
      });
    }

    const normalizedAddress = userAddress.toLowerCase();
    const nullifierHash = worldcoinProof.nullifier_hash;

    // --- PREVENT RACE CONDITIONS ---
    if (registrationLocks.has(nullifierHash)) {
      return res.status(429).json({
        success: false,
        error: "Registration already in progress for this identity",
      });
    }

    registrationLocks.set(nullifierHash, true);

    try {
      // --- STEP 1: CHECK UNIQUENESS FIRST ---
      const existing = humanRegistry.get(nullifierHash);
      if (existing && existing.wallet !== normalizedAddress) {
        return res.status(403).json({
          success: false,
          error: "Registration Blocked: Sybil prevention active. Identity already in use.",
        });
      }

      // If already registered with same wallet, return existing credential
      if (existing && existing.wallet === normalizedAddress) {
        console.log("Wallet already registered, reissuing credential");
        const hash = ethers.solidityPackedKeccak256(["address"], [userAddress]);
        const signature = await wallet.signMessage(ethers.getBytes(hash));
        
        return res.json({
          success: true,
          signature,
          nullifier_hash: nullifierHash,
          message: "Credential reissued",
        });
      }

      // --- STEP 2: VERIFY HUMAN ---
      console.log(`Verifying humanity for: ${normalizedAddress}`);
      
      // DEV MODE: Skip Worldcoin verification if enabled
      let verificationResult;
      if (DEV_MODE_SKIP_WORLDCOIN) {
        console.warn("SKIPPING Worldcoin verification (DEV MODE)");
        verificationResult = { success: true };
      } else {
        verificationResult = await verifyWorldcoinProof(
          worldcoinProof,
          userAddress // Pass original, function normalizes internally
        );
      }

      if (!verificationResult.success) {
        return res.status(403).json({
          success: false,
          error: `Worldcoin verification failed: ${verificationResult.error}`,
        });
      }

      // --- STEP 3: TOKEN GATE ---
      console.log("Checking token balance...");
      const balance = await tokenContract.balanceOf(userAddress);
      console.log(`Token Balance: ${ethers.formatEther(balance)}`);

      if (balance < MIN_TOKENS_REQUIRED) {
        return res.status(403).json({
          success: false,
          error: `Insufficient governance tokens (need ${ethers.formatEther(MIN_TOKENS_REQUIRED)})`,
        });
      }

      // --- STEP 4: REGISTER HUMAN ---
      humanRegistry.set(nullifierHash, {
        wallet: normalizedAddress,
        registeredAt: new Date().toISOString(),
      });

      walletToNullifier.set(normalizedAddress, nullifierHash);

      console.log(" Human registered successfully");

      // --- STEP 5: SIGN CREDENTIAL ---
      const hash = ethers.solidityPackedKeccak256(["address"], [userAddress]);
      const signature = await wallet.signMessage(ethers.getBytes(hash));

      console.log("Credential issued successfully\n");

      res.json({
        success: true,
        signature,
        nullifier_hash: nullifierHash,
      });
    } finally {
      // Always release lock
      registrationLocks.delete(nullifierHash);
    }
  } catch (err) {
    console.error("Issuer error:", err);
    
    // Don't expose internal errors to client
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// =====================================================
// DEBUG ENDPOINT - Check Configuration Match
// =====================================================
app.post("/debug-config", (req, res) => {
  const { appId, action, signal } = req.body;
  
  const matches = {
    appId: appId === WORLDCOIN_APP_ID,
    action: action === WORLDCOIN_ACTION,
    signalFormat: /^0x[a-fA-F0-9]{40}$/.test(signal),
  };
  
  res.json({
    backend: {
      appId: WORLDCOIN_APP_ID,
      action: WORLDCOIN_ACTION,
    },
    frontend: {
      appId,
      action,
      signal,
    },
    matches,
    recommendation: !matches.appId 
      ? "App ID mismatch - check your .env file"
      : !matches.action
      ? "Action mismatch - frontend and backend must use same action"
      : !matches.signalFormat
      ? "Signal format invalid - should be Ethereum address"
      : "Configuration looks correct",
  });
});

// =====================================================
// STATUS ENDPOINT
// =====================================================
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    registeredHumans: humanRegistry.size,
    issuerAddress: wallet.address,
    worldcoinApp: WORLDCOIN_APP_ID,
    uptime: process.uptime(),
  });
});

// =====================================================
// HEALTH CHECK
// =====================================================
app.get("/health", async (req, res) => {
  try {
    // Check if we can connect to blockchain
    await provider.getBlockNumber();
    res.json({ status: "healthy" });
  } catch (error) {
    res.status(503).json({ status: "unhealthy", error: "Cannot connect to blockchain" });
  }
});

// =====================================================
// ERROR HANDLING
// =====================================================
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/status\n`);
});