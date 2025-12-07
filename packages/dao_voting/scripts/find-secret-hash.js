const { ethers } = require("ethers");

const SECRET_STRING = "Yasuri";
const EXPECTED_COMMITMENT = "0x222e9730f1f04a7ef718ae8d1d411baa22c36e98e233ab0109d0be0deec935d1";

console.log("Testing different hash methods for:", SECRET_STRING);
console.log("Expected commitment:", EXPECTED_COMMITMENT);
console.log("");

// Method 1: Current script method
const stringToNumber = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};
const method1Number = stringToNumber(SECRET_STRING);
const method1Commitment = ethers.keccak256(ethers.toBeHex(method1Number, 32));
console.log("Method 1 (current script):");
console.log("  Number:", method1Number);
console.log("  Commitment:", method1Commitment);
console.log("  Match:", method1Commitment.toLowerCase() === EXPECTED_COMMITMENT.toLowerCase() ? "✅" : "❌");
console.log("");

// Method 2: Direct keccak256 of string
const method2Commitment = ethers.keccak256(ethers.toUtf8Bytes(SECRET_STRING));
console.log("Method 2 (direct string hash):");
console.log("  Commitment:", method2Commitment);
console.log("  Match:", method2Commitment.toLowerCase() === EXPECTED_COMMITMENT.toLowerCase() ? "✅" : "❌");
console.log("");

// Method 3: Hash of string as hex
const method3Commitment = ethers.keccak256(ethers.hexlify(ethers.toUtf8Bytes(SECRET_STRING)));
console.log("Method 3 (hex string hash):");
console.log("  Commitment:", method3Commitment);
console.log("  Match:", method3Commitment.toLowerCase() === EXPECTED_COMMITMENT.toLowerCase() ? "✅" : "❌");
console.log("");

// Method 4: Poseidon hash (if circomlibjs was used)
const buildPoseidon = require("circomlibjs").buildPoseidon;
(async () => {
  const poseidon = await buildPoseidon();
  const method4Hash = poseidon.F.toString(poseidon([method1Number]));
  const method4Commitment = ethers.keccak256(ethers.toBeHex(BigInt(method4Hash), 32));
  console.log("Method 4 (Poseidon + Keccak):");
  console.log("  Poseidon hash:", method4Hash);
  console.log("  Commitment:", method4Commitment);
  console.log("  Match:", method4Commitment.toLowerCase() === EXPECTED_COMMITMENT.toLowerCase() ? "✅" : "❌");
  console.log("");

  // Method 5: Direct Poseidon of string bytes
  const strBytes = Buffer.from(SECRET_STRING, 'utf8');
  const byteArray = Array.from(strBytes);
  const method5Hash = poseidon.F.toString(poseidon(byteArray));
  const method5Commitment = ethers.keccak256(ethers.toBeHex(BigInt(method5Hash), 32));
  console.log("Method 5 (Poseidon of bytes + Keccak):");
  console.log("  Poseidon hash:", method5Hash);
  console.log("  Commitment:", method5Commitment);
  console.log("  Match:", method5Commitment.toLowerCase() === EXPECTED_COMMITMENT.toLowerCase() ? "✅" : "❌");
})();