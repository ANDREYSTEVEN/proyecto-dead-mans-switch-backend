const prisma = require('../prismaClient');

const getSwitches = async (req, res) => {
    // Si authMiddleware dice req.user.id en vault, asumo authController usa userId o id. Reviso: userId.
    const userId = req.user.userId || req.user.id;
    const switches = await prisma.switch.findMany({ 
        where: { userId },
        include: { vaultItems: true } // Incluimos VaultItems!
    });
    
    const parsed = switches.map(sw => ({ 
        ...sw, 
        targetTime: Number(sw.targetTime),
        durationMs: Number(sw.durationMs)
    }));
    res.json(parsed);
};

const createSwitch = async (req, res) => {
    const { name, alertEmail, days = 0, hours = 0, minutes = 0, vaultItemIds = [] } = req.body;
    const userId = req.user.userId || req.user.id;
    
    // Cálculo de tiempo super granular
    const totalDurationMs = (Number(days) * 86400000) + (Number(hours) * 3600000) + (Number(minutes) * 60000);
    const targetTimeMs = Date.now() + totalDurationMs;

    const newSwitch = await prisma.switch.create({
        data: {
            name, 
            alertEmail, 
            targetTime: targetTimeMs, 
            durationMs: totalDurationMs,
            status: 'ACTIVE', 
            userId,
            vaultItems: {
                connect: vaultItemIds.map(id => ({ id: Number(id) }))
            }
        },
        include: { vaultItems: true }
    });

    await prisma.log.create({ data: { action: "Protocolo Reforzado Creado", details: name, userId } });
    
    res.json({ ...newSwitch, targetTime: Number(newSwitch.targetTime), durationMs: Number(newSwitch.durationMs) });
};

const deleteSwitch = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    const sw = await prisma.switch.findFirst({ where: { id: Number(id), userId } });
    if (!sw) return res.status(404).json({ error: "No encontrado" });

    // Prisma M:N on delete is safe natively
    await prisma.switch.delete({ where: { id: sw.id } });
    await prisma.log.create({ data: { action: "Protocolo Destruido", details: sw.name, userId } });

    res.json({ message: "Eliminado con éxito" });
};

const checkIn = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    const sw = await prisma.switch.findFirst({ where: { id: Number(id), userId } });
    if (!sw) return res.status(404).json({ error: "No encontrado" });

    // Respeta la duración personalizada original o le da 24hs si vino de un switch antiguo
    const duration = sw.durationMs ? Number(sw.durationMs) : 86400000;
    const newTarget = Date.now() + duration;

    const updated = await prisma.switch.update({
        where: { id: sw.id },
        data: { targetTime: newTarget, status: 'ACTIVE' },
        include: { vaultItems: true }
    });

    await prisma.log.create({ data: { action: "Check-in Vital Cifrado", details: sw.name, userId } });
    res.json({ ...updated, targetTime: Number(updated.targetTime), durationMs: Number(updated.durationMs) });
};

const getLogs = async (req, res) => {
    const userId = req.user.userId || req.user.id;
    const logs = await prisma.log.findMany({ 
        where: { userId },
        orderBy: { date: 'desc' }
    });
    res.json(logs);
};

module.exports = { getSwitches, createSwitch, deleteSwitch, checkIn, getLogs };
