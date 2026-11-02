const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { verifyPassword, hashPassword, signToken, verifyToken, publicUser } = require('./auth');
const {
  ApiError,
  normalizeText,
  buildQuote,
  validateCard,
  validateShipping,
  PAYMENT_METHODS,
  PAYMENT_TIMEOUT_MINUTES,
} = require('./logic');

const PAYMENT_LABELS = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank: 'Chuyển khoản ngân hàng',
  momo: 'Ví MoMo',
  zalopay: 'Ví ZaloPay',
  card: 'Thẻ tín dụng / ghi nợ',
};

// Thông tin nhận tiền dùng cho môi trường demo
const RECEIVER = {
  bank: { bankName: 'Vietcombank', accountNumber: '1023456789', accountName: 'CONG TY TNHH PC STORE (DEMO)' },
  momo: { walletName: 'MoMo', phone: '0909888777', accountName: 'PC STORE (DEMO)' },
  zalopay: { walletName: 'ZaloPay', phone: '0909888777', accountName: 'PC STORE (DEMO)' },
};

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Ảnh sản phẩm ----------
// Bỏ ảnh vào backend/public/products, đặt tên theo mã sản phẩm: p001.jpg, p002.png, p003.webp...
const IMAGE_DIR = process.env.IMAGE_DIR || path.join(__dirname, '..', 'public', 'products');
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function imageFor(productId) {
  for (const ext of IMAGE_EXTS) {
    const file = path.join(IMAGE_DIR, productId + ext);
    try {
      const stat = fs.statSync(file);
      // ?v= đổi khi thay ảnh mới để app không dùng ảnh cũ trong bộ nhớ đệm
      return `/images/products/${productId}${ext}?v=${Math.floor(stat.mtimeMs)}`;
    } catch {
      // chưa có ảnh với đuôi này
    }
  }
  return null;
}

const withImage = (p) => ({ ...p, image: imageFor(p.id) });
const withItemImages = (o) => ({ ...o, items: o.items.map((i) => ({ ...i, image: imageFor(i.productId) })) });

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use('/images/products', express.static(IMAGE_DIR, { maxAge: '7d' }));

  // Ghi log ngắn gọn cho mỗi request
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
      }
    });
    next();
  });

  // ---------- Middleware xác thực ----------
  function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const data = db.get();
    const userId = token ? verifyToken(token, data.secret) : null;
    const user = userId ? data.users.find((u) => u.id === userId) : null;
    if (!user) return next(new ApiError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'));
    req.user = user;
    next();
  }

  // ---------- Đơn hàng quá hạn thanh toán ----------
  function restoreStock(data, order) {
    for (const it of order.items) {
      const p = data.products.find((x) => x.id === it.productId);
      if (p) {
        p.stock += it.quantity;
        p.sold = Math.max(0, p.sold - it.quantity);
      }
    }
  }

  function expireOrders() {
    const data = db.get();
    const now = Date.now();
    let changed = false;
    for (const o of data.orders) {
      if (o.status === 'pending_payment' && o.payment.expiresAt && new Date(o.payment.expiresAt).getTime() < now) {
        o.status = 'cancelled';
        o.payment.status = 'expired';
        o.cancelReason = 'Quá thời hạn thanh toán';
        o.timeline.push({ status: 'cancelled', label: 'Đơn hàng bị hủy do quá hạn thanh toán', at: new Date().toISOString() });
        restoreStock(data, o);
        changed = true;
      }
    }
    if (changed) db.save();
  }

  // ---------- Sản phẩm ----------
  function categoriesWithCount(data) {
    return data.categories.map((c) => ({
      ...c,
      productCount: data.products.filter((p) => p.category === c.id).length,
    }));
  }

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, name: 'PC Store API', time: new Date().toISOString() });
  });

  app.get('/api/categories', (req, res) => {
    res.json(categoriesWithCount(db.get()));
  });

  app.get('/api/home', (req, res) => {
    const data = db.get();
    const discountPct = (p) => (p.oldPrice ? (p.oldPrice - p.price) / p.oldPrice : 0);
    res.json({
      banners: data.banners,
      categories: categoriesWithCount(data),
      flashSale: data.products
        .filter((p) => p.oldPrice && p.stock > 0)
        .sort((a, b) => discountPct(b) - discountPct(a))
        .slice(0, 8)
        .map(withImage),
      bestSellers: [...data.products].sort((a, b) => b.sold - a.sold).slice(0, 8).map(withImage),
      newArrivals: [...data.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map(withImage),
    });
  });

  app.get('/api/brands', (req, res) => {
    const data = db.get();
    const category = req.query.category ? String(req.query.category) : null;
    const brands = [...new Set(data.products.filter((p) => !category || p.category === category).map((p) => p.brand))];
    res.json(brands.sort((a, b) => a.localeCompare(b)));
  });

  app.get('/api/products', (req, res) => {
    const data = db.get();
    const q = normalizeText(req.query.q);
    const category = req.query.category ? String(req.query.category) : null;
    const brand = req.query.brand ? String(req.query.brand) : null;
    const minPrice = Number(req.query.minPrice) || 0;
    const maxPrice = Number(req.query.maxPrice) || Infinity;
    const inStock = req.query.inStock === '1' || req.query.inStock === 'true';
    // ids=p001,p002: lấy nhiều sản phẩm theo mã (app dùng để cập nhật giá trong giỏ hàng)
    const ids = req.query.ids ? String(req.query.ids).split(',').filter(Boolean) : null;
    const sort = String(req.query.sort || 'popular');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    // Mọi từ khóa đều phải xuất hiện trong tên, hãng hoặc tên danh mục
    const words = q ? q.split(/\s+/) : [];
    let list = data.products.filter((p) => {
      if (ids && !ids.includes(p.id)) return false;
      if (category && p.category !== category) return false;
      if (brand && p.brand !== brand) return false;
      if (p.price < minPrice || p.price > maxPrice) return false;
      if (inStock && p.stock <= 0) return false;
      if (words.length) {
        const cat = data.categories.find((c) => c.id === p.category);
        const haystack = normalizeText(`${p.name} ${p.brand} ${cat?.name ?? ''} ${cat?.fullName ?? ''}`);
        return words.every((w) => haystack.includes(w));
      }
      return true;
    });

    const sorters = {
      popular: (a, b) => b.sold - a.sold,
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    };
    list = [...list].sort(sorters[sort] || sorters.popular);

    const total = list.length;
    const items = list.slice((page - 1) * limit, page * limit).map(withImage);
    res.json({ items, total, page, limit, hasMore: page * limit < total });
  });

  app.get('/api/products/:id', (req, res, next) => {
    const data = db.get();
    const p = data.products.find((x) => x.id === req.params.id);
    if (!p) return next(new ApiError(404, 'Không tìm thấy sản phẩm'));
    const related = data.products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 6).map(withImage);
    res.json({ product: withImage(p), category: data.categories.find((c) => c.id === p.category), related });
  });

  app.get('/api/coupons', (req, res) => {
    res.json(db.get().coupons.map(({ code, description, minSubtotal }) => ({ code, description, minSubtotal })));
  });

  // ---------- Tài khoản ----------
  app.post('/api/auth/register', wrap(async (req, res) => {
    const data = db.get();
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const phone = String(req.body?.phone ?? '').replace(/\s/g, '');
    const password = String(req.body?.password ?? '');

    if (name.length < 2) throw new ApiError(400, 'Họ tên phải có ít nhất 2 ký tự');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Email không hợp lệ');
    if (!/^0\d{9}$/.test(phone)) throw new ApiError(400, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0');
    if (password.length < 6) throw new ApiError(400, 'Mật khẩu phải có ít nhất 6 ký tự');
    if (data.users.some((u) => u.email === email)) throw new ApiError(409, 'Email này đã được đăng ký');
    if (data.users.some((u) => u.phone === phone)) throw new ApiError(409, 'Số điện thoại này đã được đăng ký');

    const user = {
      id: 'u_' + crypto.randomBytes(6).toString('hex'),
      name,
      email,
      phone,
      address: '',
      password: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    db.save();
    res.status(201).json({ token: signToken(user.id, data.secret), user: publicUser(user) });
  }));

  app.post('/api/auth/login', wrap(async (req, res) => {
    const data = db.get();
    const identifier = String(req.body?.identifier ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!identifier || !password) throw new ApiError(400, 'Vui lòng nhập email/số điện thoại và mật khẩu');
    const user = data.users.find((u) => u.email === identifier || u.phone === identifier);
    if (!user || !verifyPassword(password, user.password)) {
      throw new ApiError(401, 'Thông tin đăng nhập không chính xác');
    }
    res.json({ token: signToken(user.id, data.secret), user: publicUser(user) });
  }));

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  app.put('/api/auth/me', requireAuth, (req, res) => {
    const data = db.get();
    const name = req.body?.name !== undefined ? String(req.body.name).trim() : req.user.name;
    const phone = req.body?.phone !== undefined ? String(req.body.phone).replace(/\s/g, '') : req.user.phone;
    const address = req.body?.address !== undefined ? String(req.body.address).trim().slice(0, 300) : req.user.address;
    if (name.length < 2) throw new ApiError(400, 'Họ tên phải có ít nhất 2 ký tự');
    if (!/^0\d{9}$/.test(phone)) throw new ApiError(400, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0');
    if (data.users.some((u) => u.phone === phone && u.id !== req.user.id)) {
      throw new ApiError(409, 'Số điện thoại này đã được dùng cho tài khoản khác');
    }
    Object.assign(req.user, { name, phone, address });
    db.save();
    res.json({ user: publicUser(req.user) });
  });

  // ---------- Đơn hàng ----------
  app.post('/api/orders/quote', (req, res) => {
    const data = db.get();
    res.json(withItemImages(buildQuote(data.products, data.coupons, req.body?.items, req.body?.couponCode)));
  });

  app.post('/api/orders', requireAuth, (req, res) => {
    const data = db.get();
    const method = String(req.body?.paymentMethod ?? '');
    if (!PAYMENT_METHODS.includes(method)) throw new ApiError(400, 'Vui lòng chọn phương thức thanh toán');
    const shipping = validateShipping(req.body?.shipping);
    const quote = buildQuote(data.products, data.coupons, req.body?.items, req.body?.couponCode);
    if (quote.problems.length) {
      throw new ApiError(409, quote.problems[0].message, { problems: quote.problems });
    }

    // Kiểm tra thẻ trước khi trừ kho để thẻ bị từ chối không làm mất hàng
    const card = method === 'card' ? validateCard(req.body?.card) : null;

    for (const it of quote.items) {
      const p = data.products.find((x) => x.id === it.productId);
      p.stock -= it.quantity;
      p.sold += it.quantity;
    }

    const now = new Date();
    let id;
    do {
      const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
      id = `PCS${ymd}${Math.floor(1000 + Math.random() * 9000)}`;
    } while (data.orders.some((o) => o.id === id));

    const online = ['bank', 'momo', 'zalopay'].includes(method);
    const order = {
      id,
      userId: req.user.id,
      items: quote.items,
      subtotal: quote.subtotal,
      shippingFee: quote.shippingFee,
      discount: quote.discount,
      total: quote.total,
      coupon: quote.coupon,
      shipping,
      payment: {
        method,
        label: PAYMENT_LABELS[method],
        status: method === 'card' ? 'paid' : online ? 'pending' : 'unpaid',
        ...(card ? { cardBrand: card.brand, cardLast4: card.last4, paidAt: now.toISOString() } : {}),
        ...(online
          ? {
              receiver: RECEIVER[method],
              transferContent: id,
              expiresAt: new Date(now.getTime() + PAYMENT_TIMEOUT_MINUTES * 60000).toISOString(),
            }
          : {}),
      },
      status: online ? 'pending_payment' : 'confirmed',
      timeline: [
        { status: 'created', label: 'Đặt hàng thành công', at: now.toISOString() },
        ...(card ? [{ status: 'paid', label: `Đã thanh toán bằng ${card.brand} •••• ${card.last4}`, at: now.toISOString() }] : []),
        ...(online ? [] : [{ status: 'confirmed', label: 'Cửa hàng đã xác nhận đơn hàng', at: now.toISOString() }]),
      ],
      createdAt: now.toISOString(),
    };
    data.orders.push(order);
    db.save();
    res.status(201).json({ order: withItemImages(order) });
  });

  app.get('/api/orders', requireAuth, (req, res) => {
    expireOrders();
    const orders = db
      .get()
      .orders.filter((o) => o.userId === req.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ orders: orders.map(withItemImages) });
  });

  function findOwnOrder(req) {
    expireOrders();
    const order = db.get().orders.find((o) => o.id === req.params.id && o.userId === req.user.id);
    if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng');
    return order;
  }

  app.get('/api/orders/:id', requireAuth, (req, res) => {
    res.json({ order: withItemImages(findOwnOrder(req)) });
  });

  // Mô phỏng cổng thanh toán báo về đã nhận tiền (chuyển khoản / ví điện tử)
  app.post('/api/orders/:id/pay', requireAuth, (req, res) => {
    const order = findOwnOrder(req);
    if (order.status === 'cancelled') throw new ApiError(409, 'Đơn hàng đã bị hủy, không thể thanh toán');
    if (order.status !== 'pending_payment') throw new ApiError(409, 'Đơn hàng này không chờ thanh toán');
    const now = new Date().toISOString();
    order.status = 'confirmed';
    order.payment.status = 'paid';
    order.payment.paidAt = now;
    order.timeline.push(
      { status: 'paid', label: `Đã nhận thanh toán qua ${PAYMENT_LABELS[order.payment.method]}`, at: now },
      { status: 'confirmed', label: 'Cửa hàng đã xác nhận đơn hàng', at: now },
    );
    db.save();
    res.json({ order: withItemImages(order) });
  });

  app.post('/api/orders/:id/cancel', requireAuth, (req, res) => {
    const data = db.get();
    const order = findOwnOrder(req);
    if (!['pending_payment', 'confirmed'].includes(order.status)) {
      throw new ApiError(409, 'Đơn hàng không thể hủy ở trạng thái hiện tại');
    }
    const now = new Date().toISOString();
    order.status = 'cancelled';
    order.cancelReason = 'Khách hàng hủy đơn';
    if (order.payment.status === 'paid') {
      order.payment.status = 'refunded';
      order.timeline.push({ status: 'refunded', label: 'Đã hoàn tiền về phương thức thanh toán ban đầu', at: now });
    } else if (order.payment.status === 'pending') {
      order.payment.status = 'cancelled';
    }
    order.timeline.push({ status: 'cancelled', label: 'Khách hàng đã hủy đơn hàng', at: now });
    restoreStock(data, order);
    db.save();
    res.json({ order: withItemImages(order) });
  });

  // ---------- Xử lý lỗi ----------
  app.use('/api', (req, res) => {
    res.status(404).json({ message: 'API không tồn tại' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ message: err.message, ...(err.extra || {}) });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Dữ liệu gửi lên không đúng định dạng JSON' });
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  });

  return app;
}

module.exports = { createApp };
