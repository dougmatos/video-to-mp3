/**
 * logger.ts
 * Módulo utilitário de logging usando Winston.
 * Registra mensagens de erro e informação em console e em arquivo de log.
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';

// Garante que o diretório de logs exista
const logsDir = path.resolve(process.cwd(), 'logs');
fs.ensureDirSync(logsDir);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return stack
        ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`
        : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    // Exibe no console apenas mensagens de nível "info" ou superior
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message }) => `${level}: ${message}`)
      ),
    }),
    // Salva erros em arquivo para referência futura
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    // Salva todos os logs em arquivo combinado
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
});

export default logger;
