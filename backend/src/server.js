const os = require('os');
const db = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 4000;

db.get();
const app = createApp();

// Lắng nghe trên mọi card mạng để điện thoại trong cùng Wi-Fi gọi được
app.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log(` PC Store API đang chạy tại cổng ${PORT}`);
  console.log(` Dữ liệu: ${db.DB_FILE}`);
  console.log(' Địa chỉ để nhập vào app (Cài đặt > Địa chỉ máy chủ):');
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) console.log(`   http://${net.address}:${PORT}`);
    }
  }
  console.log(' Tài khoản demo: demo@pcstore.vn / 123456');
  console.log('==============================================');
});
