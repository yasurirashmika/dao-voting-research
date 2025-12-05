import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home/Home";
import Proposals from "../pages/Proposals/Proposals";
import ProposalDetails from "../pages/ProposalDetails/ProposalDetails";
import CreateProposalPage from "../pages/CreateProposalPage/CreateProposalPage";
import Dashboard from "../pages/Dashboard/Dashboard";
import Admin from "../pages/Admin/Admin";
import NotFound from "../pages/NotFound/NotFound";
import ProtectedRoute from "./ProtectedRoute";
import Register from '../pages/Register/Register';

const AppRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/proposals" element={<Proposals />} />
      <Route path="/proposals/:id" element={<ProposalDetails />} />

      {/* Protected Routes - Require Wallet Connection */}
      <Route
        path="/create-proposal"
        element={
          <ProtectedRoute>
            <CreateProposalPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin Route - Protected */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRouter;