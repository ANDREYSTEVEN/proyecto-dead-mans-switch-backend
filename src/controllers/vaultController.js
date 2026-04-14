const prisma = require('../prismaClient');

const getVaultItems = async (req, res) => {
    try {
        const userId = req.user.userId;
        const items = await prisma.vaultItem.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createVaultItem = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, content } = req.body;
        const item = await prisma.vaultItem.create({
            data: { title, content, userId }
        });
        
        await prisma.log.create({
            data: { action: 'Bodega Segura: Archivo Creado', details: title, userId }
        });

        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteVaultItem = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const item = await prisma.vaultItem.findUnique({ where: { id: parseInt(id) } });

        if (!item || item.userId !== userId) {
            return res.status(403).json({ error: "Acceso denegado a este archivo" });
        }

        await prisma.vaultItem.delete({ where: { id: parseInt(id) } });
        
        await prisma.log.create({
            data: { action: 'Bodega Segura: Archivo Destruido', details: item.title, userId }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getVaultItems, createVaultItem, deleteVaultItem };
