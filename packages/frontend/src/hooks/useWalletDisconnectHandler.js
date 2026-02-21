import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';

/**
 * Custom hook that handles wallet disconnection redirect
 * When user disconnects their wallet, they are redirected to the home page
 */
export const useWalletDisconnectHandler = () => {
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Track previous connection state to detect disconnection
  const prevConnectedRef = useRef(isConnected);
  
  useEffect(() => {
    // Check if wallet was previously connected and is now disconnected
    const wasConnected = prevConnectedRef.current;
    const isNowDisconnected = !isConnected && wasConnected && location.pathname !== '/';
    
    if (isNowDisconnected) {
      console.log('Wallet disconnected, redirecting to home page...');
      navigate('/', { replace: true });
    }
    
    // Update the ref for next comparison
    prevConnectedRef.current = isConnected;
  }, [isConnected, navigate, location.pathname]);
};

export default useWalletDisconnectHandler;
