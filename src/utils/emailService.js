const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const senderEmail = process.env.SENDER_EMAIL || 'alerta@deadmanswitch.com'; 

const sendContingencyEmail = async (sw) => {
    if (!process.env.SENDGRID_API_KEY) {
        console.error("No se envió el correo final. Falta tu SENDGRID_API_KEY.");
        return;
    }

    let vaultHTML = '';
    if (sw.vaultItems && sw.vaultItems.length > 0) {
        vaultHTML = sw.vaultItems.map(item => `
            <div style="background-color: #1a0a0a; border-left: 4px solid #ff4444; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: #ff4444; margin: 0 0 10px 0; font-family: monospace;">[ARCHIVO CLASIFICADO]: ${item.title.toUpperCase()}</h3>
                <pre style="color: #e0e0e0; margin: 0; white-space: pre-wrap; font-family: sans-serif; font-size: 14px;">${item.content}</pre>
            </div>
        `).join('');
    } else {
        vaultHTML = `<div style="padding: 15px; color: #888;">No hay expedientes adicionales atados a esta alerta.</div>`;
    }

    const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000000; color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #330000;">
            <div style="text-align: center; border-bottom: 2px solid #ff0000; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #ff0000; margin: 0; letter-spacing: 2px;">⚠️ PROTOCOLO DE CONTINGENCIA</h1>
                <p style="color: #ff6666; font-size: 14px; margin-top: 5px;">DIVULGACIÓN AUTOMÁTICA DE DATOS SECRETA</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">Atención,</p>
            <p style="font-size: 16px; line-height: 1.6;">El usuario <strong>${sw.user.email}</strong> no ha respondido al Dead Man's Switch designado como <strong>"${sw.name}"</strong> dentro del límite de tiempo preestablecido.</p>
            
            <div style="background-color: #110000; border: 1px solid #ff0000; padding: 20px; border-radius: 5px; margin: 30px 0;">
                <p style="margin: 0; font-weight: bold; color: #ff3333; margin-bottom: 15px;">A CONTINUACIÓN SE REVELAN LOS BLOQUES DE DATOS CIFRADOS:</p>
                ${vaultHTML}
            </div>
            
            <div style="text-align: center; background-color: #220000; padding: 15px; border-radius: 5px; margin-bottom: 30px; border-left: 4px solid #ff0000;">
                <p style="color: #ff5555; font-size: 14px; margin: 0 0 10px 0;">Para desencriptar el contenido de los bloques U2FsdGVkX19x, necesitas el PIN Oficial y dirigirte al Decoder.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/decoder" style="display: inline-block; padding: 10px 20px; background-color: #ff0000; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; letter-spacing: 1px;">ACCEDER A LA TERMINAL DE DESENCRIPTACIÓN</a>
            </div>

            <p style="font-size: 14px; color: #aaaaaa; text-align: center; border-top: 1px solid #333333; padding-top: 20px;">
                Este es un mensaje automatizado e irreversible.<br/>
                <span style="color: #ff0000;">El estado del usuario emisor es desconocido.</span>
            </p>
        </div>
    `;

    try {
        const msg = {
            to: sw.alertEmail,
            from: senderEmail,
            subject: `URGENTE: Desclasificación de Archivos "${sw.name}"`,
            html: emailHTML,
        };
        await sgMail.send(msg);
        console.log(`✉️ Alerta HTTP SendGrid disparada impecablemente para Switch ${sw.id}`);
    } catch (e) {
        console.error("Fallo crítico enviando REST API Email en SendGrid.", e.response ? e.response.body : e.message);
    }
};

module.exports = { sendContingencyEmail };
