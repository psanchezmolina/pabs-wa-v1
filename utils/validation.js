function validateGHLPayload(body) {
  // Campos requeridos básicos
  const required = ['locationId', 'messageId', 'contactId'];

  for (const field of required) {
    if (!body[field]) {
      return { valid: false, missing: field };
    }
  }

  // El texto del mensaje puede venir como 'body' o 'message'
  if (!body.body && !body.message) {
    return { valid: false, missing: 'body or message' };
  }

  // Solo procesar mensajes OUTBOUND
  // Puede ser: direction === 'outbound' O type === 'SMS'
  const isOutbound = body.direction === 'outbound' || body.type === 'SMS';

  if (!isOutbound) {
    return { valid: false, reason: 'Not an outbound message' };
  }

  return { valid: true };
}

function validateWhatsAppPayload(body) {
  if (!body.data || !body.data.key) {
    return { valid: false, missing: 'data.key' };
  }
  
  const required = ['remoteJid', 'id'];
  for (const field of required) {
    if (!body.data.key[field]) {
      return { valid: false, missing: `data.key.${field}` };
    }
  }
  
  if (body.data.key.fromMe) {
    return { valid: false, reason: 'Own message ignored' };
  }
  
  return { valid: true };
}

module.exports = {
  validateGHLPayload,
  validateWhatsAppPayload
};