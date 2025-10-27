const multer = require('multer');
const path = require('path');

// Configure multer for file uploads (local storage for now)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, documents, and archives are allowed!'));
    }
  },
});

// Mock functions for now (will be replaced with actual Google Cloud Storage later)
const uploadToGCS = async (file, destination) => {
  // For now, just return a mock URL
  console.log(`Mock upload: ${file.originalname} to ${destination}`);
  return `https://mock-storage.example.com/${destination}`;
};

const deleteFromGCS = async (filename) => {
  // Mock delete function
  console.log(`Mock delete: ${filename}`);
  return true;
};

module.exports = {
  upload,
  uploadToGCS,
  deleteFromGCS,
};