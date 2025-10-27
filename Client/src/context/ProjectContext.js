import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import api from '../utils/api';
import { getSocket } from '../utils/socket';

const ProjectContext = createContext();

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = getSocket();
    
    // Listen for project updates
    socket.on('projectCreated', (newProject) => {
      setProjects(prevProjects => [newProject, ...prevProjects]);
    });
    
    socket.on('projectUpdated', (updatedProject) => {
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project._id === updatedProject._id ? updatedProject : project
        )
      );
      
      if (currentProject?._id === updatedProject._id) {
        setCurrentProject(updatedProject);
      }
    });
    
    socket.on('projectDeleted', (projectId) => {
      setProjects(prevProjects => prevProjects.filter(project => project._id !== projectId));
      if (currentProject?._id === projectId) {
        setCurrentProject(null);
      }
    });

    return () => {
      socket.off('projectCreated');
      socket.off('projectUpdated');
      socket.off('projectDeleted');
    };
  }, [currentProject]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/projects');
      setProjects(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/projects/${id}`);
      setCurrentProject(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch project');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = async (projectData) => {
    try {
      setError(null);
      const response = await api.post('/api/projects', projectData);
      setProjects([response.data, ...projects]);
      return { success: true, data: response.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create project';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateProject = async (id, projectData) => {
    try {
      setError(null);
      const response = await api.put(`/api/projects/${id}`, projectData);
      setProjects(projects.map(p => p._id === id ? response.data : p));
      if (currentProject?._id === id) {
        setCurrentProject(response.data);
      }
      return { success: true, data: response.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update project';
      setError(message);
      return { success: false, error: message };
    }
  };

  const deleteProject = async (id) => {
    try {
      setError(null);
      await api.delete(`/api/projects/${id}`);
      setProjects(projects.filter(p => p._id !== id));
      if (currentProject?._id === id) {
        setCurrentProject(null);
      }
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete project';
      setError(message);
      return { success: false, error: message };
    }
  };

  const value = {
    projects,
    currentProject,
    loading,
    error,
    fetchProjects,
    fetchProjectById,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};
