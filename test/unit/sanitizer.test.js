const { expect } = require('chai');
const { sanitizeObject, sanitizeHeaders } = require('../../utils/sanitizer');

describe('Sanitizer Utils', () => {
  describe('sanitizeObject', () => {
    it('should redact sensitive token fields', () => {
      const obj = {
        ghl_access_token: 'secret123',
        name: 'John',
        ghl_refresh_token: 'refresh456'
      };

      const result = sanitizeObject(obj);

      expect(result.ghl_access_token).to.equal('[REDACTED]');
      expect(result.ghl_refresh_token).to.equal('[REDACTED]');
      expect(result.name).to.equal('John');
    });

    it('should redact API keys', () => {
      const obj = {
        instance_apikey: 'key123',
        OPENAI_API_KEY: 'sk-xxx',
        data: 'normal'
      };

      const result = sanitizeObject(obj);

      expect(result.instance_apikey).to.equal('[REDACTED]');
      expect(result.OPENAI_API_KEY).to.equal('[REDACTED]');
      expect(result.data).to.equal('normal');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            token: 'abc123'
          }
        }
      };

      const result = sanitizeObject(obj);

      expect(result.user.name).to.equal('John');
      expect(result.user.credentials.password).to.equal('[REDACTED]');
      expect(result.user.credentials.token).to.equal('[REDACTED]');
    });

    it('should handle arrays', () => {
      const obj = {
        items: [
          { token: 'abc', name: 'Alice' },
          { token: 'def', name: 'Bob' }
        ]
      };

      const result = sanitizeObject(obj);

      expect(result.items[0].token).to.equal('[REDACTED]');
      expect(result.items[0].name).to.equal('Alice');
    });

    it('should handle null and undefined', () => {
      const obj = {
        value: null,
        name: undefined,
        data: 'value'
      };

      const result = sanitizeObject(obj);

      expect(result.value).to.be.null;
      expect(result.name).to.be.undefined;
      expect(result.data).to.equal('value');
    });

    it('should prevent deep recursion', () => {
      const circular = { level: 0 };
      circular.child = circular; // Circular reference

      // Should not throw, should handle gracefully
      expect(() => sanitizeObject(circular)).to.not.throw();
    });
  });

  describe('sanitizeHeaders', () => {
    it('should redact authorization header', () => {
      const headers = {
        'content-type': 'application/json',
        'authorization': 'Bearer secret123'
      };

      const result = sanitizeHeaders(headers);

      expect(result['content-type']).to.equal('application/json');
      expect(result['authorization']).to.equal('[REDACTED]');
    });

    it('should redact apikey header', () => {
      const headers = {
        'apikey': 'key123',
        'host': 'example.com'
      };

      const result = sanitizeHeaders(headers);

      expect(result.apikey).to.equal('[REDACTED]');
      expect(result.host).to.equal('example.com');
    });

    it('should handle missing headers', () => {
      const result = sanitizeHeaders(null);
      expect(result).to.deep.equal({});
    });
  });
});
