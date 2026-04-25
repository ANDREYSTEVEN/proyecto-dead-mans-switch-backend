const cron = require('node-cron');
const prisma = require('../prismaClient');
const { sendContingencyEmail } = require('../utils/emailService');

const startCronJob = () => {
    console.log("⏱️  Cron Job Supervisor iniciado. Escaneando cada minuto para entregas por SendGrid HTTP...");

    cron.schedule('* * * * *', async () => {
        try {
            const nowMs = Date.now();
            
            const criticalSwitches = await prisma.switch.findMany({
                where: {
                    status: 'ACTIVE',
                    targetTime: { lt: nowMs }
                },
                include: { user: true, vaultItems: true }
            });

            if (criticalSwitches.length > 0) {
                console.log(`⚠️ Se detectaron ${criticalSwitches.length} interruptores caducados.`);

                for (let sw of criticalSwitches) {
                    await prisma.switch.update({
                        where: { id: sw.id },
                        data: { status: 'EXPIRED' }
                    });

                    await prisma.log.create({
                        data: { action: "Protocolo Ejecutado", details: `Check-in Evadido. HTML Seguro enviado a ${sw.alertEmail}`, userId: sw.userId }
                    });

                    await sendContingencyEmail(sw);
                }
            }
        } catch (error) {
            console.error("Error general en el Cron Job:", error);
        }
    });
};

module.exports = { startCronJob };
