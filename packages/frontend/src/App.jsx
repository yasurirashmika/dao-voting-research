import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRouter from "./routes/AppRouter";
import Layout from "./components/layout/Layout";
import { ToastProvider } from './context/ToastContext';
import { useWalletDisconnectHandler } from './hooks/useWalletDisconnectHandler';
import "./App.css";

// Component to handle wallet disconnection
const WalletDisconnectHandler = () => {
  useWalletDisconnectHandler();
  return null;
};

function App() {
  return (
    <ToastProvider>
      <Router>
        <WalletDisconnectHandler />
        <Layout>
          <AppRouter />
        </Layout>
      </Router>
    </ToastProvider>
  );
}

export default App;
