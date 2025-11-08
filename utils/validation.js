function validateGHLPayload(body) {
  // GHL usa 'body' para el texto del mensaje
  const required = ['locationId', 'messageId', 'contactId', 'body'];

  for (const field of required) {
    if (!body[field]) {
      return { valid: false, missing: field };
    }
  }

  // Solo procesar mensajes OUTBOUND (salientes de GHL hacia WhatsApp)
  if (body.direction !== 'outbound') {
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