const NICKNAME_PATTERN = /^[a-zA-Z0-9_-]{3,24}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function normalizeRegistration(body = {}) {
  const name = String(body.nome ?? '').trim();
  const nickname = String(body.nickname ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.senha ?? '');
  const color = String(body.userColors ?? '').trim();

  const errors = [];
  if (name.length < 2 || name.length > 80) errors.push('name');
  if (!NICKNAME_PATTERN.test(nickname)) errors.push('nickname');
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) errors.push('email');
  if (password.length < 10 || password.length > 128) errors.push('password');
  if (!COLOR_PATTERN.test(color)) errors.push('color');

  return {
    errors,
    value: {
      color,
      email,
      name,
      nickname,
      nicknameKey: nickname.toLowerCase(),
      password,
    },
  };
}

function normalizeChatMessage(input) {
  if (typeof input !== 'string') return null;
  const message = input.trim();
  if (message.length === 0 || message.length > 500) return null;
  return message;
}

function normalizeRoom(input) {
  return ['general', 'cafe', 'meeting'].includes(input) ? input : 'general';
}

module.exports = { normalizeChatMessage, normalizeRegistration, normalizeRoom };
