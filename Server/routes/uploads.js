const express = require('express');
const { upload, uploadToGCS, deleteFromGCS } = require('../services/googleCloudStorage');
const { logUserActivity } = require('../services/googleFirestore');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Upload file for tasks/projects
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { taskId, projectId, type } = req.body;
    const timestamp = Date.now();
    const fileName = `${type}/${req.user.id}/${timestamp}_${req.file.originalname}`;

    // Upload to Google Cloud Storage
    const fileUrl = await uploadToGCS(req.file, fileName);

    // Log activity
    await logUserActivity(req.user.id, 'file_upload', {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      taskId,
      projectId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      file: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading file',
      error: error.message 
    });
  }
});

// Delete file
router.delete('/delete/:filename', protect, async (req, res) => {
  try {
    const { filename } = req.params;
    const success = await deleteFromGCS(filename);

    if (success) {
      await logUserActivity(req.user.id, 'file_delete', {
        fileName: filename,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'File not found' });
    }
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting file',
      error: error.message 
    });
  }
});

// Upload multiple files
router.post('/upload-multiple', protect, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { taskId, projectId, type } = req.body;
    const uploadPromises = req.files.map(async (file) => {
      const timestamp = Date.now();
      const fileName = `${type}/${req.user.id}/${timestamp}_${file.originalname}`;
      const fileUrl = await uploadToGCS(file, fileName);
      
      return {
        url: fileUrl,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        uploadedAt: new Date()
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    // Log activity
    await logUserActivity(req.user.id, 'multiple_file_upload', {
      fileCount: req.files.length,
      totalSize: req.files.reduce((sum, file) => sum + file.size, 0),
      taskId,
      projectId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading files',
      error: error.message 
    });
  }
});

module.exports = router;