require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const { createClient } = require("redis");

const app = express();

// --- REDIS CLIENT ---
const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (err) => console.error("[REDIS ERROR]", err));
redis.connect().then(() => console.log("[REDIS] Connected successfully."));

// Helper functions to handle JSON serialization
const redisGet = async (key) => {
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
};
const redisSet = async (key, value) => {
  await redis.set(key, JSON.stringify(value));
};
const redisDel = async (key) => {
  await redis.del(key);
};

// --- CORS HEADERS ---
const allowedOrigins = [
  "http://localhost:3000",
  "https://daovoting.netlify.app",
  ...(process.env.ALLOWED_ORIGINS?.split(",") || []),
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Content-Type, Authorization, Accept",
  );
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "10kb" }));

// --- SIMPLE RATE LIMITING (In-Memory) ---
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_REQUESTS = 10;

function simpleRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestCounts.has(ip)) requestCounts.set(ip, []);

  const recentRequests = requestCounts
    .get(ip)
    .filter((time) => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS) {
    return res
      .status(429)
      .json({
        success: false,
        error: "Too many requests, please try again later",
      });
  }

  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  next();
}

app.use("/issue-credential", simpleRateLimit);
app.use("/pre-check", simpleRateLimit);

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3001;
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const WORLDCOIN_APP_ID = process.env.WORLDCOIN_APP_ID;
const WORLDCOIN_ACTION = process.env.WORLDCOIN_ACTION || "dao_vote";
const WORLDCOIN_TIMEOUT = 30000;

const DEV_MODE_SKIP_WORLDCOIN = process.env.DEV_MODE_SKIP_WORLDCOIN === "true";

if (DEV_MODE_SKIP_WORLDCOIN) {
  console.warn("WARNING: Worldcoin verification is DISABLED (DEV MODE)");
  console.warn("This should NEVER be used in production!");
}

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
  provider,
);

// --- DID REGISTRY CONTRACT ---
const DID_REGISTRY_ADDRESS = process.env.DID_REGISTRY_ADDRESS;
const DID_REGISTRY_ABI = [
  "function hasRegisteredForVoting(address) view returns (bool)",
];
const didRegistryContract = new ethers.Contract(
  DID_REGISTRY_ADDRESS,
  DID_REGISTRY_ABI,
  provider,
);

// --- IN-MEMORY LOCKS ---
const registrationLocks = new Map();

console.log("------------------------------------------------");
console.log("Proof-of-Personhood Identity Issuer Started");
console.log(`Issuer Address: ${wallet.address}`);
console.log(`Worldcoin App: ${WORLDCOIN_APP_ID}`);
console.log(`Token Gate: ${GOVERNANCE_TOKEN_ADDRESS}`);
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
// Worldcoin Verification (MOCKED FOR ACADEMIC DEMO)
// =====================================================
async function verifyWorldcoinProof(proof, signal) {
  console.log("\n[MOCK API] Intercepting Worldcoin verification request...");
  console.log(
    "[MOCK API] Validating proof format and nullifier hash locally...",
  );

  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log("[MOCK API] Local cryptographic validation passed.");
  return { success: true };
}

// =====================================================
// PRE-CHECK ENDPOINT
// =====================================================
app.post("/pre-check", async (req, res) => {
  try {
    const { userAddress } = req.body;

    if (!userAddress || !isValidEthereumAddress(userAddress)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Ethereum address" });
    }

    console.log(`\n[PRE-CHECK] Starting pre-check for: ${userAddress}`);

    // CHECK 1: Already registered on-chain?
    try {
      const alreadyRegistered =
        await didRegistryContract.hasRegisteredForVoting(userAddress);
      if (alreadyRegistered) {
        console.log(`[PRE-CHECK] Failed: Wallet already registered on-chain.`);
        return res
          .status(403)
          .json({
            success: false,
            error: "This wallet is already registered for voting.",
          });
      }
    } catch (err) {
      console.error("DID registry check failed:", err.message);
    }

    // CHECK 2: Already registered in Redis?
    const existingNullifier = await redisGet(
      `wallet:${userAddress.toLowerCase()}`,
    );
    if (existingNullifier) {
      const existing = await redisGet(`nullifier:${existingNullifier}`);
      if (existing && existing.status === "complete") {
        console.log(
          `[PRE-CHECK] Failed: Wallet already marked complete in Redis.`,
        );
        return res
          .status(403)
          .json({
            success: false,
            error: "This wallet has already completed registration.",
          });
      }
    }

    // CHECK 3: Token balance
    const balance = await tokenContract.balanceOf(userAddress);
    if (balance < MIN_TOKENS_REQUIRED) {
      console.log(
        `[PRE-CHECK] Failed: Insufficient tokens (${ethers.formatEther(
          balance,
        )}).`,
      );
      return res.status(403).json({
        success: false,
        error: `Insufficient governance tokens. You need at least ${ethers.formatEther(
          MIN_TOKENS_REQUIRED,
        )} tokens.`,
      });
    }

    console.log(`[PRE-CHECK] Passed for: ${userAddress}`);
    res.json({ success: true, message: "All checks passed." });
  } catch (err) {
    console.error("Pre-check error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// =====================================================
// MAIN ENDPOINT: ISSUE CREDENTIAL
// =====================================================
app.post("/issue-credential", async (req, res) => {
  try {
    const { userAddress, worldcoinProof } = req.body;

    const nullifierHash = worldcoinProof
      ? worldcoinProof.nullifier_hash
      : "UNKNOWN";
    const normalizedAddress = userAddress
      ? userAddress.toLowerCase()
      : "UNKNOWN";

    console.log(
      `\n==================================================================`,
    );
    console.log(`[ISSUE-CREDENTIAL] NEW REQUEST`);
    console.log(`   - Wallet: ${normalizedAddress}`);
    console.log(`   - Nullifier: ${nullifierHash}`);
    console.log(
      `==================================================================`,
    );

    if (!userAddress || !worldcoinProof) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Missing wallet address or Worldcoin proof",
        });
    }
    if (!isValidEthereumAddress(userAddress)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Ethereum address format" });
    }
    if (!isValidWorldcoinProof(worldcoinProof)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Worldcoin proof format" });
    }

    if (registrationLocks.has(nullifierHash)) {
      return res
        .status(429)
        .json({ success: false, error: "Registration already in progress" });
    }
    registrationLocks.set(nullifierHash, true);

    try {
      // --- STEP 1: CHECK REDIS FOR UNIQUENESS ---
      const existing = await redisGet(`nullifier:${nullifierHash}`);

      if (existing) {
        console.log(`[REDIS] Identity IS known to backend.`);

        if (existing.wallet !== normalizedAddress) {
          console.log(
            `[WALLET SWITCH] User trying to switch from ${existing.wallet} to ${normalizedAddress}`,
          );

          let oldWalletRegistered = false;
          try {
            oldWalletRegistered =
              await didRegistryContract.hasRegisteredForVoting(existing.wallet);
          } catch (err) {
            console.error(`[CONTRACT] Error checking old wallet.`, err.message);
          }

          if (oldWalletRegistered) {
            console.log(
              `[SYBIL BLOCK] Old wallet IS registered. Attack prevented.`,
            );
            return res.status(403).json({
              success: false,
              error:
                "Registration Blocked: Sybil prevention active. You already have a registered voting wallet.",
            });
          } else {
            console.log(
              `[WALLET SWITCH APPROVED] Old wallet was abandoned before blockchain step.`,
            );
          }
        } else {
          console.log(`[RE-ISSUE] Same wallet requesting signature again.`);
        }

        const balance = await tokenContract.balanceOf(userAddress);
        if (balance < MIN_TOKENS_REQUIRED) {
          return res.status(403).json({
            success: false,
            error: `Insufficient governance tokens (need ${ethers.formatEther(
              MIN_TOKENS_REQUIRED,
            )})`,
          });
        }

        if (existing.wallet !== normalizedAddress) {
          await redisDel(`wallet:${existing.wallet}`);
          await redisSet(`wallet:${normalizedAddress}`, nullifierHash);
        }
        await redisSet(`nullifier:${nullifierHash}`, {
          wallet: normalizedAddress,
          status: "complete",
        });

        const hash = ethers.solidityPackedKeccak256(["address"], [userAddress]);
        const signature = await wallet.signMessage(ethers.getBytes(hash));

        console.log(`[SUCCESS] Credential re-issued.`);
        return res.json({
          success: true,
          signature,
          nullifier_hash: nullifierHash,
        });
      }

      // --- BRAND NEW HUMAN ---
      console.log(`[NEW HUMAN] Identity is NOT known. Running verification...`);

      let verificationResult;
      if (DEV_MODE_SKIP_WORLDCOIN) {
        verificationResult = { success: true };
      } else {
        verificationResult = await verifyWorldcoinProof(
          worldcoinProof,
          userAddress,
        );
      }

      if (!verificationResult.success) {
        console.log(
          `[REJECTED] Verification failed: ${verificationResult.error}`,
        );
        return res.status(403).json({
          success: false,
          error: `Worldcoin verification failed: ${verificationResult.error}`,
        });
      }

      const balance = await tokenContract.balanceOf(userAddress);
      if (balance < MIN_TOKENS_REQUIRED) {
        return res.status(403).json({
          success: false,
          error: `Insufficient governance tokens (need ${ethers.formatEther(
            MIN_TOKENS_REQUIRED,
          )})`,
        });
      }

      console.log(`[SAVING] Saving new human to Redis...`);
      await redisSet(`nullifier:${nullifierHash}`, {
        wallet: normalizedAddress,
        status: "complete",
      });
      await redisSet(`wallet:${normalizedAddress}`, nullifierHash);

      const hash = ethers.solidityPackedKeccak256(["address"], [userAddress]);
      const signature = await wallet.signMessage(ethers.getBytes(hash));

      console.log(`[SUCCESS] New credential issued!`);
      res.json({ success: true, signature, nullifier_hash: nullifierHash });
    } finally {
      registrationLocks.delete(nullifierHash);
    }
  } catch (err) {
    console.error(`[FATAL ERROR]`, err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// =====================================================
// DEBUG ENDPOINT
// =====================================================
app.post("/debug-config", (req, res) => {
  const { appId, action, signal } = req.body;
  const matches = {
    appId: appId === WORLDCOIN_APP_ID,
    action: action === WORLDCOIN_ACTION,
    signalFormat: /^0x[a-fA-F0-9]{40}$/.test(signal),
  };
  res.json({
    backend: { appId: WORLDCOIN_APP_ID, action: WORLDCOIN_ACTION },
    frontend: { appId, action, signal },
    matches,
    recommendation: !matches.appId
      ? "App ID mismatch"
      : !matches.action
      ? "Action mismatch"
      : "Looks correct",
  });
});

// =====================================================
// STATUS & HEALTH
// =====================================================
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    database: "Redis Connected",
    issuerAddress: wallet.address,
    worldcoinApp: WORLDCOIN_APP_ID,
    uptime: process.uptime(),
  });
});

app.get("/health", async (req, res) => {
  try {
    await provider.getBlockNumber();
    res.json({ status: "healthy" });
  } catch (error) {
    res
      .status(503)
      .json({ status: "unhealthy", error: "Cannot connect to blockchain" });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  redis.quit();
  process.exit(0);
});

app.get("/", (req, res) => {
  res.json({
    message: "DAO Voting Backend is Live",
    status: "healthy",
    issuer: wallet.address,
  });
});

module.exports = app;

if (process.env.NODE_ENV !== "production") {
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Status endpoint: http://localhost:${PORT}/status\n`);
  });
}
