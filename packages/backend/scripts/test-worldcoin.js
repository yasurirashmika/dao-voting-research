/**
 * Worldcoin API Test Script
 * Run this to test your Worldcoin configuration
 * Usage: node test-worldcoin.js
 */

require("dotenv").config();

const WORLDCOIN_APP_ID = process.env.WORLDCOIN_APP_ID;
const WORLDCOIN_ACTION = process.env.WORLDCOIN_ACTION || "dao_vote";

// Example proof from your logs (replace with your actual proof)
const testProof = {
  nullifier_hash: "0x088a0ebc11c01e5cda71877959f9e398dbd9a5d4fccedc398e5a9cfc5495a75c",
  merkle_root: "0x0734ce6b3d96c97c5443ef08d7433aa0cf2d1b6e8f3ef2bb48f8576a45266739",
  proof: "0x2ccf03c8def05525beac95c54a0ea787735495af4ff0c569df844219eb2bef260de284e28c978b1dc93fc996fdb7137ee3e4643f10055e0e81c8fd86d08687360236863999d2fa0548b2eb6325149c07f71d481b2a9f3e9e87670b18d1d051cb0b7470b5a2153801479559b78f93a69f6f856f6ad987834c43d08df3cc25007428a70bbd3f9cd5e4629a6bab4c0198d96f925c41b1405422cd9fc24d8a30c350056982e429aa0bad4315d87c6caa1ef98220b379aa506e457d2cb985f946a9a50c8e6e202e99fae24913295a7fc6cff2f3909a2a266a2512d9ac47c5a2ac12a4225873978cbcdb21585e4a77b60dd0993ec212a19ef8a897fc0f23121a69bd49",
  verification_level: "device",
};

const testSignal = "0xced1b0307491a0d67a2b3c6ffa44a8ef1e57e0d2";

async function testWorldcoinVerification() {
  console.log("🧪 Testing Worldcoin API Configuration");
  console.log("=====================================\n");
  
  console.log("📋 Configuration:");
  console.log(`   App ID: ${WORLDCOIN_APP_ID}`);
  console.log(`   Action: ${WORLDCOIN_ACTION}`);
  console.log(`   Signal: ${testSignal}`);
  console.log(`   Verification Level: ${testProof.verification_level}\n`);

  const endpoint = `https://developer.worldcoin.org/api/v2/verify/${WORLDCOIN_APP_ID}`;
  
  const payload = {
    nullifier_hash: testProof.nullifier_hash,
    merkle_root: testProof.merkle_root,
    proof: testProof.proof,
    verification_level: testProof.verification_level,
    action: WORLDCOIN_ACTION,
    signal: testSignal,
  };

  console.log("📤 Sending request to Worldcoin API...\n");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log(`📥 Response Status: ${response.status}`);
    console.log(`📥 Response Body:`);
    console.log(JSON.stringify(data, null, 2));
    console.log("");

    if (response.ok && data.success) {
      console.log("✅ SUCCESS: Worldcoin verification passed!");
      console.log("\n✅ Your configuration is correct!");
      console.log("✅ The issue might be with how the proof is being generated.");
    } else {
      console.log("❌ FAILED: Worldcoin verification failed");
      console.log("\n🔍 Troubleshooting Steps:");
      
      if (data.code === "invalid_proof") {
        console.log("   1. The proof is invalid. This usually means:");
        console.log("      - Signal mismatch: The signal used to generate the proof doesn't match");
        console.log("      - Action mismatch: The action in the Developer Portal doesn't match");
        console.log("      - Proof was generated for a different app_id");
        console.log("      - Using simulator in staging mode with production app");
      }
      
      if (data.code === "invalid_merkle_root") {
        console.log("   1. The merkle root is not recognized");
        console.log("      - This usually happens in staging/simulator mode");
        console.log("      - Make sure you're using a staging app");
      }
      
      console.log("\n💡 Recommendations:");
      console.log("   1. Check your Worldcoin Developer Portal:");
      console.log(`      https://developer.worldcoin.org/apps/${WORLDCOIN_APP_ID}`);
      console.log("   2. Verify the action name matches exactly");
      console.log("   3. Make sure you're using the correct environment (staging/production)");
      console.log("   4. Try generating a fresh proof with the Worldcoin Simulator");
    }
  } catch (error) {
    console.error("❌ Network Error:", error.message);
    console.log("\n🔍 This might be a network connectivity issue.");
  }
}

// Run the test
testWorldcoinVerification();