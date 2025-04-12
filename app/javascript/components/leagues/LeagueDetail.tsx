import React from 'react';

interface LeagueDetailProps {
  leagueId: number;
}

export const LeagueDetail: React.FC<LeagueDetailProps> = ({ leagueId }) => {
  return (
    <div className="league-detail">
      <h1>League Details</h1>
      <p>League detail component for ID: {leagueId}</p>
    </div>
  );
};

export default LeagueDetail;
