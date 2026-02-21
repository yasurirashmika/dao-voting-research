/* src/pages/CreateProposal/CreateProposalPage.jsx */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useProposals } from "../../hooks/useProposals";
import Card from "../../components/common/Card/Card";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import Modal from "../../components/common/Modal/Modal";
import {
  validateProposalTitle,
  validateProposalDescription,
} from "../../utils/validators";
import { MAX_VALUES } from "../../utils/constants";
import "./CreateProposalPage.css";

const CreateProposalPage = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();

  const { createProposal, refreshProposals } = useProposals();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    minTokensRequired: "0",
    minReputationRequired: "0",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  const showModal = (type, title, message) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (modalState.type === "success") {
      navigate("/proposals");
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const titleValidation = validateProposalTitle(formData.title);
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error;
    }

    const descriptionValidation = validateProposalDescription(
      formData.description
    );
    if (!descriptionValidation.valid) {
      newErrors.description = descriptionValidation.error;
    }

    const minTokens = parseInt(formData.minTokensRequired);
    if (isNaN(minTokens) || minTokens < 0) {
      newErrors.minTokensRequired = "Must be a valid non-negative number";
    }

    const minRep = parseInt(formData.minReputationRequired);
    if (isNaN(minRep) || minRep < 0 || minRep > 1000) {
      newErrors.minReputationRequired = "Must be between 0 and 1000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      showModal(
        "error",
        "Wallet Not Connected",
        "Please connect your wallet to create a proposal."
      );
      return;
    }

    if (!validateForm()) {
      showModal(
        "error",
        "Validation Error",
        "Please fix the errors highlighted in the form."
      );
      return;
    }

    setLoading(true);

    try {
      await createProposal(
        formData.title,
        formData.description,
        formData.minTokensRequired,
        formData.minReputationRequired
      );

      console.log("🔄 Refreshing proposals list...");
      refreshProposals();

      showModal(
        "success",
        "Proposal Created!",
        "Your proposal has been submitted successfully."
      );
    } catch (error) {
      console.error("Error creating proposal:", error);

      let errorMessage = "Failed to create proposal. Please try again.";

      if (error.message?.includes("Only registered voters")) {
        errorMessage =
          "Access Denied: Only registered voters can create proposals. Please register in the Admin panel or contact a DAO member.";
      } else if (error.message?.includes("Insufficient tokens")) {
        errorMessage =
          "Insufficient Balance: You need 1,000 Governance Tokens to create a proposal.";
      } else if (
        error.message?.includes("User denied") ||
        error.message?.includes("user rejected")
      ) {
        errorMessage = "Transaction cancelled in MetaMask.";
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error.reason) {
        errorMessage = error.reason;
      }

      showModal("error", "Creation Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const characterCount = {
    title: formData.title.length,
    description: formData.description.length,
  };

  return (
    <div className="create-proposal-page">
      {/* Hero Section */}
      <div className="create-proposal-hero">
        <div className="hero-content">
          <button className="back-button" onClick={() => navigate("/proposals")}>
            <span className="back-icon">←</span>
            Back to Proposals
          </button>
          <div className="hero-text">
            <h1 className="page-title">
              <span className="title-icon">📝</span>
              Create New Proposal
            </h1>
            <p className="page-subtitle">
              Submit a proposal for the DAO to vote on. Your idea could shape the future of the organization.
            </p>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </div>

      <div className="create-proposal-content">
        {/* Main Form */}
        <Card padding="large" className="create-proposal-form-card">
          <div className="form-header">
            <h2 className="form-title">Proposal Details</h2>
            <p className="form-subtitle">Fill in the information about your proposal</p>
          </div>

          <form onSubmit={handleSubmit} className="create-proposal-form">
            {/* Title */}
            <div className="form-section">
              <div className="input-header">
                <label className="form-label">
                  <span className="label-icon">📋</span>
                  Proposal Title
                </label>
                <span className="char-count">
                  {characterCount.title}/{MAX_VALUES.PROPOSAL_TITLE_LENGTH}
                </span>
              </div>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter a clear, descriptive title for your proposal..."
                error={errors.title}
                required
                fullWidth
              />
            </div>

            {/* Description */}
            <div className="form-section">
              <div className="input-header">
                <label className="form-label">
                  <span className="label-icon">📄</span>
                  Description
                </label>
                <span className="char-count">
                  {characterCount.description}/{MAX_VALUES.PROPOSAL_DESCRIPTION_LENGTH}
                </span>
              </div>
              <textarea
                className="description-input"
                style={{
                  backgroundColor: 'var(--color-background-secondary)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border)'
                }}
                rows={10}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder={`Describe your proposal in detail:

• What problem does this solve?
• What are the expected outcomes?
• What resources are needed?
• What is the timeline?`}
              />
              {errors.description && (
                <span className="error-text">{errors.description}</span>
              )}
            </div>

            {/* Voting Requirements Section */}
            <div className="requirements-section">
              <div className="section-header">
                <h3 className="section-subtitle">
                  <span className="section-icon">⚙️</span>
                  Voting Requirements
                </h3>
                <p className="section-description">
                  Set minimum requirements for voters to participate in this proposal
                </p>
              </div>

              <div className="requirements-grid">
                <div className="requirement-card">
                  <div className="requirement-header">
                    <span className="requirement-icon">🪙</span>
                    <span className="requirement-label">Minimum Tokens</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={formData.minTokensRequired}
                    onChange={(e) =>
                      handleChange("minTokensRequired", e.target.value)
                    }
                    placeholder="0"
                    error={errors.minTokensRequired}
                    fullWidth
                  />
                  <span className="requirement-hint">
                    Minimum governance tokens needed to vote
                  </span>
                </div>

                <div className="requirement-card">
                  <div className="requirement-header">
                    <span className="requirement-icon">⭐</span>
                    <span className="requirement-label">Minimum Reputation</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.minReputationRequired}
                    onChange={(e) =>
                      handleChange("minReputationRequired", e.target.value)
                    }
                    placeholder="0"
                    error={errors.minReputationRequired}
                    fullWidth
                  />
                  <span className="requirement-hint">
                    Minimum reputation score (0-1000)
                  </span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="info-box-enhanced">
              <div className="info-box-header">
                <span className="info-icon">💡</span>
                <span className="info-title">Before you submit</span>
              </div>
              <ul className="info-list">
                <li>
                  <span className="check-icon">✓</span>
                  Ensure you have at least 1,000 governance tokens
                </li>
                <li>
                  <span className="check-icon">✓</span>
                  Double-check all information for accuracy
                </li>
                <li>
                  <span className="check-icon">✓</span>
                  Your proposal will be publicly visible
                </li>
                <li>
                  <span className="check-icon">✓</span>
                  Voting period starts after a 1-hour delay
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                size="large"
                onClick={() => navigate("/proposals")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="large"
                loading={loading}
                disabled={loading || !isConnected}
                icon={loading ? "" : "🚀"}
              >
                {loading ? "Creating..." : "Submit Proposal"}
              </Button>
            </div>

            {!isConnected && (
              <div className="wallet-warning">
                <span className="warning-icon">🔐</span>
                Please connect your wallet to create a proposal
              </div>
            )}
          </form>
        </Card>

        {/* Preview Card */}
        <div className="preview-section">
          <Card padding="large" className="preview-card">
            <div className="preview-header">
              <span className="preview-icon">👁️</span>
              <h3 className="preview-title">Live Preview</h3>
            </div>
            
            <div className="preview-badge">
              PROPOSAL PREVIEW
            </div>
            
            <div className="preview-content">
              {formData.title ? (
                <>
                  <div className="preview-meta">
                    <span style={{ color: 'var(--color-success)' }}>📌 Active</span>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="preview-proposal-title">{formData.title}</h2>
                  
                  {formData.description ? (
                    <div className="preview-description-wrapper">
                      <p className="preview-description">{formData.description}</p>
                    </div>
                  ) : (
                    <p className="preview-placeholder">
                      Your proposal description will appear here as you type...
                    </p>
                  )}

                  {(formData.minTokensRequired !== "0" ||
                    formData.minReputationRequired !== "0") && (
                    <div className="preview-requirements">
                      <h4>
                        <span className="req-icon">📊</span>
                        Voting Requirements
                      </h4>
                      <ul>
                        {formData.minTokensRequired !== "0" && (
                          <li>
                            <span className="req-badge token">
                              🪙 {formData.minTokensRequired} GOV
                            </span>
                            Minimum tokens
                          </li>
                        )}
                        {formData.minReputationRequired !== "0" && (
                          <li>
                            <span className="req-badge rep">
                              ⭐ {formData.minReputationRequired} REP
                            </span>
                            Minimum reputation
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="preview-actions">
                    <button className="preview-vote-btn vote-yes">👍 Vote Yes</button>
                    <button className="preview-vote-btn vote-no">👎 Vote No</button>
                  </div>
                </>
              ) : (
                <div className="preview-empty">
                  <span className="empty-icon">✏️</span>
                  <p>Start typing to see your proposal preview</p>
                </div>
              )}
            </div>
          </Card>

          {/* Tips Card */}
          <Card padding="medium" className="tips-card">
            <div className="tips-header">
              <span className="tips-icon">💪</span>
              <h4>Tips for a Great Proposal</h4>
            </div>
            <ul className="tips-list">
              <li>Be clear and concise in your title</li>
              <li>Explain the problem you're solving</li>
              <li>Provide measurable outcomes</li>
              <li>Consider the budget and timeline</li>
              <li>Anticipate potential concerns</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Error/Success Popup Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        footer={
          <Button
            onClick={closeModal}
            variant={modalState.type === "error" ? "primary" : "success"}
          >
            {modalState.type === "success" ? "Go to Proposals" : "Close"}
          </Button>
        }
      >
        <div className={`modal-message ${modalState.type}`}>
          <div className="modal-icon">
            {modalState.type === "success" ? "🎉" : "⚠️"}
          </div>
          <p className="modal-text">{modalState.message}</p>
        </div>
      </Modal>
    </div>
  );
};

export default CreateProposalPage;
