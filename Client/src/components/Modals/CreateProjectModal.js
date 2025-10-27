import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import UserSearch from '../UserSearch';
import './Modal.css';

const CreateProjectModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Active',
    milestoneDate: ''
  });
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { createProject } = useProjects();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const projectData = {
      ...formData,
      collaborators: collaborators.map(user => user._id)
    };

    const result = await createProject(projectData);
    
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleAddCollaborator = (user) => {
    if (!collaborators.some(collab => collab._id === user._id)) {
      setCollaborators([...collaborators, user]);
    }
  };

  const handleRemoveCollaborator = (userId) => {
    setCollaborators(collaborators.filter(collab => collab._id !== userId));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Title *</label>
            <input
              type="text"
              name="title"
              className="form-input"
              placeholder="Enter project name"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              name="description"
              className="form-textarea"
              placeholder="Describe your project..."
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Milestone Date</label>
              <input
                type="date"
                name="milestoneDate"
                className="form-input"
                value={formData.milestoneDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Add Collaborators</label>
            <UserSearch 
              onSelectUser={handleAddCollaborator}
              selectedUsers={collaborators}
              placeholder="Search by name or email..."
            />
            
            {collaborators.length > 0 && (
              <div className="selected-collaborators">
                <div className="collaborator-tags">
                  {collaborators.map(collaborator => (
                    <div key={collaborator._id} className="collaborator-tag">
                      <div className="user-avatar">
                        {collaborator.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{collaborator.name}</span>
                      <button
                        type="button"
                        className="remove-collaborator"
                        onClick={() => handleRemoveCollaborator(collaborator._id)}
                        title="Remove collaborator"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;