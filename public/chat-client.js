const form = document.getElementById('chat-form');
const input = document.getElementById('input-message');
const messages = document.getElementById('messages');
const commandInput = document.getElementById('command-input');

const room = location.pathname.startsWith('/cafe')
  ? 'cafe'
  : location.pathname.startsWith('/escritorio')
    ? 'meeting'
    : 'general';
const socket = io({ auth: { room } });

let commands = {};
fetch('/commands.json')
  .then((response) => response.ok ? response.json() : {})
  .then((data) => { commands = data; })
  .catch(() => { commands = {}; });

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (message) {
    socket.emit('chat message', message);
    input.value = '';
  }
});

socket.on('chat message', ({ color, message, username }) => {
  const item = document.createElement('li');
  const author = document.createElement('span');
  const content = document.createElement('span');

  author.classList.add('username');
  author.textContent = `${username}: `;
  author.style.color = /^#[0-9a-f]{6}$/i.test(color) ? color : '#222222';
  content.textContent = message;

  item.append(author, content);
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
});

socket.on('connect_error', (error) => {
  if (error.message === 'Authentication required') {
    location.assign('/?error=authentication-required');
  }
});

commandInput?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();

  const command = commandInput.value.trim().toLowerCase();
  const output = commands[command];
  commandInput.value = '';
  if (!output) return;

  const item = document.createElement('li');
  item.classList.add('command-message');
  item.textContent = output.replace('nickname', 'You');
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;

  if (command === 'purr') document.getElementById('purr-sound')?.play();
  if (command === 'meow') {
    const sound = Math.floor(Math.random() * 3) + 1;
    document.getElementById(`meow${sound}-sound`)?.play();
  }
});
