/**
 * Zero-Knowledge Proof Utilities for Frontend
 * Client-side proof generation for private voting
 */

import { buildPoseidon } from 'circomlibjs';
const snarkjs = (typeof window !== 'undefined' && window.snarkjs) ? window.snarkjs : require('snarkjs');

let poseidonInstance = null;

/**
 * Initialize Poseidon hash function
 */
async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Generate commitment from secret
 * Commitment = hash(secret)
 */
export async function generateCommitment(secret) {
  const poseidon = await getPoseidon();
  const secretBigInt = BigInt(secret);
  const hash = poseidon.F.toString(poseidon([secretBigInt]));
  return `0x${BigInt(hash).toString(16).padStart(64, '0')}`;
}

/**
 * Generate nullifier for a vote
 * Nullifier = hash(secret, proposalId)
 */
export async function generateNullifier(secret, proposalId) {
  const poseidon = await getPoseidon();
  const secretBigInt = BigInt(secret);
  const proposalIdBigInt = BigInt(proposalId);
  
  const hash = poseidon.F.toString(poseidon([secretBigInt, proposalIdBigInt]));
  return `0x${BigInt(hash).toString(16).padStart(64, '0')}`;
}

/**
 * Build Merkle tree from commitments
 */
export async function buildMerkleTree(commitments, levels = 20) {
  const poseidon = await getPoseidon();
  
  // Convert commitments to BigInt
  let currentLevel = commitments.map(c => 
    typeof c === 'string' ? BigInt(c) : c
  );
  
  const tree = [currentLevel];

  for (let level = 0; level < levels; level++) {
    const nextLevel = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : BigInt(0);
      
      const hash = poseidon.F.toString(poseidon([left, right]));
      nextLevel.push(BigInt(hash));
    }
    
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    root: `0x${currentLevel[0].toString(16).padStart(64, '0')}`,
    tree,
    levels
  };
}

/**
 * Get Merkle proof for a specific leaf
 */
export function getMerkleProof(tree, leafIndex) {
  const pathElements = [];
  const pathIndices = [];

  let currentIndex = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    const sibling = siblingIndex < tree[level].length 
      ? tree[level][siblingIndex] 
      : BigInt(0);

    pathElements.push(sibling.toString());
    pathIndices.push(currentIndex % 2);

    currentIndex = Math.floor(currentIndex / 2);
  }

  return { pathElements, pathIndices };
}

/**
 * Generate zero-knowledge proof for voting
 * NOTE: This is a MOCK implementation for UI development
 * In production, this would use snarkjs.groth16.fullProve()
 */
export async function generateVoteProof(
  secret,
  proposalId,
  voteChoice,
  voterCommitments,
  voterIndex
) {
  console.log('🔐 Generating ZK proof...');
  console.log('  Voter index:', voterIndex);
  console.log('  Proposal ID:', proposalId);
  console.log('  Vote choice:', voteChoice);

  // Generate commitment
  const commitment = await generateCommitment(secret);
  console.log('  Commitment:', commitment);

  // Build Merkle tree
  const { root, tree } = await buildMerkleTree(voterCommitments);
  console.log('  Merkle root:', root);

  // Get Merkle proof
  const { pathElements, pathIndices } = getMerkleProof(tree, voterIndex);

  // Generate nullifier (kept for compatibility if needed)
  const computedNullifier = await generateNullifier(secret, proposalId);

  // Call snarkjs to generate the real proof using wasm and zkey
  try {
    const inputForCircuit = {
      root: root.replace(/^0x/, ''),
      proposalId: proposalId.toString(),
      voteChoice: voteChoice.toString(),
      secret: secret.toString(),
      pathElements: pathElements.map((p) => p.toString()),
      pathIndices: pathIndices.map((i) => i.toString())
    };

    // Paths served by the frontend static assets (matches ZKVotingModule.jsx)
    const wasmPath = '/circuits/vote.wasm';
    const zkeyPath = '/circuits/vote_final.zkey';

    console.log('Calling snarkjs.groth16.fullProve with input:', inputForCircuit);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputForCircuit,
      wasmPath,
      zkeyPath
    );

    // Convert the first public signal (nullifier) to a 0x-prefixed 32-byte hex string
    const nullifierFromProof = `0x${BigInt(publicSignals[0]).toString(16).padStart(64, '0')}`;

    console.log('Proof generated (real)');

    return {
      proof,
      publicSignals,
      nullifier: nullifierFromProof
    };
  } catch (err) {
    console.error('Error generating proof with snarkjs:', err);
    throw err;
  }
}

/**
 * Verify proof locally before sending to blockchain
 * NOTE: This is optional - blockchain will verify anyway
 */
export async function verifyProof(proof, publicSignals) {
  // In production, load verification key and verify with snarkjs
  // const vKey = await fetch('/verification_key.json').then(r => r.json());
  // return await snarkjs.groth16.verify(vKey, publicSignals, proof);
  
  console.log('Using mock verification');
  return true; // Mock verification
}

/**
 * Generate random secret for voter
 */
export function generateRandomSecret() {
  const array = new Uint32Array(8);
  crypto.getRandomValues(array);
  
  let secret = BigInt(0);
  for (let i = 0; i < array.length; i++) {
    secret = (secret << BigInt(32)) | BigInt(array[i]);
  }
  
  return secret.toString();
}

/**
 * Store voter secret securely (localStorage with encryption recommended)
 */
export function storeVoterSecret(walletAddress, secret) {
  const key = `voter_secret_${walletAddress}`;
  
  // WARNING: In production, encrypt this!
  localStorage.setItem(key, secret);
  
  console.warn('Secret stored in localStorage (unencrypted). Use encryption in production!');
}

/**
 * Retrieve voter secret
 */
export function getVoterSecret(walletAddress) {
  const key = `voter_secret_${walletAddress}`;
  return localStorage.getItem(key);
}

/**
 * Check if voter has secret
 */
export function hasVoterSecret(walletAddress) {
  return getVoterSecret(walletAddress) !== null;
}

/**
 * Clear voter secret (logout)
 */
export function clearVoterSecret(walletAddress) {
  const key = `voter_secret_${walletAddress}`;
  localStorage.removeItem(key);
}

export default {
  generateCommitment,
  generateNullifier,
  buildMerkleTree,
  getMerkleProof,
  generateVoteProof,
  verifyProof,
  generateRandomSecret,
  storeVoterSecret,
  getVoterSecret,
  hasVoterSecret,
  clearVoterSecret
};