import React, { useEffect, useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import CreateProjectModal from '../components/Modals/CreateProjectModal';
import CreateTaskModal from '../components/Modals/CreateTaskModal';
import { getSocket } from '../utils/socket';
import './Projects.css';

const Projects = () => {
  const { projects, fetchProjects, currentProject, setCurrentProject, deleteProject } = useProjects();
  const { tasks, fetchTasks, updateTaskStatus } = useTasks();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [tasksByStatus, setTasksByStatus] = useState({
    'To Do': [],
    'In Progress': [],
    'Completed': []
  });
  const [isDataReady, setIsDataReady] = useState(false);
  const [viewMode, setViewMode] = useState('projects'); // 'projects' or 'tasks'

  // Helper function to format milestone date
  const formatMilestoneDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handle delete project
  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation(); // Prevent card click
    
    if (window.confirm('Are you sure you want to delete this project? All associated tasks will also be deleted.')) {
      const result = await deleteProject(projectId);
      if (result.success) {
        // Project will be removed via socket event or local state update
      } else {
        alert(result.error || 'Failed to delete project');
      }
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Remove auto-selection of first project - let user choose
  // useEffect(() => {
  //   if (projects.length > 0 && !currentProject) {
  //     setCurrentProject(projects[0]);
  //   }
  // }, [projects, currentProject, setCurrentProject]);

  const handleProjectClick = (project) => {
    setCurrentProject(project);
    setViewMode('tasks');
  };

  const handleBackToProjects = () => {
    setViewMode('projects');
    setCurrentProject(null);
  };

  // Socket room management for real-time updates
  useEffect(() => {
    const socket = getSocket();
    
    if (currentProject) {
      // Join the project room for real-time updates
      socket.emit('join-project', currentProject._id);
      console.log('Joined project room:', currentProject._id);
      
      return () => {
        // Leave the project room when switching projects or unmounting
        socket.emit('leave-project', currentProject._id);
        console.log('Left project room:', currentProject._id);
      };
    }
  }, [currentProject]);

  useEffect(() => {
    if (currentProject) {
      setIsDataReady(false);
      setTasksByStatus({
        'To Do': [],
        'In Progress': [],
        'Completed': []
      });
      fetchTasks({ projectId: currentProject._id });
    }
  }, [currentProject, fetchTasks]);

  useEffect(() => {
    console.log('Tasks updated:', tasks);
    const grouped = {
      'To Do': tasks.filter(task => task.status === 'To Do'),
      'In Progress': tasks.filter(task => task.status === 'In Progress'),
      'Completed': tasks.filter(task => task.status === 'Completed')
    };
    console.log('Grouped tasks:', grouped);
    
    // Log task IDs for debugging
    Object.keys(grouped).forEach(status => {
      console.log(`${status} task IDs:`, grouped[status].map(task => task._id || task.id));
    });
    
    // Only update if the task structure has actually changed
    const hasChanged = JSON.stringify(grouped) !== JSON.stringify(tasksByStatus);
    if (hasChanged) {
      setTasksByStatus(grouped);
    }
    setIsDataReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const moveTaskToNextStatus = async (task) => {
    const statusOrder = ['To Do', 'In Progress', 'Completed'];
    const currentStatusIndex = statusOrder.indexOf(task.status);
    
    if (currentStatusIndex === -1 || currentStatusIndex >= statusOrder.length - 1) {
      return; // Task is already at final status or invalid status
    }
    
    const newStatus = statusOrder[currentStatusIndex + 1];
    const taskId = task._id || task.id;
    
    console.log('Moving task from', task.status, 'to', newStatus);
    
    // Update UI immediately
    const newTasksByStatus = { ...tasksByStatus };
    const taskIndex = newTasksByStatus[task.status].findIndex(t => (t._id || t.id) === taskId);
    
    if (taskIndex !== -1) {
      const [movedTask] = newTasksByStatus[task.status].splice(taskIndex, 1);
      newTasksByStatus[newStatus].push({
        ...movedTask,
        status: newStatus
      });
      setTasksByStatus(newTasksByStatus);
    }

    // Update in backend
    try {
      const updateResult = await updateTaskStatus(taskId, newStatus);
      if (!updateResult.success) {
        console.error('Failed to update task status:', updateResult);
        // Revert on failure
        fetchTasks({ projectId: currentProject._id });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert on error
      fetchTasks({ projectId: currentProject._id });
    }
  };

  const moveTaskToPreviousStatus = async (task) => {
    const statusOrder = ['To Do', 'In Progress', 'Completed'];
    const currentStatusIndex = statusOrder.indexOf(task.status);
    
    if (currentStatusIndex <= 0) {
      return; // Task is already at first status
    }
    
    const newStatus = statusOrder[currentStatusIndex - 1];
    const taskId = task._id || task.id;
    
    console.log('Moving task from', task.status, 'to', newStatus);
    
    // Update UI immediately
    const newTasksByStatus = { ...tasksByStatus };
    const taskIndex = newTasksByStatus[task.status].findIndex(t => (t._id || t.id) === taskId);
    
    if (taskIndex !== -1) {
      const [movedTask] = newTasksByStatus[task.status].splice(taskIndex, 1);
      newTasksByStatus[newStatus].push({
        ...movedTask,
        status: newStatus
      });
      setTasksByStatus(newTasksByStatus);
    }

    // Update in backend
    try {
      const updateResult = await updateTaskStatus(taskId, newStatus);
      if (!updateResult.success) {
        console.error('Failed to update task status:', updateResult);
        // Revert on failure
        fetchTasks({ projectId: currentProject._id });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert on error
      fetchTasks({ projectId: currentProject._id });
    }
  };

  const getColumnColor = (status) => {
    switch (status) {
      case 'To Do':
        return '#dbeafe';
      case 'In Progress':
        return '#fef3c7';
      case 'Completed':
        return '#d1fae5';
      default:
        return '#f3f4f6';
    }
  };

  // Projects List View
  const renderProjectsList = () => (
    <div className="projects-page">
      <div className="projects-header">
        <div className="projects-header-content">
          <h1>Projects</h1>
          <p>Organize your work and collaborate with your team</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
            ＋ New Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-projects">
          <div className="empty-icon">📁</div>
          <h2>No projects yet</h2>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <div
              key={project._id}
              className="project-card"
              onClick={() => handleProjectClick(project)}
            >
              <div className="project-card-inner">
                <div className="project-card-header">
                  <h3>{project.title}</h3>
                  <div className="project-header-actions">
                    <span className={`status-badge status-${project.status?.toLowerCase()?.replace(' ', '-')}`}>
                      {project.status}
                    </span>
                    <button 
                      className="delete-project-btn"
                      onClick={(e) => handleDeleteProject(e, project._id)}
                      title="Delete project"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {project.description && (
                  <p className="project-description">{project.description}</p>
                )}
                
                {/* Milestone Badge */}
                {project.milestoneDate && (
                  <div className="project-milestone">
                    <span className="milestone-icon">🎯</span>
                    <span className="milestone-text">
                      {formatMilestoneDate(project.milestoneDate)}
                    </span>
                  </div>
                )}
                
                {project.members && project.members.length > 0 && (
                  <div className="project-collaborators">
                    <div className="collaborator-avatars">
                      {project.members.slice(0, 5).map((member, index) => (
                        <div 
                          key={member._id} 
                          className="collaborator-avatar"
                          title={`${member.name} (${member.email})`}
                          style={{
                            backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
                            zIndex: project.members.length - index
                          }}
                        >
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {project.members.length > 5 && (
                        <div className="collaborator-avatar more-count">
                          +{project.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="project-card-footer">
                  <div className="project-stats">
                    <span className="stat">
                      <strong>{project.taskCount || 0}</strong> Tasks
                    </span>
                  </div>
                  <div className="project-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${project.completionPercentage || 0}%` }}
                      />
                    </div>
                    <span className="progress-text">{project.completionPercentage || 0}%</span>
                  </div>
                  <div className="project-arrow">›</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Tasks View
  const renderTasksView = () => (
    <div className="projects-page">
      <div className="projects-header">
        <div className="projects-header-content">
          <button className="btn btn-outline btn-small" onClick={handleBackToProjects}>
            ← Back to Projects
          </button>
          <div className="project-title-section">
            <h1>{currentProject.title}</h1>
            <p>{currentProject.description}</p>
            {currentProject.members && currentProject.members.length > 0 && (
              <div className="project-team-info">
                <div className="team-members">
                  <span className="team-label">Team Members ({currentProject.members.length}):</span>
                  <div className="team-avatars">
                    {currentProject.members.map(member => (
                      <div 
                        key={member._id} 
                        className="team-member-avatar"
                        title={`${member.name} (${member.email})`}
                      >
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline btn-small" onClick={() => setShowTaskModal(true)}>
            ＋ New Task
          </button>
        </div>
      </div>

      {currentProject && !isDataReady && (
        <div className="loading-tasks">
          <p>Loading tasks...</p>
        </div>
      )}

      {currentProject && isDataReady && (
        <div className="kanban-board">
          {['To Do', 'In Progress', 'Completed'].map(status => (
            <div key={status} className="kanban-column">
              <div className="column-header" style={{ backgroundColor: getColumnColor(status) }}>
                <h3>{status}</h3>
                <span className="task-count">{tasksByStatus[status]?.length || 0}</span>
              </div>

              <div className="column-content">
                {(tasksByStatus[status] || []).map((task, index) => {
                  const taskId = task._id || task.id || `task-${index}`;
                  const statusOrder = ['To Do', 'In Progress', 'Completed'];
                  const currentStatusIndex = statusOrder.indexOf(status);
                  const canMoveForward = currentStatusIndex < statusOrder.length - 1;
                  const canMoveBackward = currentStatusIndex > 0;
                  
                  return (
                    <div key={`${status}-${taskId}`} className="task-card">
                      <div className="task-card-header">
                        <h4>{task.title}</h4>
                        <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.description && (
                        <p className="task-description">{task.description}</p>
                      )}
                      <div className="task-card-footer">
                        <span className="task-date">
                          📅 {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        {task.assignedTo && (
                          <div className="task-assignee">
                            {task.assignedTo.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="task-actions">
                        {canMoveBackward && (
                          <button 
                            className="btn btn-outline btn-small task-move-btn"
                            onClick={() => moveTaskToPreviousStatus(task)}
                            title={`Move to ${statusOrder[currentStatusIndex - 1]}`}
                          >
                            ← Back
                          </button>
                        )}
                        {canMoveForward && (
                          <button 
                            className="btn btn-primary btn-small task-move-btn"
                            onClick={() => moveTaskToNextStatus(task)}
                            title={`Move to ${statusOrder[currentStatusIndex + 1]}`}
                          >
                            Move →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(tasksByStatus[status] || []).length === 0 && (
                  <div className="empty-column">
                    <p>No tasks yet</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {viewMode === 'projects' ? renderProjectsList() : renderTasksView()}
      
      {showProjectModal && (
        <CreateProjectModal onClose={() => setShowProjectModal(false)} />
      )}

      {showTaskModal && currentProject && (
        <CreateTaskModal 
          projectId={currentProject._id}
          onClose={() => setShowTaskModal(false)} 
        />
      )}
    </>
  );
};

export default Projects;
