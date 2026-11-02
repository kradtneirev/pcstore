const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Mật khẩu lưu dạng "salt:hash" (scrypt), không lưu mật khẩu gốc
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

function signToken(userId, secret) {
  return jwt.sign({ sub: userId }, secret, { expiresIn: '30d' });
}

function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret).sub;
  } catch {
    return null;
  }
}

// Bỏ trường mật khẩu trước khi trả user về cho app
function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, publicUser };
