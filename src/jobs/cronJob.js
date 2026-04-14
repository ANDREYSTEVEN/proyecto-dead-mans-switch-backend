const cron = require('node-cron');
const nodemailer = require('nodemailer');

// 🛡️ HOTFIX: Railway no tiene soporte nativo de IPv6 para salida directa. 
// Forzamos al motor de Node y Nodemailer a resolver los servidores de Google única y exclusivamente en IPv4.
require('dns').setDefaultResultOrder('ipv4first');

const prisma = require('../prismaClient');

// Pasarela oficial de Gmail en producción configurada a través de Variables Externas.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
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
                    targetTime: { lt: nowMs }
                },
                include: { user: true, vaultItems: true } // Incluir caja fuerte secreta!
            });

            if (criticalSwitches.length > 0) {
                console.log(`⚠️ Se detectaron ${criticalSwitches.length} interruptores caducados.`);

                for (let sw of criticalSwitches) {
                    await prisma.switch.update({
                        where: { id: sw.id },
                        data: { status: 'EXPIRED' }
                    });

                    await prisma.log.create({
                        data: { action: "Protocolo Ejecutado", details: `Check-in Evadido. Alerta y bóveda entregada a ${sw.alertEmail}`, userId: sw.userId }
                    });

                    // Construcción de la Plantilla HTML Segura D.M.S
                    let vaultHTML = '';
                    if (sw.vaultItems && sw.vaultItems.length > 0) {
                        vaultHTML = `<div style="background: #111; border-left: 4px solid #ef4444; padding: 15px; margin-top: 20px;">
                                        <h3 style="color: #ef4444; margin-top: 0;">📦 Archivos Secretos Desclasificados:</h3>
                                        ${sw.vaultItems.map(item => `
                                            <div style="background: #222; padding: 12px; margin-bottom: 10px; border-radius: 6px;">
                                                <h4 style="color: #3b82f6; margin: 0 0 5px 0;">${item.title}</h4>
                                                <p style="color: #ccc; margin: 0; font-family: monospace; white-space: pre-wrap;">${item.content}</p>
                                            </div>
                                        `).join('')}
                                     </div>`;
                    } else {
                         vaultHTML = `<p style="color: #666; font-style: italic;">No había ninguna información clasificada sujeta a este interruptor.</p>`;
                    }

                    const emailHTML = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 30px; border: 1px solid #333; border-radius: 10px;">
                        <h2 style="color: #ef4444; text-align: center; text-transform: uppercase; letter-spacing: 2px;">⚠️ Alerta de Contingencia ⚠️</h2>
                        <hr style="border-color: #333; margin: 20px 0;">
                        <p style="font-size: 16px;">El usuario <strong>${sw.user.email}</strong> ha fallado consecutivamente en reportar su Check-in de vida en el sistema.</p>
                        <p style="font-size: 16px;">Como encargado de seguridad de su protocolo <strong>"${sw.name}"</strong>, has recibido este registro.</p>
                        ${vaultHTML}
                        <hr style="border-color: #333; margin: 30px 0 20px 0;">
                        <p style="text-align: center; color: #555; font-size: 12px;">Generado automáticamente por el motor Dead Man's Switch.<br>Tu seguridad es absoluta.</p>
                    </div>`;

                    try {
                        const info = await transporter.sendMail({
                            from: '"Dead Man Switch" <alertas@deadmanswitch.com>',
                            to: sw.alertEmail,
                            subject: `URGENTE: Activación de Interruptor "${sw.name}"`,
                            html: emailHTML
                        });
                        console.log(`✉️ Alerta de rescate con bóveda disparada para Switch ${sw.id}: ${nodemailer.getTestMessageUrl(info)}`);
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
