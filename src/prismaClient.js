const { PrismaClient } = require('@prisma/client');

// Prevención de múltiple instanciamiento en Next/Express
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') global.prisma = prisma;

module.exports = prisma;
