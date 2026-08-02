const express = require('express');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const { normalizeRegistration } = require('../lib/validation');

const publicDirectory = path.join(__dirname, '..', 'public');

function requireAuthentication(request, response, next) {
  if (!request.session.user) {
    return response.redirect('/?error=authentication-required');
  }
  next();
}

function regenerateSession(request) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function createRouter(userRepository) {
  const router = express.Router();

  router.get('/', (request, response) => {
    response.sendFile(path.join(publicDirectory, 'home.html'));
  });
  router.get('/registro', (request, response) => {
    response.sendFile(path.join(publicDirectory, 'registro.html'));
  });

  const privatePages = new Map([
    ['/chat', 'chat.html'],
    ['/cafe', 'cafe/cafe.html'],
    ['/cfs', 'cafe/cfs/tetris.html'],
    ['/escritorio', 'meeting/meeting.html'],
    ['/draw', 'meeting/etchasketch/draw.html'],
  ]);

  for (const [route, file] of privatePages) {
    router.get(route, requireAuthentication, (request, response) => {
      response.sendFile(path.join(publicDirectory, file));
    });
  }

  router.post('/register', async (request, response, next) => {
    try {
      const { errors, value } = normalizeRegistration(request.body);
      if (errors.length > 0) {
        return response.redirect('/registro?error=invalid-registration');
      }

      const passwordHash = await bcrypt.hash(value.password, 12);
      await userRepository.createUser({
        color: value.color,
        email: value.email,
        name: value.name,
        nickname: value.nickname,
        nicknameKey: value.nicknameKey,
        passwordHash,
      });
      response.redirect('/?registered=1');
    } catch (error) {
      if (error?.code === 11000) {
        return response.redirect('/registro?error=account-exists');
      }
      next(error);
    }
  });

  router.post('/login', async (request, response, next) => {
    try {
      const nickname = String(request.body.nickname ?? '').trim();
      const password = String(request.body.senha ?? '');
      const user = nickname ? await userRepository.findUserByNickname(nickname) : null;
      const passwordHash = user?.passwordHash ?? user?.senha;
      const authenticated = passwordHash
        ? await bcrypt.compare(password, passwordHash)
        : false;

      if (!authenticated) {
        return response.redirect('/?error=invalid-credentials');
      }

      await regenerateSession(request);
      request.session.user = {
        color: user.color ?? user.userColors ?? '#222222',
        id: String(user._id),
        nickname: user.nickname,
      };
      response.redirect('/chat');
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', requireAuthentication, (request, response, next) => {
    request.session.destroy((error) => {
      if (error) return next(error);
      response.clearCookie('cats.sid');
      response.redirect('/');
    });
  });

  return router;
}

module.exports = { createRouter, requireAuthentication };
