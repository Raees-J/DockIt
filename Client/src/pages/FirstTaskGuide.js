import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import './FirstTaskGuide.css';

const FirstTaskGuide = () => {
  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState({
    title: '',
    description: '',
    milestoneDate: ''
  });
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'Medium'
  });
  const [loading, setLoading] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);

  const { markFirstTaskCreated } = useAuth();
  const { createProject } = useProjects();
  const { createTask } = useTasks();
  const navigate = useNavigate();

  const handleProjectChange = (e) => {
    setProjectData({
      ...projectData,
      [e.target.name]: e.target.value
    });
  };

  const handleTaskChange = (e) => {
    setTaskData({
      ...taskData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await createProject(projectData);
    if (result.success) {
      setCreatedProject(result.data);
      setStep(2);
    }

    setLoading(false);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await createTask({
      ...taskData,
      parentProject: createdProject._id
    });

    if (result.success) {
      await markFirstTaskCreated();
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="first-task-container">
      <div className="first-task-card">
        <div className="progress-indicator">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Create Project</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Create Task</div>
          </div>
        </div>

        {step === 1 ? (
          <div className="step-content">
            <h2>🚀 Let's Create Your First Project</h2>
            <p>Projects help you organize related tasks and track progress efficiently.</p>

            <form onSubmit={handleCreateProject} className="guide-form">
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  placeholder="e.g., Website Redesign, Product Launch"
                  value={projectData.title}
                  onChange={handleProjectChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  placeholder="Brief description of your project goals..."
                  value={projectData.description}
                  onChange={handleProjectChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Milestone Date (Optional)</label>
                <input
                  type="date"
                  name="milestoneDate"
                  className="form-input"
                  value={projectData.milestoneDate}
                  onChange={handleProjectChange}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project & Continue'}
              </button>
            </form>
          </div>
        ) : (
          <div className="step-content">
            <h2>✨ Now, Add Your First Task</h2>
            <p>Tasks are specific actions needed to complete your project.</p>

            <div className="project-preview">
              <strong>Project:</strong> {createdProject?.title}
            </div>

            <form onSubmit={handleCreateTask} className="guide-form">
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  placeholder="e.g., Research competitors, Design mockups"
                  value={taskData.title}
                  onChange={handleTaskChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  placeholder="Add details about what needs to be done..."
                  value={taskData.description}
                  onChange={handleTaskChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Due Date *</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="form-input"
                    value={taskData.dueDate}
                    onChange={handleTaskChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    name="priority"
                    className="form-select"
                    value={taskData.priority}
                    onChange={handleTaskChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Creating...' : 'Create Task & Get Started'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirstTaskGuide;
