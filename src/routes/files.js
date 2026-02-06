const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');
const database = require('../utils/database');

const router = express.Router();

const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024;
const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadDir, req.userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

router.post('/upload', verifyToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const fileId = uuidv4();
    const fileData = {
      id: fileId,
      userId: req.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
      path: req.file.path,
      mimetype: req.file.mimetype
    };

    database.createFile(fileData);

    res.status(201).json({
      message: 'Archivo subido exitosamente',
      file: {
        id: fileId,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: fileData.uploadedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/:fileId', verifyToken, (req, res) => {
  try {
    const file = database.getFileById(req.userId, req.params.fileId);

    if (!file) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.download(file.path, file.originalName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/list', verifyToken, (req, res) => {
  try {
    const userFiles = database.getFilesByUserId(req.userId);
    const storageUsage = database.getUserStorageUsage(req.userId);

    res.json({
      files: userFiles.map(f => ({
        id: f.id,
        originalName: f.originalName,
        size: f.size,
        uploadedAt: f.uploadedAt,
        mimetype: f.mimetype
      })),
      storageUsage,
      storageLimit: 1 * 1024 * 1024 * 1024,
      fileCount: userFiles.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/delete/:fileId', verifyToken, (req, res) => {
  try {
    const file = database.getFileById(req.userId, req.params.fileId);

    if (!file) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    database.deleteFile(req.userId, req.params.fileId);

    res.json({ message: 'Archivo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/info/:fileId', verifyToken, (req, res) => {
  try {
    const file = database.getFileById(req.userId, req.params.fileId);

    if (!file) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.json({
      id: file.id,
      originalName: file.originalName,
      size: file.size,
      uploadedAt: file.uploadedAt,
      mimetype: file.mimetype
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
