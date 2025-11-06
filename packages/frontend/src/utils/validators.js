import { isAddress } from 'ethers';
import { REGEX_PATTERNS, MAX_VALUES } from './constants';

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} Is valid
 */
export const isValidAddress = (address) => {
  if (!address) return false;
  return isAddress(address);
};

/**
 * Validate proposal title
 * @param {string} title - Title to validate
 * @returns {object} Validation result
 */
export const validateProposalTitle = (title) => {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }
  
  if (title.length > MAX_VALUES.PROPOSAL_TITLE_LENGTH) {
    return { 
      valid: false, 
      error: `Title must be less than ${MAX_VALUES.PROPOSAL_TITLE_LENGTH} characters` 
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate proposal description
 * @param {string} description - Description to validate
 * @returns {object} Validation result
 */
export const validateProposalDescription = (description) => {
  if (!description || description.trim().length === 0) {
    return { valid: false, error: 'Description is required' };
  }
  
  if (description.length < 50) {
    return { 
      valid: false, 
      error: 'Description must be at least 50 characters' 
    };
  }
  
  if (description.length > MAX_VALUES.PROPOSAL_DESCRIPTION_LENGTH) {
    return { 
      valid: false, 
      error: `Description must be less than ${MAX_VALUES.PROPOSAL_DESCRIPTION_LENGTH} characters` 
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate vote reason
 * @param {string} reason - Reason to validate
 * @returns {object} Validation result
 */
export const validateVoteReason = (reason) => {
  if (!reason) {
    return { valid: true, error: null }; // Reason is optional
  }
  
  if (reason.length > MAX_VALUES.REASON_LENGTH) {
    return { 
      valid: false, 
      error: `Reason must be less than ${MAX_VALUES.REASON_LENGTH} characters` 
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate token amount
 * @param {string} amount - Amount to validate
 * @param {string} balance - User's balance
 * @returns {object} Validation result
 */
export const validateTokenAmount = (amount, balance) => {
  if (!amount || amount.trim() === '') {
    return { valid: false, error: 'Amount is required' };
  }
  
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: 'Invalid amount' };
  }
  
  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  if (balance && numAmount > parseFloat(balance)) {
    return { valid: false, error: 'Insufficient balance' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid
 */
export const isValidURL = (url) => {
  if (!url) return false;
  return REGEX_PATTERNS.URL.test(url);
};

/**
 * Validate transaction hash
 * @param {string} hash - Transaction hash to validate
 * @returns {boolean} Is valid
 */
export const isValidTxHash = (hash) => {
  if (!hash) return false;
  return /^0x([A-Fa-f0-9]{64})$/.test(hash);
};

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate form data
 * @param {object} formData - Form data to validate
 * @param {object} rules - Validation rules
 * @returns {object} Validation result with errors
 */
export const validateForm = (formData, rules) => {
  const errors = {};
  let isValid = true;
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field];
    
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${field} is required`;
      isValid = false;
      continue;
    }
    
    if (rule.minLength && value.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
      isValid = false;
      continue;
    }
    
    if (rule.maxLength && value.length > rule.maxLength) {
      errors[field] = `${field} must be less than ${rule.maxLength} characters`;
      isValid = false;
      continue;
    }
    
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[field] = rule.message || `${field} is invalid`;
      isValid = false;
      continue;
    }
    
    if (rule.custom) {
      const result = rule.custom(value);
      if (!result.valid) {
        errors[field] = result.error;
        isValid = false;
      }
    }
  }
  
  return { isValid, errors };
};

export default {
  isValidAddress,
  validateProposalTitle,
  validateProposalDescription,
  validateVoteReason,
  validateTokenAmount,
  isValidURL,
  isValidTxHash,
  isValidEmail,
  validateForm
};
