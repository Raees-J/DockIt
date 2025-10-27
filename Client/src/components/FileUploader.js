import React, { useState } from 'react';
import axios from 'axios';

const FileUploader = ({ taskId, projectId, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      
      if (files.length === 1) {
        formData.append('file', files[0]);
        formData.append('taskId', taskId || '');
        formData.append('projectId', projectId || '');
        formData.append('type', taskId ? 'tasks' : 'projects');

        const response = await axios.post('/api/uploads/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.data.success) {
          onUploadSuccess && onUploadSuccess([response.data.file]);
        }
      } else {
        // Multiple files
        Array.from(files).forEach(file => formData.append('files', file));
        formData.append('taskId', taskId || '');
        formData.append('projectId', projectId || '');
        formData.append('type', taskId ? 'tasks' : 'projects');

        const response = await axios.post('/api/uploads/upload-multiple', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.data.success) {
          onUploadSuccess && onUploadSuccess(response.data.files);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file(s)');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleInputChange = (e) => {
    handleFileUpload(e.target.files);
  };

  return (
    <div className="file-uploader">
      <div 
        className={`upload-area ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="upload-progress">
            <div className="spinner"></div>
            <p>Uploading to Google Cloud...</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">☁️</div>
            <p>Drag & drop files here or click to browse</p>
            <p className="file-info">Supports: Images, Documents, Archives (Max 5MB each)</p>
            <input
              type="file"
              multiple
              onChange={handleInputChange}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip"
              className="file-input"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default FileUploader;