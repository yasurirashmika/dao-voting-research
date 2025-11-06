import React from 'react';
import Card from '../../common/Card/Card';
import { formatRelativeTime } from '../../../utils/formatters';
import './Activity.css';

const Activity = ({ activities }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'vote':
        return '🗳️';
      case 'create':
        return '📝';
      case 'delegate':
        return '🤝';
      default:
        return '📌';
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <Card padding="large">
        <h3 className="activity-title">Recent Activity</h3>
        <div className="activity-empty">
          <p>No recent activity</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="large">
      <h3 className="activity-title">Recent Activity</h3>
      
      <div className="activity-list">
        {activities.map((activity, index) => (
          <div key={index} className="activity-item">
            <div className="activity-icon">
              {getActivityIcon(activity.type)}
            </div>
            <div className="activity-content">
              <div className="activity-text">
                <span className="activity-action">{activity.action}</span>
                <span className="activity-proposal">{activity.proposal}</span>
              </div>
              <div className="activity-time">
                {formatRelativeTime(new Date(activity.timestamp))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default Activity;
