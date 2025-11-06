import React from 'react';
import Button from '../../common/Button/Button';
import { VOTE_TYPE } from '../../../utils/constants';
import './VoteButton.css';

const VoteButton = ({ voteType, onClick, disabled, loading }) => {
  const getButtonProps = () => {
    switch (voteType) {
      case VOTE_TYPE.FOR:
        return {
          variant: 'success',
          label: 'Vote For',
          icon: '👍'
        };
      case VOTE_TYPE.AGAINST:
        return {
          variant: 'danger',
          label: 'Vote Against',
          icon: '👎'
        };
      case VOTE_TYPE.ABSTAIN:
        return {
          variant: 'secondary',
          label: 'Abstain',
          icon: '🤷'
        };
      default:
        return {
          variant: 'primary',
          label: 'Vote',
          icon: '🗳️'
        };
    }
  };

  const { variant, label, icon } = getButtonProps();

  return (
    <Button
      variant={variant}
      onClick={() => onClick(voteType)}
      disabled={disabled}
      loading={loading}
      icon={icon}
      size="large"
      fullWidth
      className="vote-button"
    >
      {label}
    </Button>
  );
};

export default VoteButton;
