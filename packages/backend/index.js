require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors()); // Allow frontend to talk to backend
app.use(express.json());

// 1. The Authority Setup (Mock Government)
// In a real app, this key would be in a secure vault.
// For the thesis, use a Hardhat account key (e.g., Account #1 or #2)
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; 
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const issuerWallet = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);

console.log("🏛️  Mock Issuer Service Started");
console.log("📝 Issuer Address:", issuerWallet.address);

// 2. The Verification Endpoint
app.post('/issue-credential', async (req, res) => {
    try {
        const { userAddress } = req.body;

        if (!userAddress) {
            return res.status(400).json({ error: "User address required" });
        }

        console.log(`🔍 Verifying user: ${userAddress}`);

        // --- SIMULATION LOGIC ---
        // In a real thesis, you'd check a database or WorldID here.
        // For now, we simulate "If address exists, they are human".
        
        // 1. Create the message hash: Keccak256(userAddress)
        // This effectively says "I certify this address is human"
        const messageHash = ethers.solidityPackedKeccak256(["address"], [userAddress]);
        const messageBytes = ethers.getBytes(messageHash);

        // 2. Sign the message
        const signature = await issuerWallet.signMessage(messageBytes);

        console.log(`✅ Credential issued for ${userAddress}`);
        
        // 3. Return the VC (Verifiable Credential)
        res.json({ 
            success: true,
            signature: signature,
            issuer: issuerWallet.address
        });

    } catch (error) {
        console.error("Error issuing credential:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});