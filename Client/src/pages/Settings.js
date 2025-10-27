import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Settings.css';

const Settings = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    projectsCreated: 0,
    tasksCompleted: 0,
    completionRate: 0
  });

  useEffect(() => {
    fetchAccountStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccountStats = async () => {
    try {
      // Fetch projects created by user
      const projectsRes = await api.get('/api/projects');
      const userProjects = projectsRes.data.filter(p => p.createdBy === user?.id);
      
      // Fetch all tasks
      const tasksRes = await api.get('/api/tasks');
      const allTasks = tasksRes.data;
      
      // Calculate tasks completed
      const completedTasks = allTasks.filter(t => t.status === 'completed');
      
      // Calculate completion rate
      const totalTasks = allTasks.length;
      const completionRate = totalTasks > 0 
        ? Math.round((completedTasks.length / totalTasks) * 100) 
        : 0;

      setStats({
        projectsCreated: userProjects.length,
        tasksCompleted: completedTasks.length,
        completionRate
      });
    } catch (error) {
      console.error('Error fetching account stats:', error);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div className="settings-sections">
        <div className="settings-section">
          <h2>Profile Information</h2>
          <div className="profile-info">
            <div className="profile-avatar-large">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-details">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{user?.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{user?.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Member Since:</span>
                <span className="detail-value">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Account Statistics</h2>
          <div className="stats-grid-settings">
            <div className="stat-item">
              <div className="stat-icon">📁</div>
              <div className="stat-info">
                <div className="stat-label">Projects Created</div>
                <div className="stat-value">{stats.projectsCreated}</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon">✓</div>
              <div className="stat-info">
                <div className="stat-label">Tasks Completed</div>
                <div className="stat-value">{stats.tasksCompleted}</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-label">Completion Rate</div>
                <div className="stat-value">{stats.completionRate}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Notifications</h2>
          <div className="notification-settings">
            <div className="notification-item">
              <div>
                <h4>Email Notifications</h4>
                <p>Receive email updates about your tasks</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="notification-item">
              <div>
                <h4>Task Reminders</h4>
                <p>Get reminded about upcoming deadlines</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="notification-item">
              <div>
                <h4>Project Updates</h4>
                <p>Notifications when projects are updated</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-section danger-zone">
          <h2>Danger Zone</h2>
          <p className="section-description">
            Irreversible actions for your account
          </p>
          <button className="btn btn-danger">Delete Account</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
