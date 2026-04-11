const express = require('express');
const router = express.Router();
const { getVaultItems, createVaultItem, deleteVaultItem } = require('../controllers/vaultController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', getVaultItems);
router.post('/', createVaultItem);
router.delete('/:id', deleteVaultItem);

module.exports = router;
