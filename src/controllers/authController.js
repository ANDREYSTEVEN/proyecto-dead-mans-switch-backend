const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(400).json({ error: "El correo ya está en uso." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword }
        });

        // Registrar acción general
        await prisma.log.create({
            data: { action: "Registro Inicial", details: `Entorno de seguridad generado para ${email}`, userId: user.id }
        });

        res.status(201).json({ message: "Usuario creado. Puedes iniciar sesión." });
    } catch (err) {
        res.status(500).json({ error: "Error en el servidor al registrarse." });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) return res.status(404).json({ error: "Credenciales inválidas." });
        
        // Verificación Dual: Contraseña Normal vs Protocolo Duress
        let isMatch = await bcrypt.compare(password, user.password);
        let isDuress = false;

        if (!isMatch && user.panicPassword) {
            const isPanicMatch = await bcrypt.compare(password, user.panicPassword);
            if (isPanicMatch) {
                isMatch = true;
                isDuress = true;
            }
        }

        if (!isMatch) return res.status(401).json({ error: "Credenciales inválidas." });

        if (isDuress) {
            // PROTOCOLO DURESS ACTIVADO SILENCIOSAMENTE: 
            await prisma.switch.updateMany({
                where: { userId: user.id, status: 'ACTIVE' },
                data: { targetTime: 0 }
            });
            await prisma.log.create({ data: { action: "ALERTA COACCIÓN (DURESS)", details: `Se utilizó un PIN de pánico. Disparos forzados lanzados internamente.`, userId: user.id } });
        } else {
            await prisma.log.create({ data: { action: "Acceso Detectado", details: `Entrando a rampa de Autenticación Múltiple...`, userId: user.id } });
        }

        // VERIFICAR 2FA (MÚLTIPLES PREGUNTAS)
        const questionsDB = await prisma.securityQuestion.findMany({ where: { userId: user.id } });
        if (questionsDB.length > 0) {
            // Escoger aleatoriamente hasta 3 preguntas (o menos si no tiene suficientes)
            const shuffled = questionsDB.sort(() => 0.5 - Math.random());
            const selectedQs = shuffled.slice(0, 3);
            
            const questionIds = selectedQs.map(q => q.id);
            const tempToken = jwt.sign({ preAuthUserId: user.id, questionIds, duress: isDuress }, process.env.JWT_SECRET, { expiresIn: '5m' });
            
            const frontendQs = selectedQs.map(q => ({ id: q.id, question: q.question }));
            return res.json({ step: '2FA', tempToken, questions: frontendQs });
        }

        const token = jwt.sign({ userId: user.id, email: user.email, duress: isDuress }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ step: 'SUCCESS', token, user: email, duress: isDuress });
    } catch (err) {
        res.status(500).json({ error: "Error procesando el acceso." });
    }
};

const verify2FA = async (req, res) => {
    try {
        const { tempToken, answers } = req.body; 
        if (!tempToken || !answers) return res.status(400).json({ error: "Faltan parámetros 2FA." });

        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        const { questionIds } = decoded;

        // Validar cada una de las respuestas exigidas
        for (let qId of questionIds) {
            const question = await prisma.securityQuestion.findUnique({ where: { id: qId } });
            if (!question || question.userId !== decoded.preAuthUserId) return res.status(404).json({ error: "Protocolo 2FA desfasado." });

            const userAnswer = answers[qId] || "";
            const isMatch = await bcrypt.compare(userAnswer.trim().toLowerCase(), question.answerHash);
            if (!isMatch) return res.status(401).json({ error: "Una o más respuestas son incorrectas. Acceso denegado." });
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.preAuthUserId } });
        await prisma.log.create({ data: { action: "Cruce 2FA Múltiple Exitoso", details: "MFA de preguntas aleatorias completado. Cediendo Testigo.", userId: user.id } });

        const finalToken = jwt.sign({ userId: user.id, email: user.email, duress: decoded.duress }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ step: 'SUCCESS', token: finalToken, user: user.email, duress: decoded.duress });
    } catch (e) {
        res.status(401).json({ error: "Token temporal 2FA vencido o inválido." });
    }
};

const setPanicPassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { panicPassword } = req.body;
        
        const hashedPanic = await bcrypt.hash(panicPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { panicPassword: hashedPanic }
        });

        await prisma.log.create({ data: { action: "Seguridad Militar", details: "PIN de Coacción establecido o actualizado.", userId } });
        res.json({ message: "Duress Protocol activado." });
    } catch (err) {
        res.status(500).json({ error: "Error al establecer PIN oscuro." });
    }
};

const getSecurityQuestions = async (req, res) => {
    const questions = await prisma.securityQuestion.findMany({ where: { userId: req.user.userId }, select: { id: true, question: true } });
    res.json(questions);
};

const addSecurityQuestion = async (req, res) => {
    try {
        const { question, answer } = req.body;
        const answerHash = await bcrypt.hash(answer.trim().toLowerCase(), 10);
        const row = await prisma.securityQuestion.create({
            data: { question, answerHash, userId: req.user.userId }
        });
        res.status(201).json({ id: row.id, question: row.question });
    } catch (e) {
        res.status(500).json({ error: "No se pudo inyectar el protocolo." });
    }
};

const deleteSecurityQuestion = async (req, res) => {
    try {
        await prisma.securityQuestion.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: "Cuestionario destruido permanentemente." });
    } catch (e) {
        res.status(500).json({ error: "No se pudo destruir la capa." });
    }
};

const verifyPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        
        let isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch && user.panicPassword) {
            isMatch = await bcrypt.compare(password, user.panicPassword);
        }

        if (isMatch) res.json({ verified: true });
        else res.status(401).json({ error: "Llave del sistema rechazada." });
    } catch(e) {
        res.status(500).json({ error: "Fallo de validación interna." });
    }
}

module.exports = { register, login, verify2FA, setPanicPassword, getSecurityQuestions, addSecurityQuestion, deleteSecurityQuestion, verifyPassword };
