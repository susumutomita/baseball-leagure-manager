import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TeamFormProps {
  teamId?: number;
  isEdit?: boolean;
}

interface TeamFormData {
  name: string;
  description: string;
  logo_url: string;
}

export const TeamForm: React.FC<TeamFormProps> = ({ teamId, isEdit = false }) => {
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    description: '',
    logo_url: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isEdit && teamId) {
      const fetchTeam = async () => {
        try {
          setLoading(true);
          const response = await axios.get(`/api/v1/teams/${teamId}`);
          const teamData = response.data.data;
          setFormData({
            name: teamData.name || '',
            description: teamData.description || '',
            logo_url: teamData.logo_url || '',
          });
          setError(null);
        } catch (err) {
          setError('Failed to load team data. Please try again later.');
          console.error('Error fetching team:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchTeam();
    }
  }, [isEdit, teamId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (isEdit && teamId) {
        await axios.put(`/api/v1/teams/${teamId}`, { team: formData });
      } else {
        await axios.post('/api/v1/teams', { team: formData });
      }
      setSuccess(true);
      if (!isEdit) {
        setFormData({
          name: '',
          description: '',
          logo_url: '',
        });
      }
    } catch (err) {
      setError('Failed to save team. Please check your input and try again.');
      console.error('Error saving team:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) return <div className="loading">Loading team data...</div>;

  return (
    <div className="team-form-container">
      <h1>{isEdit ? 'Edit Team' : 'Create New Team'}</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">
          Team successfully {isEdit ? 'updated' : 'created'}!
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="team-form">
        <div className="form-group">
          <label htmlFor="name">Team Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-control"
            rows={4}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="logo_url">Logo URL</label>
          <input
            type="url"
            id="logo_url"
            name="logo_url"
            value={formData.logo_url}
            onChange={handleChange}
            className="form-control"
            placeholder="https://example.com/logo.png"
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Team' : 'Create Team'}
          </button>
          <a href="/teams" className="cancel-button">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};

export default TeamForm;
