const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const { createApplication } = require('../server');

let baseUrl;
let server;
let createdUser;

const passwordHash = bcrypt.hashSync('correct-password', 4);
const userRepository = {
  async createUser(user) {
    createdUser = user;
    return { ...user, _id: '507f1f77bcf86cd799439011' };
  },
  async findUserByNickname(nickname) {
    if (nickname !== 'tester') return null;
    return {
      _id: '507f1f77bcf86cd799439011',
      color: '#112233',
      nickname: 'tester',
      passwordHash,
    };
  },
};

before(async () => {
  const application = createApplication({
    sessionSecret: 'test-only-session-secret-with-32-characters',
    sessionStore: new session.MemoryStore(),
    userRepository,
  });
  server = application.server;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('public page is available and private page redirects', async () => {
  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);

  const chat = await fetch(`${baseUrl}/chat`, { redirect: 'manual' });
  assert.equal(chat.status, 302);
  assert.equal(chat.headers.get('location'), '/?error=authentication-required');
});

test('direct access to private HTML is rejected', async () => {
  const response = await fetch(`${baseUrl}/chat.html`);
  assert.equal(response.status, 404);
});

test('registration validation rejects malformed input', async () => {
  const response = await fetch(`${baseUrl}/register`, {
    body: new URLSearchParams({ nickname: 'x' }),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: baseUrl },
    method: 'POST',
    redirect: 'manual',
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/registro?error=invalid-registration');
});

test('valid registration stores a hash instead of the password', async () => {
  const response = await fetch(`${baseUrl}/register`, {
    body: new URLSearchParams({
      email: 'tester@example.com',
      nickname: 'Tester',
      nome: 'Test User',
      senha: 'correct-password',
      userColors: '#112233',
    }),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: baseUrl },
    method: 'POST',
    redirect: 'manual',
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/?registered=1');
  assert.equal(createdUser.nicknameKey, 'tester');
  assert.equal(createdUser.passwordHash.includes('correct-password'), false);
  assert.equal(await bcrypt.compare('correct-password', createdUser.passwordHash), true);
});

test('login creates a session that grants access to chat', async () => {
  const login = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ nickname: 'tester', senha: 'correct-password' }),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: baseUrl },
    method: 'POST',
    redirect: 'manual',
  });
  assert.equal(login.status, 302);
  assert.equal(login.headers.get('location'), '/chat');

  const cookie = login.headers.get('set-cookie').split(';', 1)[0];
  const chat = await fetch(`${baseUrl}/chat`, { headers: { cookie } });
  assert.equal(chat.status, 200);
});

test('state-changing requests require a same-origin header', async () => {
  const response = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ nickname: 'tester', senha: 'correct-password' }),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    redirect: 'manual',
  });
  assert.equal(response.status, 403);
});
