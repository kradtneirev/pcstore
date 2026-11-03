// Xóa toàn bộ đơn hàng/tài khoản mới và khôi phục dữ liệu ban đầu: npm run reset-data
// (Có MONGODB_URI thì xóa trên MongoDB, không thì xóa file data/db.json)
const db = require('./db');

(async () => {
  await db.init();
  await db.reset();
  console.log(`Đã khôi phục dữ liệu ban đầu: ${db.storageName()}`);
  await db.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
