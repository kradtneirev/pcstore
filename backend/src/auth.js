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

// ver = số lần đổi mật khẩu; đổi mật khẩu thì token cũ (ver cũ) hết hiệu lực
function signToken(user, secret) {
  return jwt.sign({ sub: user.id, ver: user.tokenVersion ?? 0 }, secret, { expiresIn: '30d' });
}

function verifyToken(token, secret) {
  try {
    const payload = jwt.verify(token, secret);
    return { userId: payload.sub, ver: payload.ver ?? 0 };
  } catch {
    return null;
  }
}

// Bỏ mật khẩu, phiên bản token và giỏ hàng (có API riêng) trước khi trả user về cho app
function publicUser(user) {
  const { password, tokenVersion, cart, ...rest } = user;
  return rest;
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, publicUser };
