const config = require('../config');
const logger = require('./logger');

// ============================================================================
// ERROR AGGREGATOR - Agrupa errores idénticos en ventana de 5 minutos
// ============================================================================

class ErrorAggregator {
  constructor() {
    this.errors = new Map(); // Key: errorHash, Value: { count, first, last, details, timeout }
    this.windowMs = 5 * 60 * 1000; // 5 minutos
  }

  // Generar hash único para identificar errores idénticos
  getErrorHash(errorType, message, client) {
    const key = `${errorType}:${message}:${client || 'global'}`;
    return key.toLowerCase().replace(/\s+/g, '_');
  }

  // Procesar error: devuelve true si debe enviar inmediatamente
  async process(errorType, details, sendCallback) {
    const hash = this.getErrorHash(errorType, details.error, details.location_id || details.instance_name);

    const existing = this.errors.get(hash);

    if (!existing) {
      // PRIMER ERROR - Enviar inmediatamente
      this.errors.set(hash, {
        count: 1,
        first: new Date(),
        last: new Date(),
        errorType,
        details: [details],
        timeout: null
      });

      // Enviar inmediatamente
      await sendCallback(errorType, details, false);

      // Configurar timeout para enviar agrupados si hay más
      const timeoutId = setTimeout(() => {
        this.sendAggregated(hash, sendCallback);
      }, this.windowMs);

      this.errors.get(hash).timeout = timeoutId;

      return;
    }

    // ERROR REPETIDO - Agregar a la lista
    existing.count++;
    existing.last = new Date();
    existing.details.push(details);

    logger.info('Error agregado al grupo', {
      hash,
      count: existing.count,
      errorType
    });
  }

  // Enviar errores agrupados
  async sendAggregated(hash, sendCallback) {
    const aggregated = this.errors.get(hash);

    if (!aggregated || aggregated.count <= 1) {
      // Solo hubo 1 ocurrencia, ya se envió
      this.errors.delete(hash);
      return;
    }

    // Hay 2+ ocurrencias, enviar agrupado
    await sendCallback(aggregated.errorType, aggregated, true);

    // Limpiar
    this.errors.delete(hash);
  }

  // Limpiar errores antiguos (llamar periódicamente)
  cleanup() {
    const now = Date.now();
    for (const [hash, data] of this.errors.entries()) {
      if (now - data.last.getTime() > this.windowMs) {
        if (data.timeout) clearTimeout(data.timeout);
        this.errors.delete(hash);
      }
    }
  }
}

const aggregator = new ErrorAggregator();

// Cleanup cada 10 minutos
setInterval(() => aggregator.cleanup(), 10 * 60 * 1000);

// ============================================================================
// FORMATTERS - Crear mensajes estilo n8n
// ============================================================================

function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatStack(stack) {
  if (!stack) return 'N/A';

  // Tomar primeras 5 líneas
  const lines = stack.split('\n').slice(0, 5);
  return lines.map(line => line.trim()).join('\n');
}

function formatSingleError(errorType, details) {
  const client = details.location_id || details.instance_name || 'N/A';
  const endpoint = details.endpoint || details.webhook || 'N/A';

  let message = `🚨 *Error en Servidor* 🚨\n\n`;
  message += `*Tipo:* ${errorType}\n`;
  message += `*Cliente:* ${client}\n`;
  message += `*Endpoint:* ${endpoint}\n`;
  message += `*Error:* ${details.error}\n\n`;

  // Contexto adicional
  if (details.contactId || details.messageId || details.remoteJid || details.phone) {
    message += `*Contexto:*\n`;
    if (details.contactId) message += `• Contact ID: ${details.contactId}\n`;
    if (details.messageId) message += `• Message ID: ${details.messageId}\n`;
    if (details.remoteJid) message += `• Remote: ${details.remoteJid}\n`;
    if (details.phone) message += `• Phone: ${details.phone}\n`;
    message += `\n`;
  }

  // Stack trace
  if (details.stack) {
    message += `*Stack:*\n\`\`\`\n${formatStack(details.stack)}\n\`\`\`\n\n`;
  }

  message += `*Timestamp:* ${formatDate(new Date())}`;

  return message;
}

function formatAggregatedError(errorType, aggregated) {
  const count = aggregated.count;
  const first = formatDate(aggregated.first);
  const last = formatDate(aggregated.last);

  // Agrupar por cliente
  const clientCounts = {};
  aggregated.details.forEach(d => {
    const client = d.location_id || d.instance_name || 'N/A';
    clientCounts[client] = (clientCounts[client] || 0) + 1;
  });

  let message = `🚨 *Error Agrupado* (x${count}) 🚨\n\n`;
  message += `*Tipo:* ${errorType}\n`;
  message += `*Mensaje:* ${aggregated.details[0].error}\n\n`;

  message += `*Estadísticas:*\n`;
  message += `• Ocurrencias: ${count}\n`;
  message += `• Primera: ${first}\n`;
  message += `• Última: ${last}\n`;
  message += `• Clientes afectados: ${Object.keys(clientCounts).length}\n\n`;

  message += `*Detalles por cliente:*\n`;
  for (const [client, clientCount] of Object.entries(clientCounts)) {
    message += `- ${client} (${clientCount}x)\n`;
  }

  // Stack del último error
  const lastDetail = aggregated.details[aggregated.details.length - 1];
  if (lastDetail.stack) {
    message += `\n*Último stack:*\n\`\`\`\n${formatStack(lastDetail.stack)}\n\`\`\``;
  }

  return message;
}

// ============================================================================
// SENDER - Enviar a WhatsApp
// ============================================================================

async function sendToWhatsApp(message) {
  try {
    const evolutionAPI = require('../services/evolution');

    // Verificar configuración
    if (!config.ADMIN_INSTANCE_APIKEY) {
      logger.warn('ADMIN_INSTANCE_APIKEY not configured, cannot send notification');
      return;
    }

    await evolutionAPI.sendText(
      config.ADMIN_INSTANCE,
      config.ADMIN_INSTANCE_APIKEY,
      config.ADMIN_WHATSAPP,
      message
    );

    logger.info('Admin notified successfully');
  } catch (error) {
    logger.error('Failed to notify admin', {
      error: error.message,
      stack: error.stack
    });
  }
}

// ============================================================================
// MAIN FUNCTION - notifyAdmin (mejorada)
// ============================================================================

async function notifyAdmin(errorType, details) {
  try {
    // Añadir timestamp si no existe
    if (!details.timestamp) {
      details.timestamp = new Date().toISOString();
    }

    // Procesar con aggregator
    await aggregator.process(errorType, details, async (type, data, isAggregated) => {
      const message = isAggregated
        ? formatAggregatedError(type, data)
        : formatSingleError(type, data);

      await sendToWhatsApp(message);
    });

  } catch (error) {
    logger.error('Error in notifyAdmin', {
      error: error.message,
      stack: error.stack
    });
  }
}

module.exports = { notifyAdmin };
