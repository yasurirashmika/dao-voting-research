import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useProposals } from '../../hooks/useProposals';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { validateProposalTitle, validateProposalDescription } from '../../utils/validators';
import { MAX_VALUES } from '../../utils/constants';
import './CreateProposalPage.module.css';

const CreateProposalPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { createProposal } = useProposals();

  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const titleValidation = validateProposalTitle(formData.title);
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error;
    }

    const descriptionValidation = validateProposalDescription(formData.description);
    if (!descriptionValidation.valid) {
      newErrors.description = descriptionValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      alert('Please connect your wallet to create a proposal');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // TODO: Replace with actual smart contract parameters
      const targets = []; // Array of target addresses
      const values = []; // Array of values to send
      const calldatas = []; // Array of encoded function calls

      await createProposal(
        formData.title,
        formData.description,
        targets,
        values,
        calldatas
      );

      alert('Proposal created successfully!');
      navigate('/proposals');
    } catch (error) {
      console.error('Error creating proposal:', error);
      alert('Failed to create proposal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const characterCount = {
    title: formData.title.length,
    description: formData.description.length
  };

  return (
    <div className="create-proposal-page">
      <div className="create-proposal-header">
        <Button variant="ghost" onClick={() => navigate('/proposals')}>
          ← Back to Proposals
        </Button>
        <h1 className="page-title">Create New Proposal</h1>
        <p className="page-subtitle">
          Submit a proposal for the DAO to vote on. Make sure to provide clear details about what you're proposing.
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
                onChange={(e) => handleChange('title', e.target.value)}
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
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Provide detailed information about your proposal...

• What problem does this solve?
• What are the expected outcomes?
• What resources are needed?
• What is the timeline?"
                error={errors.description}
                helperText={
                  !errors.description && 
                  `${characterCount.description}/${MAX_VALUES.PROPOSAL_DESCRIPTION_LENGTH} characters (minimum 50)`
                }
                required
                fullWidth
              />
            </div>

            {/* Info Box */}
            <div className="info-box">
              <div className="info-box-icon">ℹ️</div>
              <div className="info-box-content">
                <h4>Before submitting:</h4>
                <ul>
                  <li>Ensure you have enough governance tokens to create a proposal</li>
                  <li>Double-check all information for accuracy</li>
                  <li>Your proposal will be publicly visible and cannot be edited</li>
                  <li>The voting period will start after a short delay</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                size="large"
                onClick={() => navigate('/proposals')}
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
                {loading ? 'Creating Proposal...' : 'Create Proposal'}
              </Button>
            </div>

            {!isConnected && (
              <div className="warning-box">
                ⚠️ Please connect your wallet to create a proposal
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
                  <p className="preview-placeholder">Description will appear here...</p>
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
    </div>
  );
};

export default CreateProposalPage;