const cron = require('node-cron');
const nodemailer = require('nodemailer');
const prisma = require('../prismaClient');

// Simulación de correo usando Ethereal (Ideal para Test sin cuenta de Google/AWS)
// El día de mañana, en el .env colocarás contraseñas reales.
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'dummy_ethereal_user@ethereal.email', // Sustituible vía env
        pass: 'dummy_password'
    }
});

const startCronJob = () => {
    console.log("⏱️  Cron Job Supervisor iniciado. Escaneando cada minuto...");

    // Se ejecuta al inicio de cada minuto (*/1 * * * *)
    cron.schedule('* * * * *', async () => {
        try {
            const nowMs = Date.now();
            
            // Buscar interruptores críticos activos
            const criticalSwitches = await prisma.switch.findMany({
                where: {
                    status: 'ACTIVE',
                    targetTime: { lt: nowMs } // Target ya pasó el tiempo actual
                },
                include: { user: true }
            });

            if (criticalSwitches.length > 0) {
                console.log(`⚠️ Se detectaron ${criticalSwitches.length} interruptores caducados.`);

                for (let sw of criticalSwitches) {
                    // Mover a "EXPIRED" para que no vuelva a enviar el correo al minuto siguiente
                    await prisma.switch.update({
                        where: { id: sw.id },
                        data: { status: 'EXPIRED' }
                    });

                    // Loggear
                    await prisma.log.create({
                        data: { action: "Protocolo Ejecutado", details: `Check-in Evadido. Alerta enviada a ${sw.alertEmail}`, userId: sw.userId }
                    });

                    // Enviar correo de emergencia real
                    try {
                        const info = await transporter.sendMail({
                            from: '"Sistema Automático" <alertas@deadmanswitch.com>',
                            to: sw.alertEmail,
                            subject: "URGENTE: Activación de Interruptor de Emergencia",
                            text: `Hola.\n\nEl usuario (${sw.user.email}) ha faltado a su Check-in recurrente en el sistema de seguridad para el interruptor: "${sw.name}". \n\nPor protocolo, este correo electrónico precargado ha sido liberado.`
                        });
                        console.log(`✉️ Alerta de rescate disparada para Switch ${sw.id}: ${nodemailer.getTestMessageUrl(info)}`);
                    } catch (e) {
                         console.error("Fallo enviando correo simulado. Comprueba las credenciales SMTP.", e.message);
                    }
                }
            }
        } catch (error) {
            console.error("Error en la ejecución del Cron Job de escaneo:", error);
        }
    });
};

module.exports = { startCronJob };
