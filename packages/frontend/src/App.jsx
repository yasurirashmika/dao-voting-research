import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRouter from "./routes/AppRouter";
import Layout from "./components/layout/Layout";
import { ToastProvider } from './context/ToastContext';
import "./App.css";

function App() {
  return (
    <ToastProvider>
      <Router>
        <Layout>
          <AppRouter />
        </Layout>
      </Router>
    </ToastProvider>
  );
}

export default App;
