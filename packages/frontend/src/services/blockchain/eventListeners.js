/**
 * Setup contract event listeners
 */
export const setupContractListeners = (contract, eventHandlers) => {
  if (!contract || !eventHandlers) return;

  Object.keys(eventHandlers).forEach(eventName => {
    const handler = eventHandlers[eventName];
    contract.on(eventName, handler);
  });
};

/**
 * Remove contract event listeners
 */
export const removeContractListeners = (contract, eventHandlers) => {
  if (!contract || !eventHandlers) return;

  Object.keys(eventHandlers).forEach(eventName => {
    const handler = eventHandlers[eventName];
    contract.off(eventName, handler);
  });
};

/**
 * Listen for ProposalCreated event
 */
export const listenForProposalCreated = (contract, callback) => {
  if (!contract) return;

  const filter = contract.filters.ProposalCreated();
  
  contract.on(filter, (proposalId, proposer, targets, values, signatures, calldatas, startBlock, endBlock, description, event) => {
    callback({
      proposalId: proposalId.toString(),
      proposer,
      targets,
      values,
      signatures,
      calldatas,
      startBlock: startBlock.toNumber(),
      endBlock: endBlock.toNumber(),
      description,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber
    });
  });
};

/**
 * Listen for VoteCast event
 */
export const listenForVoteCast = (contract, callback) => {
  if (!contract) return;

  const filter = contract.filters.VoteCast();
  
  contract.on(filter, (voter, proposalId, support, weight, reason, event) => {
    callback({
      voter,
      proposalId: proposalId.toString(),
      support,
      weight: weight.toString(),
      reason,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber
    });
  });
};

/**
 * Listen for ProposalExecuted event
 */
export const listenForProposalExecuted = (contract, callback) => {
  if (!contract) return;

  const filter = contract.filters.ProposalExecuted();
  
  contract.on(filter, (proposalId, event) => {
    callback({
      proposalId: proposalId.toString(),
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber
    });
  });
};

/**
 * Query past events
 */
export const queryPastEvents = async (contract, eventName, fromBlock = 0, toBlock = 'latest') => {
  try {
    const filter = contract.filters[eventName]();
    const events = await contract.queryFilter(filter, fromBlock, toBlock);
    return events;
  } catch (error) {
    console.error('Error querying past events:', error);
    return [];
  }
};

/**
 * Setup account change listener
 */
export const setupAccountChangeListener = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', callback);
  }
};

/**
 * Setup chain change listener
 */
export const setupChainChangeListener = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('chainChanged', callback);
  }
};

/**
 * Remove wallet event listeners
 */
export const removeWalletListeners = () => {
  if (window.ethereum) {
    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
  }
};

export default {
  setupContractListeners,
  removeContractListeners,
  listenForProposalCreated,
  listenForVoteCast,
  listenForProposalExecuted,
  queryPastEvents,
  setupAccountChangeListener,
  setupChainChangeListener,
  removeWalletListeners
};
