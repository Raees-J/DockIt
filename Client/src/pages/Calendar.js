import React, { useEffect, useState } from 'react';
import { useTasks } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfDay, addMonths } from 'date-fns';
import './Calendar.css';

const Calendar = () => {
  const { tasks, fetchTasks } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'day', 'week', 'month'
  const [weekDays, setWeekDays] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null); // { type: 'task'|'project', data: {...} }
  const [expandedPosition, setExpandedPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  useEffect(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      const days = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(start, i));
      }
      setWeekDays(days);
    } else if (viewMode === 'day') {
      setWeekDays([currentDate]);
    } else if (viewMode === 'month') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start, end });
      setWeekDays(days);
    }
  }, [currentDate, viewMode]);

  const getTasksForDay = (day) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, day);
    });
  };

  const getProjectsForDay = (day) => {
    return projects.filter(project => {
      if (!project.milestoneDate) return false;
      const milestoneDate = new Date(project.milestoneDate);
      return isSameDay(milestoneDate, day);
    });
  };

  const goToPreviousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const goToPreviousDay = () => {
    setCurrentDate(addDays(currentDate, -1));
  };

  const goToNextDay = () => {
    setCurrentDate(addDays(currentDate, 1));
  };

  const handlePrevious = () => {
    if (viewMode === 'day') goToPreviousDay();
    else if (viewMode === 'week') goToPreviousWeek();
    else if (viewMode === 'month') goToPreviousMonth();
  };

  const handleNext = () => {
    if (viewMode === 'day') goToNextDay();
    else if (viewMode === 'week') goToNextWeek();
    else if (viewMode === 'month') goToNextMonth();
  };

  const getNavigationLabel = () => {
    if (viewMode === 'day') return format(currentDate, 'MMMM d, yyyy');
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  };

  const handleTaskClick = (task, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setExpandedPosition({ x: rect.left, y: rect.top });
    setExpandedItem({ type: 'task', data: task });
  };

  const handleProjectClick = (project, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setExpandedPosition({ x: rect.left, y: rect.top });
    setExpandedItem({ type: 'project', data: project });
  };

  const closeExpandedView = () => {
    setExpandedItem(null);
  };

  const getTaskColor = (priority) => {
    const colors = {
      'High': '#ff6b9d',
      'Medium': '#c084fc',
      'Low': '#60d394'
    };
    return colors[priority] || '#94a3b8';
  };

  const getProjectColor = (status) => {
    const colors = {
      'Planning': '#fbbf24',
      'In Progress': '#60d394',
      'Review': '#c084fc',
      'Completed': '#94a3b8'
    };
    return colors[status] || '#3b82f6';
  };

  const getTimeFromDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return format(d, 'h:mm a');
  };

  const calculateCardHeight = (task) => {
    // Calculate dynamic height based on content
    let baseHeight = 70; // Base height for title + priority
    
    if (task.dueDate) baseHeight += 25; // Due date/time
    if (task.status) baseHeight += 28; // Status indicator
    if (task.project) baseHeight += 25; // Project label
    if (task.assignedTo) baseHeight += 36; // Assignee avatar
    
    return baseHeight;
  };

  const calculateProjectCardHeight = (project) => {
    // Calculate dynamic height based on project content
    let baseHeight = 70; // Base height for title + status
    
    if (project.milestoneDate) baseHeight += 25; // Milestone date
    if (project.description) baseHeight += 30; // Description
    if (project.members && project.members.length > 0) baseHeight += 36; // Members
    
    return baseHeight;
  };

  const calculateCardTop = (task) => {
    // Calculate position based on task time
    if (!task.dueDate && !task.dueTime) {
      // Default to 9 AM if no time specified
      return 60; // 9 AM position (8 AM is 0, so 1 hour = 60px)
    }

    let hour = 9; // Default to 9 AM
    let minutes = 0;

    // Parse time from dueTime field if available
    if (task.dueTime) {
      const timeStr = task.dueTime.toLowerCase().trim();
      const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      
      if (timeMatch) {
        hour = parseInt(timeMatch[1]);
        minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3] || '';
        
        // Convert to 24-hour format
        if (meridiem === 'pm' && hour !== 12) {
          hour += 12;
        } else if (meridiem === 'am' && hour === 12) {
          hour = 0;
        }
      }
    } else if (task.dueDate) {
      // Try to extract time from dueDate
      const date = new Date(task.dueDate);
      hour = date.getHours();
      minutes = date.getMinutes();
    }

    // Calendar starts at 8 AM (hour 8)
    const startHour = 8;
    const hoursSinceStart = hour - startHour;
    const pixelsPerHour = 60; // Each hour slot is 60px tall
    
    // Calculate position: hours * 60px + (minutes/60 * 60px)
    const topPosition = (hoursSinceStart * pixelsPerHour) + (minutes / 60 * pixelsPerHour);
    
    // Ensure position is within bounds (0 to 780px for 13 hours)
    return Math.max(0, Math.min(topPosition, 720));
  };

  const calculateProjectCardTop = (project) => {
    // Projects default to 10 AM if no specific time
    return 120; // 10 AM position (2 hours after 8 AM start)
  };

  const renderDayView = () => {
    const dayTasks = getTasksForDay(currentDate);
    const dayProjects = getProjectsForDay(currentDate);
    const isToday = isSameDay(currentDate, new Date());

    return (
      <div className="calendar-week-view">
        <div className="time-column">
          {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
            <div key={hour} className="time-slot">
              {hour}:00
            </div>
          ))}
        </div>

        <div className="days-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className={`day-column ${isToday ? 'today' : ''}`}>
            <div className="day-header-compact">
              <div className="day-date">{format(currentDate, 'd')}</div>
              <div className="day-name-small">{format(currentDate, 'EEEE')}</div>
            </div>

            <div className="day-events">
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className="grid-line"></div>
              ))}

              {dayTasks.map((task, taskIndex) => {
                const color = getTaskColor(task.priority);
                const top = calculateCardTop(task);
                const height = calculateCardHeight(task);
                
                return renderTaskCard(task, color, top, height);
              })}

              {dayProjects.map((project, projIndex) => {
                const color = getProjectColor(project.status);
                const top = calculateProjectCardTop(project);
                const height = calculateProjectCardHeight(project);
                
                return renderProjectCard(project, color, top, height);
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="calendar-week-view">
        <div className="time-column">
          {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
            <div key={hour} className="time-slot">
              {hour}:00
            </div>
          ))}
        </div>

        <div className="days-grid">
          {weekDays.map((day, dayIndex) => {
            const dayTasks = getTasksForDay(day);
            const dayProjects = getProjectsForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div key={dayIndex} className={`day-column ${isToday ? 'today' : ''}`}>
                <div className="day-header-compact">
                  <div className="day-date">{format(day, 'd')}</div>
                  <div className="day-name-small">{format(day, 'EEE')}</div>
                </div>

                <div className="day-events">
                  {Array.from({ length: 13 }).map((_, i) => (
                    <div key={i} className="grid-line"></div>
                  ))}

                  {dayTasks.map((task, taskIndex) => {
                    const color = getTaskColor(task.priority);
                    const top = calculateCardTop(task);
                    const height = calculateCardHeight(task);
                    
                    return renderTaskCard(task, color, top, height);
                  })}

                  {dayProjects.map((project, projIndex) => {
                    const color = getProjectColor(project.status);
                    const top = calculateProjectCardTop(project);
                    const height = calculateProjectCardHeight(project);
                    
                    return renderProjectCard(project, color, top, height);
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 34); // 5 weeks
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="calendar-month-view">
        <div className="month-grid-header">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="month-day-name">{day}</div>
          ))}
        </div>
        
        <div className="month-grid-body">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="month-week-row">
              {week.map((day, dayIndex) => {
                const dayTasks = getTasksForDay(day);
                const dayProjects = getProjectsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                return (
                  <div 
                    key={dayIndex} 
                    className={`month-day-cell ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                  >
                    <div className="month-day-number">{format(day, 'd')}</div>
                    
                    <div className="month-day-events">
                      {dayTasks.slice(0, 2).map(task => (
                        <div 
                          key={task._id} 
                          className="month-event-badge task-badge"
                          style={{ borderLeftColor: getTaskColor(task.priority) }}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayProjects.slice(0, 1).map(project => (
                        <div 
                          key={project._id} 
                          className="month-event-badge project-badge"
                          style={{ borderLeftColor: getProjectColor(project.status) }}
                        >
                          📋 {project.title || project.name}
                        </div>
                      ))}
                      {(dayTasks.length + dayProjects.length > 3) && (
                        <div className="month-event-more">
                          +{dayTasks.length + dayProjects.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTaskCard = (task, color, top, height) => {
    return (
      <div 
        key={task._id} 
        className={`event-card task-event ${task.status === 'Completed' ? 'completed' : ''}`}
        style={{
          backgroundColor: color,
          top: `${top}px`,
          height: `${height}px`
        }}
        onClick={(e) => handleTaskClick(task, e)}
      >
        <div className="event-header">
          <div className="event-header-left">
            <input 
              type="checkbox" 
              className="task-checkbox" 
              checked={task.status === 'Completed'}
              readOnly
            />
            <span className="event-title">{task.title}</span>
          </div>
          <span className={`priority-badge ${task.priority?.toLowerCase()}`}>
            {task.priority}
          </span>
        </div>
        
        <div className="event-time">
          📅 {format(new Date(task.dueDate), 'MMM d')} • {task.dueTime || '9:00 AM'}
        </div>
        
        {task.status && (
          <div className="task-status">
            <span className={`status-indicator status-${task.status.toLowerCase().replace(' ', '-')}`}>
              {task.status}
            </span>
          </div>
        )}
        
        {task.project && (
          <div className="task-project-label">
            📁 {task.project.title || task.project}
          </div>
        )}
        
        {task.assignedTo && (
          <div className="event-assignees">
            <div className="avatar-group">
              <div className="avatar" title={task.assignedTo.name}>
                {task.assignedTo.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProjectCard = (project, color, top, height) => {
    return (
      <div 
        key={project._id} 
        className="event-card project-event"
        style={{
          backgroundColor: color,
          top: `${top}px`,
          height: `${height}px`
        }}
        onClick={(e) => handleProjectClick(project, e)}
      >
        <div className="event-header">
          <div className="event-header-left">
            <span className="project-icon">📋</span>
            <span className="event-title">{project.title || project.name}</span>
          </div>
          <span className="project-status-badge">{project.status}</span>
        </div>
        
        {project.milestoneDate && (
          <div className="event-time">
            🎯 Milestone: {format(new Date(project.milestoneDate), 'MMM d, yyyy')}
          </div>
        )}
        
        {project.description && (
          <div className="event-description">
            {project.description.substring(0, 60)}{project.description.length > 60 ? '...' : ''}
          </div>
        )}
        
        {project.members && project.members.length > 0 && (
          <div className="event-assignees">
            <div className="avatar-group">
              {project.members.slice(0, 3).map((member, i) => (
                <div key={i} className="avatar" title={member.name}>
                  {member.name?.charAt(0) || 'M'}
                </div>
              ))}
              {project.members.length > 3 && (
                <div className="avatar">+{project.members.length - 3}</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="calendar-page">
      <div className="calendar-top-bar">
        <div className="calendar-month-selector">
          <button className="month-nav-btn" onClick={handlePrevious}>◀</button>
          <h2>{getNavigationLabel()}</h2>
          <button className="month-nav-btn" onClick={handleNext}>▶</button>
        </div>
        
        <div className="calendar-search">
          <input type="text" placeholder="Search event, tasks, meetings..." />
        </div>

        <div className="calendar-actions">
          <div className="view-mode-buttons" data-active={viewMode}>
            <button 
              className={`view-mode-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
          <button className="btn-icon" onClick={goToToday}>📅 Today</button>
        </div>
      </div>

      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {expandedItem && (
        <>
          <div className="expanded-overlay" onClick={closeExpandedView}></div>
          <div className="expanded-card">
            <button className="expanded-close" onClick={closeExpandedView}>✕</button>
            
            {expandedItem.type === 'task' && (
              <div className="expanded-content">
                <div className="expanded-header">
                  <div className="expanded-icon task-icon">✓</div>
                  <div>
                    <div className="expanded-type">Task</div>
                    <h2 className="expanded-title">{expandedItem.data.title}</h2>
                  </div>
                </div>

                <div className="expanded-body">
                  <div className="expanded-section">
                    <div className="expanded-label">Status</div>
                    <div className={`expanded-badge status-${expandedItem.data.status?.toLowerCase().replace(' ', '-')}`}>
                      {expandedItem.data.status || 'Not Started'}
                    </div>
                  </div>

                  <div className="expanded-section">
                    <div className="expanded-label">Priority</div>
                    <div className={`expanded-badge priority-${expandedItem.data.priority?.toLowerCase()}`}>
                      <span className={`priority-dot ${expandedItem.data.priority?.toLowerCase()}`}></span>
                      {expandedItem.data.priority || 'Medium'}
                    </div>
                  </div>

                  <div className="expanded-section">
                    <div className="expanded-label">Due Date</div>
                    <div className="expanded-value">
                      📅 {expandedItem.data.dueDate ? format(new Date(expandedItem.data.dueDate), 'MMMM d, yyyy') : 'No due date'}
                      {expandedItem.data.dueTime && ` • ${expandedItem.data.dueTime}`}
                    </div>
                  </div>

                  {expandedItem.data.description && (
                    <div className="expanded-section">
                      <div className="expanded-label">Description</div>
                      <div className="expanded-value">{expandedItem.data.description}</div>
                    </div>
                  )}

                  {expandedItem.data.project && (
                    <div className="expanded-section">
                      <div className="expanded-label">Project</div>
                      <div className="expanded-value">
                        📁 {expandedItem.data.project.title || expandedItem.data.project}
                      </div>
                    </div>
                  )}

                  {expandedItem.data.assignedTo && (
                    <div className="expanded-section">
                      <div className="expanded-label">Assigned To</div>
                      <div className="expanded-assignee">
                        <div className="expanded-avatar">
                          {expandedItem.data.assignedTo.name?.charAt(0) || 'U'}
                        </div>
                        <span>{expandedItem.data.assignedTo.name || 'Unassigned'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {expandedItem.type === 'project' && (
              <div className="expanded-content">
                <div className="expanded-header">
                  <div className="expanded-icon project-icon">📋</div>
                  <div>
                    <div className="expanded-type">Project</div>
                    <h2 className="expanded-title">{expandedItem.data.title || expandedItem.data.name}</h2>
                  </div>
                </div>

                <div className="expanded-body">
                  <div className="expanded-section">
                    <div className="expanded-label">Status</div>
                    <div className={`expanded-badge status-${expandedItem.data.status?.toLowerCase().replace(' ', '-')}`}>
                      {expandedItem.data.status || 'Planning'}
                    </div>
                  </div>

                  {expandedItem.data.milestoneDate && (
                    <div className="expanded-section">
                      <div className="expanded-label">Milestone Date</div>
                      <div className="expanded-value">
                        📅 {format(new Date(expandedItem.data.milestoneDate), 'MMMM d, yyyy')}
                      </div>
                    </div>
                  )}

                  {expandedItem.data.description && (
                    <div className="expanded-section">
                      <div className="expanded-label">Description</div>
                      <div className="expanded-value">{expandedItem.data.description}</div>
                    </div>
                  )}

                  <div className="expanded-section">
                    <div className="expanded-label">Tasks</div>
                    <div className="expanded-tasks">
                      {tasks
                        .filter(task => 
                          task.project?._id === expandedItem.data._id || 
                          task.project === expandedItem.data._id
                        )
                        .map(task => (
                          <div key={task._id} className="expanded-task-item">
                            <input 
                              type="checkbox" 
                              checked={task.status === 'Completed'}
                              readOnly
                            />
                            <span className={task.status === 'Completed' ? 'completed-text' : ''}>
                              {task.title}
                            </span>
                            <span className={`expanded-task-priority ${task.priority?.toLowerCase()}`}>
                              {task.priority}
                            </span>
                          </div>
                        ))}
                      {tasks.filter(task => 
                        task.project?._id === expandedItem.data._id || 
                        task.project === expandedItem.data._id
                      ).length === 0 && (
                        <div className="expanded-empty">No tasks yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Calendar;
