import { formatUnits, parseUnits } from 'ethers';

/**
 * Format Ethereum address (shorten)
 * @param {string} address - Ethereum address
 * @param {number} chars - Number of characters to show on each side
 * @returns {string} Formatted address
 */
export const formatAddress = (address, chars = 4) => {
  if (!address) return '';
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
};

/**
 * Format token amount from wei
 * @param {string|number} amount - Amount in wei
 * @param {number} decimals - Token decimals
 * @param {number} displayDecimals - Decimals to display
 * @returns {string} Formatted amount
 */
export const formatTokenAmount = (amount, decimals = 18, displayDecimals = 4) => {
  if (!amount) return '0';
  try {
    const formatted = formatUnits(amount, decimals);
    const number = parseFloat(formatted);
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayDecimals
    });
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
};

/**
 * ✅ ADDED: Standard number formatter with commas
 * @param {number|string} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-US');
};

/**
 * Format large numbers with abbreviations (K, M, B)
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatLargeNumber = (num) => {
  if (!num) return '0';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  } else if (absNum >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  } else if (absNum >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  }
  
  return num.toLocaleString('en-US');
};

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {number} total - Total value
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, total, decimals = 2) => {
  if (!total || total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Format date/time
 * @param {number|Date} timestamp - Unix timestamp or Date object
 * @param {string} format - Format type ('short', 'long', 'relative')
 * @returns {string} Formatted date
 */
export const formatDate = (timestamp, format = 'short') => {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp * 1000) 
    : new Date(timestamp);
  
  if (format === 'relative') {
    return formatRelativeTime(date);
  }
  
  const options = format === 'long'
    ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date} date - Date object
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  
  return formatDate(date, 'short');
};

/**
 * Format duration (from seconds)
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && days === 0) parts.push(`${secs}s`);
  
  return parts.join(' ') || '0s';
};

/**
 * Format transaction hash
 * @param {string} hash - Transaction hash
 * @returns {string} Formatted hash
 */
export const formatTxHash = (hash) => {
  return formatAddress(hash, 6);
};

/**
 * Format USD amount
 * @param {number} amount - Amount in USD
 * @returns {string} Formatted USD
 */
export const formatUSD = (amount) => {
  if (!amount) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

/**
 * Parse token amount to wei
 * @param {string} amount - Amount to parse
 * @param {number} decimals - Token decimals
 * @returns {string} Amount in wei
 */
export const parseTokenAmount = (amount, decimals = 18) => {
  try {
    return parseUnits(amount.toString(), decimals).toString();
  } catch (error) {
    console.error('Error parsing token amount:', error);
    return '0';
  }
};

export default {
  formatAddress,
  formatTokenAmount,
  formatNumber, // ✅ Added to default export
  formatLargeNumber,
  formatPercentage,
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatTxHash,
  formatUSD,
  parseTokenAmount
};