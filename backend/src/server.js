const os = require('os');
const db = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  await db.init();
  const app = createApp();

  // Lắng nghe trên mọi card mạng để điện thoại trong cùng Wi-Fi gọi được
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('==============================================');
    console.log(` PC Store API đang chạy tại cổng ${PORT}`);
    console.log(` Dữ liệu: ${db.storageName()}`);
    console.log(' Địa chỉ để nhập vào app (Cài đặt > Địa chỉ máy chủ):');
    for (const list of Object.values(os.networkInterfaces())) {
      for (const net of list || []) {
        if (net.family === 'IPv4' && !net.internal) console.log(`   http://${net.address}:${PORT}`);
      }
    }
    console.log(' Tài khoản demo: demo@pcstore.vn / 123456');
    console.log('==============================================');
  });

  // Render gửi SIGTERM khi khởi động lại: ghi nốt dữ liệu rồi mới tắt
  const shutdown = async () => {
    server.close();
    await db.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  console.error('Không khởi động được server:', e.message);
  process.exit(1);
});
