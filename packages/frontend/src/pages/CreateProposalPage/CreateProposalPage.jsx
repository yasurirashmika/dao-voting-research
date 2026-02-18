/* src/pages/CreateProposal/CreateProposalPage.jsx */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useProposals } from "../../hooks/useProposals";
import Card from "../../components/common/Card/Card";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import Alert from "../../components/common/Alert/Alert";
import Modal from "../../components/common/Modal/Modal";
import {
  validateProposalTitle,
  validateProposalDescription,
} from "../../utils/validators";
import { MAX_VALUES } from "../../utils/constants";
import "./CreateProposalPage.css";

const CreateProposalPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  // 1. Get refreshProposals from hook
  const { createProposal, refreshProposals } = useProposals();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    minTokensRequired: "0",
    minReputationRequired: "0",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Modal State for Errors/Success
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  // Helper to open modal
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
    // If it was a success modal, navigate away on close
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

      // 2. Trigger Global Refresh immediately after success
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

      // Smart Error Handling
      if (error.message.includes("Only registered voters")) {
        errorMessage =
          "Access Denied: Only registered voters can create proposals. Please register in the Admin panel or contact a DAO member.";
      } else if (error.message.includes("Insufficient tokens")) {
        errorMessage =
          "Insufficient Balance: You need 1,000 Governance Tokens to create a proposal.";
      } else if (
        error.message.includes("User denied") ||
        error.message.includes("user rejected")
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
      <div className="create-proposal-header">
        <Button variant="ghost" onClick={() => navigate("/proposals")}>
          ← Back to Proposals
        </Button>
        <h1 className="page-title">Create New Proposal</h1>
        <p className="page-subtitle">
          Submit a proposal for the DAO to vote on. Make sure to provide clear
          details about what you're proposing.
        </p>
      </div>

      <div className="create-proposal-content">
        <Card padding="large" className="create-proposal-form-card">
          <form onSubmit={handleSubmit} className="create-proposal-form">
            {/* Title */}
            <div className="form-section">
              <Input
                label="Proposal Title"
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter a clear, descriptive title..."
                error={errors.title}
                helperText={
                  !errors.title &&
                  `${characterCount.title}/${MAX_VALUES.PROPOSAL_TITLE_LENGTH} characters`
                }
                required
                fullWidth
              />
            </div>

            {/* Description */}
            <div className="form-section">
              <Input
                label="Proposal Description"
                multiline
                rows={12}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Provide detailed information about your proposal...&#10;&#10;• What problem does this solve?&#10;• What are the expected outcomes?&#10;• What resources are needed?&#10;• What is the timeline?"
                error={errors.description}
                helperText={
                  !errors.description &&
                  `${characterCount.description}/${MAX_VALUES.PROPOSAL_DESCRIPTION_LENGTH} characters (minimum 50)`
                }
                required
                fullWidth
              />
            </div>

            {/* Voting Requirements Section */}
            <div className="form-section">
              <h3 className="section-subtitle">
                Voting Requirements (Optional)
              </h3>
              <p className="section-description">
                Set minimum requirements for voters to participate in this
                proposal. Leave at 0 to allow all registered voters.
              </p>

              <div className="requirements-grid">
                <Input
                  label="Minimum Tokens Required"
                  type="number"
                  min="0"
                  value={formData.minTokensRequired}
                  onChange={(e) =>
                    handleChange("minTokensRequired", e.target.value)
                  }
                  placeholder="0"
                  error={errors.minTokensRequired}
                  helperText="Minimum governance tokens needed to vote (0 = no minimum)"
                  fullWidth
                />

                <Input
                  label="Minimum Reputation Required"
                  type="number"
                  min="0"
                  max="1000"
                  value={formData.minReputationRequired}
                  onChange={(e) =>
                    handleChange("minReputationRequired", e.target.value)
                  }
                  placeholder="0"
                  error={errors.minReputationRequired}
                  helperText="Minimum reputation score (0-1000, 0 = no minimum)"
                  fullWidth
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="info-box">
              <div className="info-box-icon">ℹ️</div>
              <div className="info-box-content">
                <h4>Before submitting:</h4>
                <ul>
                  <li>
                    Ensure you have enough governance tokens (1,000) to create a
                    proposal
                  </li>
                  <li>Double-check all information for accuracy</li>
                  <li>
                    Your proposal will be publicly visible and cannot be edited
                  </li>
                  <li>The voting period will start after a 1-hour delay</li>
                  <li>Voting lasts for 7 days after it starts</li>
                </ul>
              </div>
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
              >
                {loading ? "Creating Proposal..." : "Create Proposal"}
              </Button>
            </div>

            {!isConnected && (
              <div className="warning-box">
                Please connect your wallet to create a proposal
              </div>
            )}
          </form>
        </Card>

        {/* Preview Card */}
        <Card padding="large" className="preview-card">
          <h3 className="preview-title">Preview</h3>
          <div className="preview-content">
            {formData.title ? (
              <>
                <h2 className="preview-proposal-title">{formData.title}</h2>
                {formData.description ? (
                  <p className="preview-description">{formData.description}</p>
                ) : (
                  <p className="preview-placeholder">
                    Description will appear here...
                  </p>
                )}

                {(formData.minTokensRequired !== "0" ||
                  formData.minReputationRequired !== "0") && (
                  <div className="preview-requirements">
                    <h4>Voting Requirements:</h4>
                    <ul>
                      {formData.minTokensRequired !== "0" && (
                        <li>
                          Minimum {formData.minTokensRequired} governance tokens
                        </li>
                      )}
                      {formData.minReputationRequired !== "0" && (
                        <li>
                          Minimum {formData.minReputationRequired} reputation
                          score
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="preview-placeholder">
                Your proposal preview will appear here as you type...
              </p>
            )}
          </div>
        </Card>
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
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            {modalState.type === "success" ? "✅" : "❌"}
          </div>

          <p
            style={{
              fontSize: "1.1rem",
              textAlign: "center",
              color: "var(--color-text-primary)",
              lineHeight: "1.6",
            }}
          >
            {modalState.message}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CreateProposalPage;
