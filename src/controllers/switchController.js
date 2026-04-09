const prisma = require('../prismaClient');

const getSwitches = async (req, res) => {
    const userId = req.user.userId;
    const switches = await prisma.switch.findMany({ where: { userId } });
    
    // Prisma por defecto devuelve BigInt, los cuales Express/JSON no parsea directo, hay que cast a String o Number
    const parsed = switches.map(sw => ({ ...sw, targetTime: Number(sw.targetTime) }));
    res.json(parsed);
};

const createSwitch = async (req, res) => {
    const { name, alertEmail, durationHours } = req.body;
    const userId = req.user.userId;
    const targetTimeMs = Date.now() + (durationHours * 3600000);

    const newSwitch = await prisma.switch.create({
        data: {
            name, alertEmail, targetTime: targetTimeMs, status: 'ACTIVE', userId
        }
    });

    await prisma.log.create({ data: { action: "Switch Creado", details: name, userId } });
    
    res.json({ ...newSwitch, targetTime: Number(newSwitch.targetTime) });
};

const deleteSwitch = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const sw = await prisma.switch.findFirst({ where: { id: Number(id), userId } });
    if (!sw) return res.status(404).json({ error: "No encontrado" });

    await prisma.switch.delete({ where: { id: sw.id } });
    await prisma.log.create({ data: { action: "Switch Eliminado", details: sw.name, userId } });

    res.json({ message: "Eliminado con éxito" });
};

const checkIn = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const sw = await prisma.switch.findFirst({ where: { id: Number(id), userId } });
    if (!sw) return res.status(404).json({ error: "No encontrado" });

    // Añade 24h fijas o respeta el original si lo guardamos (por simplicidad, sumamos 24h)
    const newTarget = Date.now() + 86400000;
    const updated = await prisma.switch.update({
        where: { id: sw.id },
        data: { targetTime: newTarget, status: 'ACTIVE' }
    });

    await prisma.log.create({ data: { action: "Check-in Realizado", details: sw.name, userId } });
    res.json({ ...updated, targetTime: Number(updated.targetTime) });
};

const getLogs = async (req, res) => {
    const logs = await prisma.log.findMany({ 
        where: { userId: req.user.userId },
        orderBy: { date: 'desc' }
    });
    res.json(logs);
};

module.exports = { getSwitches, createSwitch, deleteSwitch, checkIn, getLogs };
