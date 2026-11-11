const bcrypt = require('bcrypt');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,12}$/;

function validatePassword(password) {
  if (typeof password !== 'string') return false;
  return PASSWORD_REGEX.test(password);
}

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  validatePassword,
  hashPassword,
  comparePassword,
};
