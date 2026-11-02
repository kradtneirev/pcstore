// Lưu trữ đơn giản bằng file JSON: dữ liệu nằm trong bộ nhớ, mỗi lần thay đổi thì ghi lại file.
// Ghi ra file tạm rồi đổi tên để file không bị hỏng nếu tắt server giữa chừng.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { categories, buildProducts, coupons, banners } = require('./seed');
const { hashPassword } = require('./auth');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function createInitialData() {
  return {
    secret: crypto.randomBytes(32).toString('hex'),
    categories,
    banners,
    coupons,
    products: buildProducts(),
    users: [
      {
        id: 'u_demo',
        name: 'Khách hàng Demo',
        email: 'demo@pcstore.vn',
        phone: '0901234567',
        address: '12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, TP. Hồ Chí Minh',
        password: hashPassword('123456'),
        createdAt: new Date().toISOString(),
      },
    ],
    orders: [],
  };
}

let data;

function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } else {
    data = createInitialData();
    save();
  }
  // Trên Render đặt JWT_SECRET cố định để server khởi động lại không làm mất phiên đăng nhập
  if (process.env.JWT_SECRET) data.secret = process.env.JWT_SECRET;
  return data;
}

function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

function reset() {
  data = createInitialData();
  save();
  return data;
}

function get() {
  if (!data) load();
  return data;
}

module.exports = { get, save, reset, DB_FILE };
