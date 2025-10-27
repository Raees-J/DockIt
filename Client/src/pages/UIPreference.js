import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './UIPreference.css';

const UIPreference = () => {
  const [selectedUI, setSelectedUI] = useState(null);
  const [loading, setLoading] = useState(false);
  const { updateUIPreference } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!selectedUI) return;
    
    setLoading(true);
    const result = await updateUIPreference(selectedUI);
    
    if (result.success) {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="ui-preference-container">
      <div className="ui-preference-content">
        <div className="ui-header">
          <h1>Choose Your Experience</h1>
          <p>Select the interface that best suits your workflow</p>
        </div>

        <div className="ui-options">
          <div 
            className={`ui-option ${selectedUI === 'simple' ? 'selected' : ''}`}
            onClick={() => setSelectedUI('simple')}
          >
            <div className="ui-option-icon">📋</div>
            <h3>Simple & Minimalist</h3>
            <p>Focus on task lists and essential features. Perfect for individual productivity.</p>
            <ul className="ui-features">
              <li>Clean task list view</li>
              <li>Quick task creation</li>
              <li>Streamlined interface</li>
              <li>Minimal distractions</li>
            </ul>
          </div>

          <div 
            className={`ui-option ${selectedUI === 'complex' ? 'selected' : ''}`}
            onClick={() => setSelectedUI('complex')}
          >
            <div className="ui-option-icon">📊</div>
            <h3>Advanced & Feature-Rich</h3>
            <p>Full-featured dashboard with Kanban boards and analytics. Ideal for team collaboration.</p>
            <ul className="ui-features">
              <li>Kanban board view</li>
              <li>Advanced analytics</li>
              <li>Team collaboration tools</li>
              <li>Detailed project insights</li>
            </ul>
          </div>
        </div>

        <button 
          className="btn btn-primary btn-large"
          onClick={handleSubmit}
          disabled={!selectedUI || loading}
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default UIPreference;
