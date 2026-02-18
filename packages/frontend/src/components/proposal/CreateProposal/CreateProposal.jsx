import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useProposals } from '../../hooks/useProposals';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import { validateProposalTitle, validateProposalDescription } from '../../utils/validators';
import { MAX_VALUES } from '../../utils/constants';
import './CreateProposalPage.css';

const DEPLOYMENT_MODE = process.env.REACT_APP_DEPLOYMENT_MODE || 'baseline';

const CreateProposalPage = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { createProposal } = useProposals();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    minTokensRequired: '0',
    minReputationRequired: '0'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  const showModal = (type, title, message) => {
    setModalState({ isOpen: true, type, title, message });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (modalState.type === 'success') {
      navigate('/proposals');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const titleValidation = validateProposalTitle(formData.title);
    if (!titleValidation.valid) newErrors.title = titleValidation.error;

    const descriptionValidation = validateProposalDescription(formData.description);
    if (!descriptionValidation.valid) newErrors.description = descriptionValidation.error;

    const minTokens = parseInt(formData.minTokensRequired);
    if (isNaN(minTokens) || minTokens < 0) newErrors.minTokensRequired = 'Must be a valid non-negative number';

    const minRep = parseInt(formData.minReputationRequired);
    if (isNaN(minRep) || minRep < 0 || minRep > 1000) newErrors.minReputationRequired = 'Must be between 0 and 1000';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      showModal('error', 'Wallet Not Connected', 'Please connect your wallet to create a proposal.');
      return;
    }

    if (!validateForm()) {
      showModal('error', 'Validation Error', 'Please fix the errors highlighted in the form.');
      return;
    }

    setLoading(true);

    try {
      // LOGIC: Pass arguments based on mode
      // Private: (title, desc, minReputation)
      // Public:  (title, desc, minTokens)
      
      let tokens = '0';
      let rep = '0';

      if (DEPLOYMENT_MODE === 'private') {
          rep = formData.minReputationRequired;
          tokens = '0'; // Ignored by private hook logic usually, but strict here
      } else {
          tokens = formData.minTokensRequired;
          rep = '0'; // Ignored
      }

      await createProposal(
        formData.title,
        formData.description,
        tokens,
        rep
      );

      showModal('success', 'Proposal Created!', 'Your proposal has been submitted successfully.');
      
    } catch (error) {
      console.error('Error creating proposal:', error);
      let errorMessage = 'Failed to create proposal. Please try again.';
      if (error.message.includes('Only registered voters')) {
        errorMessage = 'Access Denied: Only registered voters can create proposals.';
      } else if (error.message.includes('Insufficient tokens')) {
        errorMessage = 'Insufficient Balance: You need 1,000 Governance Tokens to create a proposal.';
      } else if (error.message.includes('User denied')) {
        errorMessage = 'Transaction cancelled.';
      }
      showModal('error', 'Creation Failed', errorMessage);
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
          Submit a proposal for the DAO to vote on.
        </p>
      </div>

      <div className="create-proposal-content">
        <Card padding="large" className="create-proposal-form-card">
          <form onSubmit={handleSubmit} className="create-proposal-form">
            <div className="form-section">
              <Input
                label="Proposal Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter a clear, descriptive title..."
                error={errors.title}
                helperText={`${characterCount.title}/${MAX_VALUES.PROPOSAL_TITLE_LENGTH} characters`}
                required
                fullWidth
              />
            </div>

            <div className="form-section">
              <Input
                label="Proposal Description"
                multiline
                rows={12}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Provide detailed information..."
                error={errors.description}
                helperText={`${characterCount.description}/${MAX_VALUES.PROPOSAL_DESCRIPTION_LENGTH} characters`}
                required
                fullWidth
              />
            </div>

            <div className="form-section">
              <h3 className="section-subtitle">Voting Requirements (Optional)</h3>
              <p className="section-description">
                Set minimum requirements for voters.
              </p>

              <div className="requirements-grid">
                {/* CONDITIONAL RENDERING based on DEPLOYMENT_MODE */}
                
                {DEPLOYMENT_MODE === 'baseline' && (
                    <Input
                        label="Minimum Tokens Required"
                        type="number"
                        min="0"
                        value={formData.minTokensRequired}
                        onChange={(e) => handleChange('minTokensRequired', e.target.value)}
                        placeholder="0"
                        error={errors.minTokensRequired}
                        helperText="Minimum governance tokens needed to vote (Public Mode)"
                        fullWidth
                    />
                )}

                {DEPLOYMENT_MODE === 'private' && (
                    <Input
                        label="Minimum Reputation Required"
                        type="number"
                        min="0"
                        max="1000"
                        value={formData.minReputationRequired}
                        onChange={(e) => handleChange('minReputationRequired', e.target.value)}
                        placeholder="0"
                        error={errors.minReputationRequired}
                        helperText="Minimum reputation score needed (Private Mode)"
                        fullWidth
                    />
                )}
              </div>
            </div>

            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => navigate('/proposals')} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading} disabled={loading || !isConnected}>
                {loading ? 'Creating Proposal...' : 'Create Proposal'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        footer={<Button onClick={closeModal} variant={modalState.type === 'error' ? 'primary' : 'success'}>Close</Button>}
      >
        <div className={`modal-message ${modalState.type}`}>
            <p>{modalState.message}</p>
        </div>
      </Modal>
    </div>
  );
};

export default CreateProposalPage;