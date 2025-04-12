import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Team {
  id: number;
  name: string;
  logo_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface TeamDetailProps {
  teamId: number;
}

export const TeamDetail: React.FC<TeamDetailProps> = ({ teamId }) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/v1/teams/${teamId}`);
        setTeam(response.data.data);
        setError(null);
      } catch (err) {
        setError('Failed to load team details. Please try again later.');
        console.error('Error fetching team:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamId]);

  if (loading) return <div className="loading">Loading team details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!team) return <div className="not-found">Team not found</div>;

  return (
    <div className="team-detail">
      <div className="team-header">
        {team.logo_url && (
          <img src={team.logo_url} alt={`${team.name} logo`} className="team-logo" />
        )}
        <h1>{team.name}</h1>
      </div>
      
      {team.description && (
        <div className="team-description">
          <h3>Description</h3>
          <p>{team.description}</p>
        </div>
      )}
      
      <div className="team-metadata">
        <p>Created: {new Date(team.created_at).toLocaleDateString()}</p>
        <p>Last updated: {new Date(team.updated_at).toLocaleDateString()}</p>
      </div>
      
      <div className="team-actions">
        <a href={`/teams/${team.id}/edit`} className="edit-button">
          Edit Team
        </a>
        <a href="/teams" className="back-button">
          Back to Teams
        </a>
      </div>
    </div>
  );
};

export default TeamDetail;
