import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { tasks, fetchTasks } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const [stats, setStats] = useState({
    totalTasks: 0,
    todayTasks: 0,
    completedTasks: 0,
    upcomingDeadlines: 0
  });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  useEffect(() => {
    if (tasks.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTasks = tasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const upcomingDeadlines = tasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate <= nextWeek && task.status !== 'Completed';
      });

      setStats({
        totalTasks: tasks.length,
        todayTasks: todayTasks.length,
        completedTasks: tasks.filter(t => t.status === 'Completed').length,
        upcomingDeadlines: upcomingDeadlines.length
      });
    }
  }, [tasks]);

  const getTasksForToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks.filter(task => {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }).slice(0, 5);
  };

  const getUpcomingTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks
      .filter(task => new Date(task.dueDate) > today && task.status !== 'Completed')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name}! 👋</h1>
          <p>Here's what's happening with your tasks today</p>
        </div>
        <Link to="/projects" className="btn btn-primary">
          + New Project
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalTasks}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.todayTasks}</div>
            <div className="stat-label">Due Today</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>✓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completedTasks}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2' }}>⚡</div>
          <div className="stat-content">
            <div className="stat-value">{stats.upcomingDeadlines}</div>
            <div className="stat-label">Upcoming (7 days)</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Today's Tasks</h2>
            <Link to="/calendar" className="section-link">View Calendar →</Link>
          </div>
          
          <div className="task-list">
            {getTasksForToday().length > 0 ? (
              getTasksForToday().map(task => (
                <div key={task._id} className="task-item">
                  <div className="task-checkbox">
                    <input type="checkbox" checked={task.status === 'Completed'} readOnly />
                  </div>
                  <div className="task-details">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className="task-project">{task.parentProject?.title}</span>
                      <span className={`priority-badge priority-${task.priority?.toLowerCase()}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <span className={`status-badge status-${task.status.toLowerCase().replace(' ', '')}`}>
                    {task.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>🎉 No tasks due today! You're all caught up.</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>Upcoming Deadlines</h2>
            <Link to="/projects" className="section-link">View All →</Link>
          </div>
          
          <div className="task-list">
            {getUpcomingTasks().length > 0 ? (
              getUpcomingTasks().map(task => (
                <div key={task._id} className="task-item">
                  <div className="task-checkbox">
                    <input type="checkbox" checked={task.status === 'Completed'} readOnly />
                  </div>
                  <div className="task-details">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className="task-project">{task.parentProject?.title}</span>
                      <span className="task-due">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className={`status-badge status-${task.status.toLowerCase().replace(' ', '')}`}>
                    {task.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>📋 No upcoming tasks in the next week.</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>Active Projects</h2>
            <Link to="/projects" className="section-link">View All →</Link>
          </div>
          
          <div className="projects-grid">
            {projects.slice(0, 4).map(project => (
              <div key={project._id} className="project-card-mini">
                <h3>{project.title}</h3>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${project.completionPercentage || 0}%` }}
                    ></div>
                  </div>
                  <span>{project.completionPercentage || 0}%</span>
                </div>
                <div className="project-meta">
                  <span>{project.taskCount || 0} tasks</span>
                  <span className="project-status">{project.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
