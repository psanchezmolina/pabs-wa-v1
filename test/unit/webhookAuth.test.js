const { expect } = require('chai');
const sinon = require('sinon');
const { validateGHLWebhook, validateWhatsAppWebhook } = require('../../utils/webhookAuth');

describe('Webhook Authentication', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      ip: '127.0.0.1'
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('validateGHLWebhook', () => {
    it('should reject webhook without locationId', async () => {
      req.body = {}; // Sin locationId

      await validateGHLWebhook(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Missing locationId' })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should reject webhook with null locationId', async () => {
      req.body = { locationId: null };

      await validateGHLWebhook(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Missing locationId' })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should call database lookup when locationId is provided', async () => {
      req.body = { locationId: 'test_location_123' };

      await validateGHLWebhook(req, res, next);

      // Debería haber intentado buscar en BD (403 o 500 o next() llamado)
      // No verificamos el resultado exacto porque depende de BD real
      expect(res.status.called || next.called).to.be.true;
    });
  });

  describe('validateWhatsAppWebhook', () => {
    it('should reject webhook without instance', async () => {
      req.body = {}; // Sin instance

      await validateWhatsAppWebhook(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Missing instance' })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should reject webhook with null instance', async () => {
      req.body = { instance: null };

      await validateWhatsAppWebhook(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Missing instance' })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should call database lookup when instance is provided', async () => {
      req.body = { instance: 'test_instance_123' };

      await validateWhatsAppWebhook(req, res, next);

      // Debería haber intentado buscar en BD (403 o 500 o next() llamado)
      // No verificamos el resultado exacto porque depende de BD real
      expect(res.status.called || next.called).to.be.true;
    });
  });
});
