// Kiểm thử chế độ lưu MongoDB (dùng MongoDB chạy tạm trong bộ nhớ): dữ liệu còn nguyên sau khi khởi động lại server
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
const db = require('../src/db');
const { createApp } = require('../src/app');

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = 'pcstore_test';
});

after(async () => {
  await db.close();
  await mongod.stop();
  delete process.env.MONGODB_URI;
});

// Khởi động "server" mới: đọc lại dữ liệu từ MongoDB
async function startServer() {
  await db.init();
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, url, body, token) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  };
  const stop = async () => {
    await new Promise((r) => server.close(r));
    await db.close();
  };
  return { call, stop };
}

test('tài khoản, đơn hàng, tồn kho còn nguyên sau khi khởi động lại', async () => {
  // Lần chạy đầu: MongoDB trống thì tự tạo dữ liệu ban đầu
  let s = await startServer();
  assert.match(db.storageName(), /MongoDB/);
  const stock0 = (await s.call('GET', '/products/p001')).data.product.stock;
  const reg = await s.call('POST', '/auth/register', { name: 'Người Dùng Mới', email: 'moi@test.vn', phone: '0977000111', password: 'matkhau1' });
  assert.equal(reg.status, 201);
  const order = await s.call(
    'POST',
    '/orders',
    {
      items: [{ productId: 'p001', quantity: 2 }],
      paymentMethod: 'cod',
      shipping: { name: 'Người Dùng Mới', phone: '0977000111', address: '1 Lê Lợi, Quận 1, TP.HCM' },
    },
    reg.data.token,
  );
  assert.equal(order.status, 201);
  await s.call('PUT', '/cart', { items: [{ productId: 'p041', quantity: 3, selected: true }] }, reg.data.token);
  await s.stop();

  // Giả lập seed.js đổi tên sản phẩm: tên mới phải theo code, tồn kho giữ theo dữ liệu đã lưu
  const { MongoClient } = require('mongodb');
  const c = await MongoClient.connect(process.env.MONGODB_URI);
  await c.db('pcstore_test').collection('products').updateOne({ _id: 'p001' }, { $set: { name: 'Tên cũ' } });
  await c.close();

  // Lần chạy thứ hai: đọc lại từ MongoDB
  s = await startServer();
  const login = await s.call('POST', '/auth/login', { identifier: 'moi@test.vn', password: 'matkhau1' });
  assert.equal(login.status, 200, 'tài khoản đăng ký trước khi khởi động lại vẫn đăng nhập được');
  // Token cũ vẫn dùng được vì khóa ký JWT được lưu trong MongoDB
  const orders = await s.call('GET', '/orders', null, reg.data.token);
  assert.equal(orders.status, 200);
  assert.equal(orders.data.orders.length, 1);
  assert.equal(orders.data.orders[0].id, order.data.order.id);
  const cart = await s.call('GET', '/cart', null, reg.data.token);
  assert.deepEqual(cart.data.items.map((i) => [i.productId, i.quantity]), [['p041', 3]], 'giỏ hàng còn sau khi khởi động lại');
  const p = (await s.call('GET', '/products/p001')).data.product;
  assert.equal(p.stock, stock0 - 2);
  assert.equal(p.name, 'Intel Core i5-14400F');
  const demo = await s.call('POST', '/auth/login', { identifier: 'demo@pcstore.vn', password: '123456' });
  assert.equal(demo.status, 200);
  await s.stop();
});

test('reset-data xóa dữ liệu trên MongoDB', async () => {
  await db.init();
  await db.reset();
  const data = db.get();
  assert.equal(data.orders.length, 0);
  assert.deepEqual(data.users.map((u) => u.email), ['demo@pcstore.vn']);
  await db.close();
  await db.init();
  assert.equal(db.get().orders.length, 0);
  assert.equal(db.get().users.length, 1);
  await db.close();
});
