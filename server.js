const express = require('express');
const http = require('node:http');
const path = require('node:path');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const MongoStore = require('connect-mongo');
const { Server } = require('socket.io');

const database = require('./ex');
const { normalizeChatMessage, normalizeRoom } = require('./lib/validation');
const { createRouter } = require('./routes');

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sameOriginOnly(request, response, next) {
  const origin = request.get('origin');
  const expectedOrigin = `${request.protocol}://${request.get('host')}`;
  if (!origin || origin !== expectedOrigin) {
    return response.status(403).type('text').send('Cross-origin request rejected.');
  }
  next();
}

function createApplication(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 10_000,
    serveClient: true,
  });

  const sessionSecret = options.sessionSecret ?? requiredEnvironment('SESSION_SECRET');
  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  }

  const sessionStore = options.sessionStore ?? MongoStore.create({
    dbName: process.env.MONGODB_DATABASE || 'cats_co',
    mongoUrl: requiredEnvironment('MONGODB_URI'),
    ttl: 60 * 60 * 12,
  });
  const sessionMiddleware = session({
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 12,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    },
    name: 'cats.sid',
    resave: false,
    saveUninitialized: false,
    secret: sessionSecret,
    store: sessionStore,
  });

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(sessionMiddleware);

  const authLimiter = rateLimit({
    legacyHeaders: false,
    limit: 20,
    standardHeaders: 'draft-8',
    windowMs: 15 * 60 * 1000,
  });
  app.use(['/login', '/register', '/logout'], sameOriginOnly, authLimiter);

  app.use((request, response, next) => {
    if (request.path.toLowerCase().endsWith('.html')) {
      return response.status(404).type('text').send('Page not found.');
    }
    next();
  });
  app.use(express.static(path.join(__dirname, 'public'), {
    index: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  }));
  app.use('/', createRouter(options.userRepository ?? database));

  app.use((error, request, response, next) => {
    console.error(error);
    if (response.headersSent) return next(error);
    response.status(500).type('text').send('Internal server error.');
  });

  io.engine.use(sessionMiddleware);
  io.use((socket, next) => {
    if (!socket.request.session?.user) {
      return next(new Error('Authentication required'));
    }
    next();
  });
  io.on('connection', (socket) => {
    const room = normalizeRoom(socket.handshake.auth?.room);
    const user = socket.request.session.user;
    socket.join(room);

    socket.on('chat message', (input) => {
      const message = normalizeChatMessage(input);
      if (!message) return;

      io.to(room).emit('chat message', {
        color: user.color,
        message,
        username: user.nickname,
      });
    });
  });

  return { app, io, server };
}

if (require.main === module) {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const { server } = createApplication();
  server.listen(port, () => {
    console.log(`Cats&Co available at http://localhost:${port}`);
  });
}

module.exports = { createApplication, sameOriginOnly };
