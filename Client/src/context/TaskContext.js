import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import api from '../utils/api';
import { getSocket } from '../utils/socket';

const TaskContext = createContext();

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = getSocket();
    
    // Listen for task updates
    socket.on('taskCreated', (newTask) => {
      setTasks(prevTasks => [newTask, ...prevTasks]);
    });
    
    socket.on('taskUpdated', (updatedTask) => {
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task._id === updatedTask._id ? updatedTask : task
        )
      );
    });
    
    socket.on('taskDeleted', (taskId) => {
      setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
    });

    return () => {
      socket.off('taskCreated');
      socket.off('taskUpdated');
      socket.off('taskDeleted');
    };
  }, []);

  const fetchTasks = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/api/tasks${params ? `?${params}` : ''}`);
      setTasks(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTaskById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/tasks/${id}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch task');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = async (taskData) => {
    try {
      setError(null);
      const response = await api.post('/api/tasks', taskData);
      // Don't add to local state here - socket listener will handle it for real-time sync
      // setTasks([response.data, ...tasks]);
      return { success: true, data: response.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create task';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateTask = async (id, taskData) => {
    try {
      setError(null);
      const response = await api.put(`/api/tasks/${id}`, taskData);
      // Don't update local state here - socket listener will handle it for real-time sync
      // setTasks(tasks.map(t => t._id === id ? response.data : t));
      return { success: true, data: response.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update task';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateTaskStatus = async (id, status) => {
    try {
      setError(null);
      const response = await api.patch(`/api/tasks/${id}/status`, { status });
      // Don't update local state here - socket listener will handle it for real-time sync
      // setTasks(tasks.map(t => t._id === id ? response.data : t));
      return { success: true, data: response.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update task status';
      setError(message);
      return { success: false, error: message };
    }
  };

  const deleteTask = async (id) => {
    try {
      setError(null);
      await api.delete(`/api/tasks/${id}`);
      setTasks(tasks.filter(t => t._id !== id));
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete task';
      setError(message);
      return { success: false, error: message };
    }
  };

  const value = {
    tasks,
    loading,
    error,
    fetchTasks,
    fetchTaskById,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    setTasks
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
