const express = require('express');
const router = express.Router();

const { register, login, setPanicPassword, verify2FA, getSecurityQuestions, addSecurityQuestion, deleteSecurityQuestion, verifyPassword, updatePassword, destroySessions } = require('../controllers/authController');
const { getSwitches, createSwitch, deleteSwitch, checkIn, getLogs, getAnalyticsData, broadcastAllSwitches } = require('../controllers/switchController');
const authMiddleware = require('../middleware/authMiddleware');

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/verify-2fa', verify2FA);
router.post('/auth/panic', authMiddleware, setPanicPassword);
router.post('/auth/verify-password', authMiddleware, verifyPassword);
router.post('/auth/update-password', authMiddleware, updatePassword);
router.post('/auth/destroy-sessions', authMiddleware, destroySessions);

// Security Questions API
router.get('/security-questions', authMiddleware, getSecurityQuestions);
router.post('/security-questions', authMiddleware, addSecurityQuestion);
router.delete('/security-questions/:id', authMiddleware, deleteSecurityQuestion);

// Protegidas: API Switches & Logs
router.get('/switches', authMiddleware, getSwitches);
router.post('/switches', authMiddleware, createSwitch);
router.delete('/switches/:id', authMiddleware, deleteSwitch);
router.post('/switches/:id/checkin', authMiddleware, checkIn);
router.post('/switches/broadcast-all', authMiddleware, broadcastAllSwitches);

router.get('/logs', authMiddleware, getLogs);
router.get('/analytics', authMiddleware, getAnalyticsData);

// Bóveda de archivos
const vaultRoutes = require('./vaultRoutes');
router.use('/vault', vaultRoutes);

module.exports = router;
