// Kiểm thử toàn bộ luồng API: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pcstore-test-'));
process.env.IMAGE_DIR = path.join(process.env.DATA_DIR, 'images');
fs.mkdirSync(process.env.IMAGE_DIR);
// Ảnh PNG 1x1 dùng để thử
fs.writeFileSync(
  path.join(process.env.IMAGE_DIR, 'p001.png'),
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
);

const db = require('../src/db');
const { createApp } = require('../src/app');
const { luhnValid, validateCard, normalizeText } = require('../src/logic');

let server;
let base;

before(async () => {
  db.reset();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.close();
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

const shipping = { name: 'Nguyễn Văn A', phone: '0912345678', address: '12 Nguyễn Văn Bảo, Gò Vấp, TP.HCM' };

test('logic: Luhn, thẻ và bỏ dấu', () => {
  assert.equal(luhnValid('4242424242424242'), true);
  assert.equal(luhnValid('4242424242424241'), false);
  assert.equal(validateCard({ number: '4242 4242 4242 4242', holder: 'NGUYEN VAN A', expiry: '12/30', cvv: '123' }).last4, '4242');
  assert.throws(() => validateCard({ number: '4242424242424242', holder: 'A B C', expiry: '01/20', cvv: '123' }), /hết hạn/);
  assert.throws(() => validateCard({ number: '4000000000000002', holder: 'A B C', expiry: '12/30', cvv: '123' }), /từ chối/);
  assert.equal(normalizeText('Bàn Phím Đẹp'), 'ban phim dep');
});

test('trang chủ, danh mục và tìm kiếm', async () => {
  const home = await call('GET', '/home');
  assert.equal(home.status, 200);
  assert.ok(home.data.categories.length >= 10);
  assert.ok(home.data.flashSale.every((p) => p.oldPrice > p.price));

  const search = await call('GET', '/products?q=ban%20phim');
  assert.ok(search.data.total >= 3, 'tìm "ban phim" không dấu phải ra bàn phím');
  assert.ok(search.data.items.every((p) => p.category === 'keyboard'));

  const rtx = await call('GET', '/products?q=rtx&sort=price_asc');
  const prices = rtx.data.items.map((p) => p.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));

  const page1 = await call('GET', '/products?limit=10&page=1');
  const page5 = await call('GET', '/products?limit=10&page=5');
  assert.equal(page1.data.hasMore, true);
  assert.equal(page5.data.hasMore, false);
  assert.equal(page1.data.total, 44);

  const byIds = await call('GET', '/products?ids=p001,p040,khong-co&limit=50');
  assert.deepEqual(byIds.data.items.map((p) => p.id).sort(), ['p001', 'p040']);

  const detail = await call('GET', '/products/p001');
  assert.equal(detail.data.product.name, 'Intel Core i5-14400F');
  assert.ok(detail.data.related.every((p) => p.category === 'cpu' && p.id !== 'p001'));
  assert.equal((await call('GET', '/products/khong-co')).status, 404);
});

test('ảnh sản phẩm: có file thì trả đường dẫn, không có thì null', async () => {
  const p1 = (await call('GET', '/products/p001')).data.product;
  assert.match(p1.image, /^\/images\/products\/p001\.png\?v=\d+$/);
  const img = await fetch(base.replace('/api', '') + p1.image);
  assert.equal(img.status, 200);
  assert.match(img.headers.get('content-type'), /image\/png/);
  assert.equal((await call('GET', '/products/p002')).data.product.image, null);
  const quote = await call('POST', '/orders/quote', { items: [{ productId: 'p001', quantity: 1 }] });
  assert.equal(quote.data.items[0].image, p1.image);
});

test('đăng ký, đăng nhập, cập nhật hồ sơ', async () => {
  const bad = await call('POST', '/auth/register', { name: 'A', email: 'x', phone: '1', password: '1' });
  assert.equal(bad.status, 400);

  const reg = await call('POST', '/auth/register', { name: 'Trần B', email: 'b@test.vn', phone: '0987654321', password: 'secret1' });
  assert.equal(reg.status, 201);
  assert.ok(reg.data.token);
  assert.equal(reg.data.user.password, undefined, 'không được trả mật khẩu về app');

  const dup = await call('POST', '/auth/register', { name: 'Trần B', email: 'b@test.vn', phone: '0987654322', password: 'secret1' });
  assert.equal(dup.status, 409);

  assert.equal((await call('POST', '/auth/login', { identifier: 'b@test.vn', password: 'sai' })).status, 401);
  const byPhone = await call('POST', '/auth/login', { identifier: '0987654321', password: 'secret1' });
  assert.equal(byPhone.status, 200);

  const upd = await call('PUT', '/auth/me', { address: '99 Lê Lợi, Quận 1' }, byPhone.data.token);
  assert.equal(upd.data.user.address, '99 Lê Lợi, Quận 1');
  assert.equal((await call('GET', '/auth/me', null, 'token-sai')).status, 401);
});

test('báo giá: phí ship, mã giảm giá, tồn kho', async () => {
  const small = await call('POST', '/orders/quote', { items: [{ productId: 'p041', quantity: 1 }] });
  assert.equal(small.data.shippingFee, 30000);
  assert.equal(small.data.total, 790000 + 30000);

  const big = await call('POST', '/orders/quote', { items: [{ productId: 'p001', quantity: 1 }], couponCode: 'pcstore10' });
  assert.equal(big.data.shippingFee, 0);
  assert.equal(big.data.discount, 369000);
  assert.equal(big.data.total, 3690000 - 369000);

  const tooSmall = await call('POST', '/orders/quote', { items: [{ productId: 'p041', quantity: 1 }], couponCode: 'GIAM200K' });
  assert.equal(tooSmall.status, 400);

  const over = await call('POST', '/orders/quote', { items: [{ productId: 'p035', quantity: 5 }] });
  assert.match(over.data.problems[0].message, /chỉ còn 4/);
});

test('đặt hàng với 5 phương thức thanh toán', async () => {
  const login = await call('POST', '/auth/login', { identifier: 'demo@pcstore.vn', password: '123456' });
  const token = login.data.token;
  const stockBefore = (await call('GET', '/products/p007')).data.product.stock;

  assert.equal((await call('POST', '/orders', { items: [{ productId: 'p007', quantity: 1 }], shipping, paymentMethod: 'cod' })).status, 401);

  const cod = await call('POST', '/orders', { items: [{ productId: 'p007', quantity: 2 }], shipping, paymentMethod: 'cod' }, token);
  assert.equal(cod.status, 201);
  assert.equal(cod.data.order.status, 'confirmed');
  assert.equal(cod.data.order.payment.status, 'unpaid');
  assert.equal((await call('GET', '/products/p007')).data.product.stock, stockBefore - 2);

  const declined = await call('POST', '/orders', {
    items: [{ productId: 'p007', quantity: 1 }], shipping, paymentMethod: 'card',
    card: { number: '4000 0000 0000 0002', holder: 'NGUYEN VAN A', expiry: '12/30', cvv: '123' },
  }, token);
  assert.equal(declined.status, 402);
  assert.equal((await call('GET', '/products/p007')).data.product.stock, stockBefore - 2, 'thẻ bị từ chối không được trừ kho');

  const card = await call('POST', '/orders', {
    items: [{ productId: 'p015', quantity: 1 }], shipping, paymentMethod: 'card',
    card: { number: '4242 4242 4242 4242', holder: 'NGUYEN VAN A', expiry: '12/30', cvv: '123' },
  }, token);
  assert.equal(card.data.order.payment.status, 'paid');
  assert.equal(card.data.order.payment.cardLast4, '4242');
  assert.equal(JSON.stringify(card.data.order).includes('4242424242424242'), false, 'không lưu số thẻ đầy đủ');

  for (const method of ['bank', 'momo', 'zalopay']) {
    const o = await call('POST', '/orders', { items: [{ productId: 'p021', quantity: 1 }], shipping, paymentMethod: method }, token);
    assert.equal(o.data.order.status, 'pending_payment');
    assert.equal(o.data.order.payment.transferContent, o.data.order.id);
    const paid = await call('POST', `/orders/${o.data.order.id}/pay`, null, token);
    assert.equal(paid.data.order.status, 'confirmed');
    assert.equal(paid.data.order.payment.status, 'paid');
    assert.equal((await call('POST', `/orders/${o.data.order.id}/pay`, null, token)).status, 409);
  }

  const cancel = await call('POST', `/orders/${cod.data.order.id}/cancel`, null, token);
  assert.equal(cancel.data.order.status, 'cancelled');
  assert.equal((await call('GET', '/products/p007')).data.product.stock, stockBefore, 'hủy đơn phải hoàn kho');

  const refund = await call('POST', `/orders/${card.data.order.id}/cancel`, null, token);
  assert.equal(refund.data.order.payment.status, 'refunded');

  const list = await call('GET', '/orders', null, token);
  assert.equal(list.data.orders.length, 5);

  const other = await call('POST', '/auth/login', { identifier: 'b@test.vn', password: 'secret1' });
  assert.equal((await call('GET', `/orders/${cod.data.order.id}`, null, other.data.token)).status, 404, 'không xem được đơn của người khác');
});

test('đơn chờ thanh toán quá hạn tự hủy và hoàn kho', async () => {
  const token = (await call('POST', '/auth/login', { identifier: 'demo@pcstore.vn', password: '123456' })).data.token;
  const before = (await call('GET', '/products/p022')).data.product.stock;
  const o = await call('POST', '/orders', { items: [{ productId: 'p022', quantity: 1 }], shipping, paymentMethod: 'momo' }, token);
  db.get().orders.find((x) => x.id === o.data.order.id).payment.expiresAt = new Date(Date.now() - 1000).toISOString();
  const after = await call('GET', `/orders/${o.data.order.id}`, null, token);
  assert.equal(after.data.order.status, 'cancelled');
  assert.equal(after.data.order.payment.status, 'expired');
  assert.equal((await call('GET', '/products/p022')).data.product.stock, before);
});
