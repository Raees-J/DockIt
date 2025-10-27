import React, { useState } from 'react';
import axios from 'axios';

const AIAssistant = ({ projectId, projectTitle, projectDescription, onSuggestions }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const generateTaskSuggestions = async () => {
    if (!projectTitle || !projectDescription) {
      alert('Please provide project title and description');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/ai/suggest-tasks', {
        projectId,
        projectTitle,
        projectDescription
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setSuggestions(response.data.suggestions);
        onSuggestions && onSuggestions(response.data.suggestions);
      }
    } catch (error) {
      console.error('AI suggestions error:', error);
      alert('Error generating task suggestions');
    } finally {
      setLoading(false);
    }
  };

  const analyzeProject = async () => {
    if (!projectId) {
      alert('Please select a project first');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/ai/analyze-project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setAnalysis(response.data.analysis);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      alert('Error analyzing project');
    } finally {
      setLoading(false);
    }
  };

  const enhanceTaskDescription = async (taskTitle) => {
    try {
      const response = await axios.post('/api/ai/enhance-task-description', {
        taskTitle,
        projectContext: projectDescription
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        return response.data.enhancedDescription;
      }
    } catch (error) {
      console.error('AI enhancement error:', error);
    }
    return null;
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <h3>🤖 AI Assistant</h3>
        <p>Powered by Google AI</p>
      </div>

      <div className="ai-actions">
        <button 
          className="btn btn-primary"
          onClick={generateTaskSuggestions}
          disabled={loading || !projectTitle || !projectDescription}
        >
          {loading ? 'Generating...' : '✨ Generate Task Suggestions'}
        </button>

        <button 
          className="btn btn-outline"
          onClick={analyzeProject}
          disabled={loading || !projectId}
        >
          {loading ? 'Analyzing...' : '📊 Analyze Project Progress'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="ai-suggestions">
          <h4>💡 AI Task Suggestions</h4>
          <div className="suggestions-list">
            {suggestions.map((task, index) => (
              <div key={index} className="suggestion-item">
                <div className="suggestion-header">
                  <h5>{task.title}</h5>
                  <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>
                    {task.priority}
                  </span>
                </div>
                <p>{task.description}</p>
                {task.estimatedHours && (
                  <div className="suggestion-meta">
                    <span>⏱️ Estimated: {task.estimatedHours} hours</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis && (
        <div className="ai-analysis">
          <h4>📈 Project Analysis</h4>
          <div className="analysis-content">
            {analysis.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;