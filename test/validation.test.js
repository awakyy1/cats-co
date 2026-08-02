const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeChatMessage,
  normalizeRegistration,
  normalizeRoom,
} = require('../lib/validation');

test('normalizeRegistration returns normalized safe fields', () => {
  const result = normalizeRegistration({
    email: ' Person@Example.com ',
    nickname: ' Test_User ',
    nome: ' Test Person ',
    senha: 'a-long-password',
    userColors: '#12abEF',
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.value.email, 'person@example.com');
  assert.equal(result.value.nicknameKey, 'test_user');
  assert.equal(result.value.name, 'Test Person');
});

test('normalizeRegistration rejects weak and malformed fields', () => {
  const result = normalizeRegistration({
    email: 'invalid',
    nickname: 'x!',
    nome: '',
    senha: 'short',
    userColors: 'red',
  });
  assert.deepEqual(result.errors, ['name', 'nickname', 'email', 'password', 'color']);
});

test('chat validation trims messages and enforces bounds', () => {
  assert.equal(normalizeChatMessage(' hello '), 'hello');
  assert.equal(normalizeChatMessage('   '), null);
  assert.equal(normalizeChatMessage('x'.repeat(501)), null);
  assert.equal(normalizeChatMessage({}), null);
});

test('unknown rooms fall back to general', () => {
  assert.equal(normalizeRoom('cafe'), 'cafe');
  assert.equal(normalizeRoom('arbitrary'), 'general');
});
