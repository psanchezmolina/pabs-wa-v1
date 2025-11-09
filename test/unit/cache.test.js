const { expect } = require('chai');
const {
  getCachedToken,
  setCachedToken,
  invalidateToken,
  getCachedContactId,
  setCachedContactId,
  getCachedConversationId,
  setCachedConversationId
} = require('../../services/cache');

describe('Cache Service', () => {
  const locationId = 'test_location_123';
  const phone = '+34660722687';
  const contactId = 'contact_456';
  const conversationId = 'conv_789';

  describe('Token Cache', () => {
    it('should cache and retrieve token', () => {
      const accessToken = 'token_abc123';
      const expiry = Date.now() + 3600000; // 1 hour

      setCachedToken(locationId, accessToken, expiry);
      const cached = getCachedToken(locationId);

      expect(cached).to.exist;
      expect(cached.access_token).to.equal(accessToken);
      expect(cached.expiry).to.equal(expiry);
    });

    it('should return undefined for non-existent token', () => {
      const cached = getCachedToken('non_existent_location');
      expect(cached).to.be.undefined;
    });

    it('should invalidate token', () => {
      const accessToken = 'token_xyz';
      const expiry = Date.now() + 3600000;

      setCachedToken(locationId, accessToken, expiry);
      invalidateToken(locationId);

      const cached = getCachedToken(locationId);
      expect(cached).to.be.undefined;
    });
  });

  describe('Contact Cache', () => {
    it('should cache and retrieve contactId', () => {
      setCachedContactId(locationId, phone, contactId);
      const cached = getCachedContactId(locationId, phone);

      expect(cached).to.equal(contactId);
    });

    it('should return undefined for non-existent contact', () => {
      const cached = getCachedContactId('non_existent', '+99999999');
      expect(cached).to.be.undefined;
    });

    it('should handle multiple contacts for same location', () => {
      const phone1 = '+34111111111';
      const phone2 = '+34222222222';
      const contactId1 = 'contact_1';
      const contactId2 = 'contact_2';

      setCachedContactId(locationId, phone1, contactId1);
      setCachedContactId(locationId, phone2, contactId2);

      expect(getCachedContactId(locationId, phone1)).to.equal(contactId1);
      expect(getCachedContactId(locationId, phone2)).to.equal(contactId2);
    });
  });

  describe('Conversation Cache', () => {
    it('should cache and retrieve conversationId', () => {
      setCachedConversationId(locationId, contactId, conversationId);
      const cached = getCachedConversationId(locationId, contactId);

      expect(cached).to.equal(conversationId);
    });

    it('should return undefined for non-existent conversation', () => {
      const cached = getCachedConversationId('non_existent', 'non_existent_contact');
      expect(cached).to.be.undefined;
    });

    it('should handle multiple conversations', () => {
      const contactId1 = 'contact_A';
      const contactId2 = 'contact_B';
      const convId1 = 'conv_A';
      const convId2 = 'conv_B';

      setCachedConversationId(locationId, contactId1, convId1);
      setCachedConversationId(locationId, contactId2, convId2);

      expect(getCachedConversationId(locationId, contactId1)).to.equal(convId1);
      expect(getCachedConversationId(locationId, contactId2)).to.equal(convId2);
    });
  });

  describe('Cache Isolation', () => {
    it('should isolate caches between different locations', () => {
      const location1 = 'loc_1';
      const location2 = 'loc_2';
      const phone = '+34660722687';
      const contactId1 = 'contact_1';
      const contactId2 = 'contact_2';

      setCachedContactId(location1, phone, contactId1);
      setCachedContactId(location2, phone, contactId2);

      expect(getCachedContactId(location1, phone)).to.equal(contactId1);
      expect(getCachedContactId(location2, phone)).to.equal(contactId2);
    });
  });
});
