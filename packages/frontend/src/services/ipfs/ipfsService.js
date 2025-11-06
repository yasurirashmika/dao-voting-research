import ENV from '../../config/environment';

const PINATA_API_URL = 'https://api.pinata.cloud';

/**
 * Upload JSON to IPFS via Pinata
 */
export const uploadJSONToIPFS = async (jsonData) => {
  try {
    const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': ENV.PINATA_API_KEY,
        'pinata_secret_api_key': ENV.PINATA_SECRET_KEY
      },
      body: JSON.stringify(jsonData)
    });

    if (!response.ok) {
      throw new Error('Failed to upload to IPFS');
    }

    const data = await response.json();
    return data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};

/**
 * Fetch data from IPFS
 */
export const fetchFromIPFS = async (hash) => {
  try {
    const response = await fetch(`${ENV.IPFS_GATEWAY}${hash}`);
    if (!response.ok) {
      throw new Error('Failed to fetch from IPFS');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw error;
  }
};

/**
 * Get IPFS URL
 */
export const getIPFSUrl = (hash) => {
  return `${ENV.IPFS_GATEWAY}${hash}`;
};

export default {
  uploadJSONToIPFS,
  fetchFromIPFS,
  getIPFSUrl
};
