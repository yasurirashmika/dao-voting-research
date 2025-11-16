import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home/Home";
import Proposals from "../pages/Proposals/Proposals";
import ProposalDetails from "../pages/ProposalDetails/ProposalDetails";
import CreateProposalPage from "../pages/CreateProposalPage/CreateProposalPage";
import Dashboard from "../pages/Dashboard/Dashboard";
import NotFound from "../pages/NotFound/NotFound";
import ProtectedRoute from "./ProtectedRoute";

const AppRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/proposals" element={<Proposals />} />
      <Route path="/proposals/:id" element={<ProposalDetails />} />

      {/* Protected Routes - Require Wallet Connection */}
      <Route path="/create-proposal" element={<CreateProposalPage />} />
      <Route path="/dashboard" element={<Dashboard />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRouter;
