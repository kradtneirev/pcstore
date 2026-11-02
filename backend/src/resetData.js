// Xóa toàn bộ đơn hàng/tài khoản mới và khôi phục dữ liệu ban đầu: npm run reset-data
const db = require('./db');

db.reset();
console.log(`Đã khôi phục dữ liệu ban đầu: ${db.DB_FILE}`);
