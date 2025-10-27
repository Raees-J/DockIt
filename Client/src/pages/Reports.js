import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Reports.css';

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/api/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="reports-page">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="reports-page">
        <h1>Reports & Analytics</h1>
        <p>No data available</p>
      </div>
    );
  }

  const statusData = [
    { name: 'To Do', value: reports.statusBreakdown.toDo.count, color: '#3b82f6' },
    { name: 'In Progress', value: reports.statusBreakdown.inProgress.count, color: '#f59e0b' },
    { name: 'Completed', value: reports.statusBreakdown.completed.count, color: '#10b981' }
  ];

  const priorityData = [
    { name: 'High', count: reports.priorityBreakdown.high },
    { name: 'Medium', count: reports.priorityBreakdown.medium },
    { name: 'Low', count: reports.priorityBreakdown.low }
  ];

  const getHealthColor = (status) => {
    switch (status) {
      case 'good':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const handleProjectClick = (project, event) => {
    setExpandedProject(project);
  };

  const closeExpandedView = () => {
    setExpandedProject(null);
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Track your productivity and project health</p>
        </div>
      </div>

      <div className="overview-cards">
        <div className="overview-card">
          <div className="card-icon" style={{ background: '#dbeafe' }}>📊</div>
          <div className="card-content">
            <h3>Total Tasks</h3>
            <div className="card-value">{reports.overview.totalTasks}</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon" style={{ background: '#d1fae5' }}>✓</div>
          <div className="card-content">
            <h3>Completed</h3>
            <div className="card-value">{reports.overview.completedTasks}</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon" style={{ background: '#fef3c7' }}>🎯</div>
          <div className="card-content">
            <h3>Completion Rate</h3>
            <div className="card-value">{reports.overview.completionRate}%</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon" style={{ background: '#fee2e2' }}>⚠️</div>
          <div className="card-content">
            <h3>Overdue</h3>
            <div className="card-value">{reports.overview.overdueTasks}</div>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-card">
          <h3>Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <div><span className="legend-dot" style={{ background: '#3b82f6' }}></span> To Do: {reports.statusBreakdown.toDo.count}</div>
            <div><span className="legend-dot" style={{ background: '#f59e0b' }}></span> In Progress: {reports.statusBreakdown.inProgress.count}</div>
            <div><span className="legend-dot" style={{ background: '#10b981' }}></span> Completed: {reports.statusBreakdown.completed.count}</div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Tasks by Priority</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="project-health-section">
        <h2>Project Health Overview</h2>
        <div className="projects-health-list">
          {reports.projectHealth.map((project) => (
            <div 
              key={project.projectId} 
              className="project-health-card"
              onClick={(e) => handleProjectClick(project, e)}
            >
              <div className="project-health-header">
                <h3>{project.projectTitle}</h3>
                <span 
                  className="health-badge"
                  style={{ background: getHealthColor(project.healthStatus) }}
                >
                  {project.healthStatus}
                </span>
              </div>
              
              <div className="project-metrics">
                <div className="metric">
                  <span className="metric-label">Total Tasks</span>
                  <span className="metric-value">{project.totalTasks}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Completed</span>
                  <span className="metric-value">{project.completedTasks}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Completion</span>
                  <span className="metric-value">{project.completionPercentage}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Upcoming Deadlines</span>
                  <span className="metric-value">{project.upcomingDeadlines}</span>
                </div>
              </div>

              <div className="project-progress-bar">
                <div 
                  className="project-progress-fill"
                  style={{ 
                    width: `${project.completionPercentage}%`,
                    background: getHealthColor(project.healthStatus)
                  }}
                ></div>
              </div>

              {project.milestoneDate && (
                <div className="project-milestone">
                  Milestone: {new Date(project.milestoneDate).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {expandedProject && (
        <>
          <div className="expanded-overlay" onClick={closeExpandedView}></div>
          <div className="expanded-card">
            <button className="expanded-close" onClick={closeExpandedView}>✕</button>
            
            <div className="expanded-content">
              <div className="expanded-header">
                <div 
                  className="expanded-icon project-icon"
                  style={{ background: getHealthColor(expandedProject.healthStatus) }}
                >
                  📊
                </div>
                <div>
                  <div className="expanded-type">Project Health Report</div>
                  <h2 className="expanded-title">{expandedProject.projectTitle}</h2>
                </div>
              </div>

              <div className="expanded-body">
                <div className="expanded-section">
                  <div className="expanded-label">Health Status</div>
                  <div 
                    className="expanded-badge"
                    style={{ 
                      background: getHealthColor(expandedProject.healthStatus),
                      color: 'white'
                    }}
                  >
                    {expandedProject.healthStatus.toUpperCase()}
                  </div>
                </div>

                <div className="expanded-metrics-grid">
                  <div className="expanded-metric-card">
                    <div className="metric-icon">📋</div>
                    <div className="metric-details">
                      <div className="metric-label">Total Tasks</div>
                      <div className="metric-value">{expandedProject.totalTasks}</div>
                    </div>
                  </div>

                  <div className="expanded-metric-card">
                    <div className="metric-icon">✅</div>
                    <div className="metric-details">
                      <div className="metric-label">Completed</div>
                      <div className="metric-value">{expandedProject.completedTasks}</div>
                    </div>
                  </div>

                  <div className="expanded-metric-card">
                    <div className="metric-icon">📈</div>
                    <div className="metric-details">
                      <div className="metric-label">Completion Rate</div>
                      <div className="metric-value">{expandedProject.completionPercentage}%</div>
                    </div>
                  </div>

                  <div className="expanded-metric-card">
                    <div className="metric-icon">⏰</div>
                    <div className="metric-details">
                      <div className="metric-label">Upcoming Deadlines</div>
                      <div className="metric-value">{expandedProject.upcomingDeadlines}</div>
                    </div>
                  </div>
                </div>

                <div className="expanded-section">
                  <div className="expanded-label">Progress</div>
                  <div className="expanded-progress-container">
                    <div className="expanded-progress-bar">
                      <div 
                        className="expanded-progress-fill"
                        style={{ 
                          width: `${expandedProject.completionPercentage}%`,
                          background: getHealthColor(expandedProject.healthStatus)
                        }}
                      ></div>
                    </div>
                    <span className="expanded-progress-text">
                      {expandedProject.completionPercentage}% Complete
                    </span>
                  </div>
                </div>

                {expandedProject.milestoneDate && (
                  <div className="expanded-section">
                    <div className="expanded-label">Next Milestone</div>
                    <div className="expanded-value">
                      📅 {new Date(expandedProject.milestoneDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}

                <div className="expanded-section">
                  <div className="expanded-label">Status Breakdown</div>
                  <div className="status-breakdown">
                    <div className="status-item">
                      <div className="status-item-header">
                        <span className="status-dot" style={{ background: '#3b82f6' }}></span>
                        <span>To Do</span>
                      </div>
                      <span className="status-count">
                        {expandedProject.totalTasks - expandedProject.completedTasks - Math.floor(expandedProject.totalTasks * 0.3)}
                      </span>
                    </div>
                    <div className="status-item">
                      <div className="status-item-header">
                        <span className="status-dot" style={{ background: '#f59e0b' }}></span>
                        <span>In Progress</span>
                      </div>
                      <span className="status-count">
                        {Math.floor(expandedProject.totalTasks * 0.3)}
                      </span>
                    </div>
                    <div className="status-item">
                      <div className="status-item-header">
                        <span className="status-dot" style={{ background: '#10b981' }}></span>
                        <span>Completed</span>
                      </div>
                      <span className="status-count">{expandedProject.completedTasks}</span>
                    </div>
                  </div>
                </div>

                {expandedProject.healthStatus === 'critical' && (
                  <div className="expanded-section">
                    <div className="expanded-alert critical">
                      <span className="alert-icon">⚠️</span>
                      <div>
                        <div className="alert-title">Critical Health Alert</div>
                        <div className="alert-message">
                          This project requires immediate attention. Consider reviewing deadlines and task priorities.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {expandedProject.healthStatus === 'warning' && (
                  <div className="expanded-section">
                    <div className="expanded-alert warning">
                      <span className="alert-icon">⚡</span>
                      <div>
                        <div className="alert-title">Attention Needed</div>
                        <div className="alert-message">
                          This project may need additional resources or timeline adjustments.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {expandedProject.healthStatus === 'good' && (
                  <div className="expanded-section">
                    <div className="expanded-alert success">
                      <span className="alert-icon">🎉</span>
                      <div>
                        <div className="alert-title">On Track!</div>
                        <div className="alert-message">
                          This project is progressing well and meeting its targets.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
