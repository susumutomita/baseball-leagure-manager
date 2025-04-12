import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Team {
  id: number;
  name: string;
  logo_url?: string;
  description?: string;
}

export const TeamList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/v1/teams');
        setTeams(response.data.data);
        setError(null);
      } catch (err) {
        setError('Failed to load teams. Please try again later.');
        console.error('Error fetching teams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) return <div className="loading">Loading teams...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="teams-container">
      <h1>Teams</h1>
      {teams.length === 0 ? (
        <p>No teams found. Create your first team!</p>
      ) : (
        <div className="teams-grid">
          {teams.map((team) => (
            <div key={team.id} className="team-card">
              {team.logo_url && (
                <img src={team.logo_url} alt={`${team.name} logo`} className="team-logo" />
              )}
              <h3>{team.name}</h3>
              {team.description && <p>{team.description}</p>}
              <a href={`/teams/${team.id}`} className="team-link">
                View Details
              </a>
            </div>
          ))}
        </div>
      )}
      <a href="/teams/new" className="create-team-button">
        Create New Team
      </a>
    </div>
  );
};

export default TeamList;
