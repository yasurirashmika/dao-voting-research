// Environment configuration
export const ENV = {
  WALLETCONNECT_PROJECT_ID: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'bb12a9390f7afd6748d4e48963e83782',
  CHAIN_ID: parseInt(process.env.REACT_APP_CHAIN_ID || '11155111'),
  RPC_URL: process.env.REACT_APP_RPC_URL || '',
  API_URL: process.env.REACT_APP_API_URL || '',
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
  IPFS_GATEWAY: process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  PINATA_API_KEY: process.env.REACT_APP_PINATA_API_KEY || '',
  PINATA_SECRET_KEY: process.env.REACT_APP_PINATA_SECRET_KEY || ''
};

export const isDevelopment = ENV.ENVIRONMENT === 'development';
export const isProduction = ENV.ENVIRONMENT === 'production';

export default ENV;
