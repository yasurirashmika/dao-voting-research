import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useProposals } from '../../hooks/useProposals';
import { useVoting } from '../../hooks/useVoting';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import Loader from '../../components/common/Loader/Loader';
import { formatAddress, formatDate, formatLargeNumber, formatPercentage } from '../../utils/formatters';
import { getProposalStateLabel, getProposalStateColor, canVoteOnProposal } from '../../utils/helpers';
import { VOTE_TYPE } from '../../utils/constants';
import './ProposalDetails.module.css';

const ProposalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { getProposal } = useProposals();
  const { castVote, castVoteWithReason, loading: voteLoading } = useVoting();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedVote, setSelectedVote] = useState(null);
  const [voteReason, setVoteReason] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    loadProposal();
  }, [id]);

  const loadProposal = async () => {
    try {
      const data = await getProposal(id);
      setProposal(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading proposal:', error);
      setLoading(false);
    }
  };

  const handleVoteClick = (voteType) => {
    if (!isConnected) {
      alert('Please connect your wallet to vote');
      return;
    }
    setSelectedVote(voteType);
    setShowVoteModal(true);
  };

  const handleSubmitVote = async () => {
    try {
      if (voteReason.trim()) {
        await castVoteWithReason(proposal.id, selectedVote, voteReason);
      } else {
        await castVote(proposal.id, selectedVote);
      }
      setShowVoteModal(false);
      setHasVoted(true);
      alert('Vote cast successfully!');
      loadProposal();
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Failed to cast vote: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="proposal-loading">
        <Loader size="large" text="Loading proposal..." />
      </div>
    );
  }

  if (!proposal) {
    return (
      <Card padding="large" className="proposal-not-found">
        <h2>Proposal Not Found</h2>
        <p>The proposal you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/proposals')}>Back to Proposals</Button>
      </Card>
    );
  }

  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const canVote = canVoteOnProposal(proposal.state, hasVoted);

  return (
    <div className="proposal-details-page">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/proposals')}>
        ← Back to Proposals
      </Button>

      <div className="proposal-details-grid">
        {/* Main Content */}
        <div className="proposal-main">
          <Card padding="large">
            {/* Header */}
            <div className="proposal-header">
              <span 
                className="proposal-status-badge"
                style={{ backgroundColor: getProposalStateColor(proposal.state) }}
              >
                {getProposalStateLabel(proposal.state)}
              </span>
              <h1 className="proposal-title">{proposal.title}</h1>
              <div className="proposal-meta">
                <span>Proposed by {formatAddress(proposal.proposer)}</span>
                <span>•</span>
                <span>{formatDate(proposal.createdAt, 'long')}</span>
              </div>
            </div>

            {/* Description */}
            <div className="proposal-description">
              <h3>Description</h3>
              <p>{proposal.description}</p>
            </div>

            {/* Vote Actions */}
            {canVote && (
              <div className="vote-actions">
                <h3>Cast Your Vote</h3>
                <div className="vote-buttons">
                  <Button 
                    variant="success" 
                    size="large" 
                    fullWidth
                    onClick={() => handleVoteClick(VOTE_TYPE.FOR)}
                    disabled={voteLoading}
                  >
                    Vote For
                  </Button>
                  <Button 
                    variant="danger" 
                    size="large" 
                    fullWidth
                    onClick={() => handleVoteClick(VOTE_TYPE.AGAINST)}
                    disabled={voteLoading}
                  >
                    Vote Against
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="large" 
                    fullWidth
                    onClick={() => handleVoteClick(VOTE_TYPE.ABSTAIN)}
                    disabled={voteLoading}
                  >
                    Abstain
                  </Button>
                </div>
              </div>
            )}

            {hasVoted && (
              <div className="voted-notice">
                ✓ You have already voted on this proposal
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="proposal-sidebar">
          {/* Voting Results */}
          <Card padding="medium">
            <h3 className="sidebar-title">Voting Results</h3>
            
            <div className="vote-breakdown">
              <div className="vote-item vote-for">
                <div className="vote-item-header">
                  <span className="vote-item-label">For</span>
                  <span className="vote-item-value">{formatLargeNumber(proposal.forVotes)}</span>
                </div>
                <div className="vote-item-bar">
                  <div 
                    className="vote-item-fill"
                    style={{ 
                      width: formatPercentage(proposal.forVotes, totalVotes),
                      backgroundColor: 'var(--color-vote-for)'
                    }}
                  />
                </div>
                <span className="vote-item-percentage">
                  {formatPercentage(proposal.forVotes, totalVotes)}
                </span>
              </div>

              <div className="vote-item vote-against">
                <div className="vote-item-header">
                  <span className="vote-item-label">Against</span>
                  <span className="vote-item-value">{formatLargeNumber(proposal.againstVotes)}</span>
                </div>
                <div className="vote-item-bar">
                  <div 
                    className="vote-item-fill"
                    style={{ 
                      width: formatPercentage(proposal.againstVotes, totalVotes),
                      backgroundColor: 'var(--color-vote-against)'
                    }}
                  />
                </div>
                <span className="vote-item-percentage">
                  {formatPercentage(proposal.againstVotes, totalVotes)}
                </span>
              </div>

              <div className="vote-item vote-abstain">
                <div className="vote-item-header">
                  <span className="vote-item-label">Abstain</span>
                  <span className="vote-item-value">{formatLargeNumber(proposal.abstainVotes)}</span>
                </div>
                <div className="vote-item-bar">
                  <div 
                    className="vote-item-fill"
                    style={{ 
                      width: formatPercentage(proposal.abstainVotes, totalVotes),
                      backgroundColor: 'var(--color-vote-abstain)'
                    }}
                  />
                </div>
                <span className="vote-item-percentage">
                  {formatPercentage(proposal.abstainVotes, totalVotes)}
                </span>
              </div>
            </div>

            <div className="total-votes">
              <span>Total Votes</span>
              <span className="total-votes-value">{formatLargeNumber(totalVotes)}</span>
            </div>
          </Card>

          {/* Proposal Info */}
          <Card padding="medium">
            <h3 className="sidebar-title">Information</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value">{getProposalStateLabel(proposal.state)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Start Block</span>
                <span className="info-value">#{proposal.startBlock}</span>
              </div>
              <div className="info-item">
                <span className="info-label">End Block</span>
                <span className="info-value">#{proposal.endBlock}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Vote Modal */}
      <Modal
        isOpen={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        title="Cast Your Vote"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowVoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitVote} loading={voteLoading}>
              Submit Vote
            </Button>
          </>
        }
      >
        <div className="vote-modal-content">
          <p>
            You are voting <strong>
              {selectedVote === VOTE_TYPE.FOR && 'For'}
              {selectedVote === VOTE_TYPE.AGAINST && 'Against'}
              {selectedVote === VOTE_TYPE.ABSTAIN && 'Abstain'}
            </strong> on this proposal.
          </p>
          
          <Input
            label="Reason (Optional)"
            multiline
            rows={4}
            value={voteReason}
            onChange={(e) => setVoteReason(e.target.value)}
            placeholder="Share why you're voting this way..."
            helperText="Your reason will be publicly visible"
          />
        </div>
      </Modal>
    </div>
  );
};

export default ProposalDetails;