const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { getSwitches, createSwitch, deleteSwitch, checkIn, getLogs } = require('../controllers/switchController');
const authMiddleware = require('../middleware/authMiddleware');

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);

// Protegidas: API Switches & Logs
router.get('/switches', authMiddleware, getSwitches);
router.post('/switches', authMiddleware, createSwitch);
router.delete('/switches/:id', authMiddleware, deleteSwitch);
router.post('/switches/:id/checkin', authMiddleware, checkIn);

router.get('/logs', authMiddleware, getLogs);

// Bóveda de archivos
const vaultRoutes = require('./vaultRoutes');
router.use('/vault', vaultRoutes);

module.exports = router;
