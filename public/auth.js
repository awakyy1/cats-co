const messages = {
  'account-exists': 'That nickname or email is already registered.',
  'authentication-required': 'Sign in to access that page.',
  'invalid-credentials': 'Invalid nickname or password.',
  'invalid-registration': 'Check the registration fields and try again.',
};

const parameters = new URLSearchParams(location.search);
const alert = document.getElementById('auth-message');
const error = parameters.get('error');

if (alert && error && messages[error]) {
  alert.textContent = messages[error];
  alert.hidden = false;
}

if (alert && parameters.get('registered') === '1') {
  alert.textContent = 'Account created. You can now sign in.';
  alert.hidden = false;
}
