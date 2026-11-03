// Lớp lưu trữ dữ liệu. Dữ liệu luôn nằm trong bộ nhớ (db.get()), mỗi lần thay đổi gọi db.save().
// - Có biến môi trường MONGODB_URI: lưu vào MongoDB (dùng khi chạy trên Render, dữ liệu không mất khi khởi động lại)
// - Không có: lưu vào file data/db.json (chạy trên máy)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const { categories, buildProducts, coupons, banners } = require('./seed');
const { hashPassword } = require('./auth');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let data = null;
let client = null;
let mdb = null;

function demoUser() {
  return {
    id: 'u_demo',
    name: 'Khách hàng Demo',
    email: 'demo@pcstore.vn',
    phone: '0901234567',
    address: '12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, TP. Hồ Chí Minh',
    password: hashPassword('123456'),
    createdAt: new Date().toISOString(),
  };
}

function createInitialData() {
  return {
    secret: crypto.randomBytes(32).toString('hex'),
    categories,
    banners,
    coupons,
    products: buildProducts(),
    users: [demoUser()],
    orders: [],
  };
}

// Sản phẩm lấy theo seed.js mới nhất nhưng giữ tồn kho/số đã bán đã lưu
function mergeProducts(stored) {
  return buildProducts().map((p) => {
    const s = stored.find((x) => x.id === p.id);
    return s ? { ...p, stock: s.stock, sold: s.sold } : p;
  });
}

// Danh mục, banner, mã giảm giá luôn theo code; sản phẩm/tài khoản/đơn hàng theo dữ liệu đã lưu
function fromStored(stored) {
  const users = stored.users?.length ? stored.users : [];
  if (!users.some((u) => u.email === 'demo@pcstore.vn')) users.unshift(demoUser());
  return {
    secret: stored.secret || crypto.randomBytes(32).toString('hex'),
    categories,
    banners,
    coupons,
    products: mergeProducts(stored.products ?? []),
    users,
    orders: stored.orders ?? [],
  };
}

function applyEnvSecret() {
  // Đặt JWT_SECRET cố định để khởi động lại server không làm mất phiên đăng nhập
  if (process.env.JWT_SECRET) data.secret = process.env.JWT_SECRET;
}

// ---------- Lưu bằng file JSON ----------
function loadFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  data = fs.existsSync(DB_FILE) ? fromStored(JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))) : createInitialData();
  applyEnvSecret();
  writeFile();
}

function writeFile() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

// ---------- Lưu bằng MongoDB ----------
const strip = ({ _id, ...rest }) => rest;
const COLLECTIONS = ['products', 'users', 'orders'];

async function loadMongo(uri) {
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  mdb = client.db(process.env.MONGODB_DB || 'pcstore');
  const [config, products, users, orders] = await Promise.all([
    mdb.collection('meta').findOne({ _id: 'config' }),
    mdb.collection('products').find().toArray(),
    mdb.collection('users').find().toArray(),
    mdb.collection('orders').find().toArray(),
  ]);
  data = fromStored({ secret: config?.secret, products: products.map(strip), users: users.map(strip), orders: orders.map(strip) });
  await mdb.collection('meta').updateOne({ _id: 'config' }, { $set: { secret: data.secret } }, { upsert: true });
  applyEnvSecret();
  await writeMongo(snapshot());
}

function snapshot() {
  return structuredClone({ products: data.products, users: data.users, orders: data.orders });
}

async function writeMongo(snap) {
  await Promise.all(
    COLLECTIONS.map((name) => {
      const docs = snap[name];
      if (docs.length === 0) return null;
      return mdb.collection(name).bulkWrite(
        docs.map((d) => ({ replaceOne: { filter: { _id: d.id }, replacement: { ...d, _id: d.id }, upsert: true } })),
        { ordered: false },
      );
    }),
  );
}

// Ghi lần lượt từng lần; nhiều lần save() liên tiếp được gộp lại thành 1 lần ghi
let pending = false;
let running = null;

function scheduleMongoWrite() {
  pending = true;
  if (!running) {
    running = (async () => {
      while (pending) {
        pending = false;
        try {
          await writeMongo(snapshot());
        } catch (e) {
          console.error('Lỗi ghi MongoDB:', e.message);
          break; // lần save() sau sẽ ghi lại toàn bộ
        }
      }
      running = null;
    })();
  }
}

// ---------- API dùng chung ----------
async function init() {
  if (process.env.MONGODB_URI) await loadMongo(process.env.MONGODB_URI);
  else loadFile();
  return data;
}

function get() {
  if (!data) loadFile(); // chế độ file có thể dùng ngay không cần init()
  return data;
}

function save() {
  if (mdb) scheduleMongoWrite();
  else writeFile();
}

// Đợi ghi xong dữ liệu đang chờ (gọi trước khi tắt server)
async function flush() {
  while (running) await running;
}

async function reset() {
  data = createInitialData();
  if (mdb) {
    await flush();
    await Promise.all([...COLLECTIONS, 'meta'].map((c) => mdb.collection(c).deleteMany({})));
    await mdb.collection('meta').insertOne({ _id: 'config', secret: data.secret });
    applyEnvSecret();
    await writeMongo(snapshot());
  } else {
    applyEnvSecret();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    writeFile();
  }
  return data;
}

async function close() {
  await flush();
  if (client) await client.close();
  client = null;
  mdb = null;
  data = null;
}

const storageName = () => (mdb ? `MongoDB (${mdb.databaseName})` : DB_FILE);

module.exports = { init, get, save, reset, close, storageName };
