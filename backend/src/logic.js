// Các hàm nghiệp vụ thuần (không phụ thuộc Express) để dễ kiểm thử.

const SHIPPING_FEE = 30000;
const FREE_SHIPPING_FROM = 2000000;
const MAX_QTY_PER_ITEM = 10;
const PAYMENT_TIMEOUT_MINUTES = 15;
const PAYMENT_METHODS = ['cod', 'bank', 'momo', 'zalopay', 'card'];

// Bỏ dấu tiếng Việt + chữ thường để tìm kiếm "ban phim" vẫn ra "Bàn phím"
function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

class ApiError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/**
 * Tính tiền cho giỏ hàng dựa trên giá và tồn kho hiện tại trên server
 * (không tin giá do app gửi lên).
 */
function buildQuote(products, coupons, rawItems, couponCode) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ApiError(400, 'Giỏ hàng đang trống');
  }

  // Gộp các dòng trùng sản phẩm
  const merged = new Map();
  for (const it of rawItems) {
    const productId = String(it?.productId ?? '');
    const qty = Number(it?.quantity);
    if (!productId || !Number.isInteger(qty) || qty < 1) {
      throw new ApiError(400, 'Số lượng sản phẩm không hợp lệ');
    }
    merged.set(productId, (merged.get(productId) ?? 0) + qty);
  }

  const items = [];
  const problems = [];
  for (const [productId, quantity] of merged) {
    const p = products.find((x) => x.id === productId);
    if (!p) {
      problems.push({ productId, message: 'Sản phẩm không còn kinh doanh' });
      continue;
    }
    if (quantity > MAX_QTY_PER_ITEM) {
      problems.push({ productId, message: `"${p.name}" chỉ được mua tối đa ${MAX_QTY_PER_ITEM} sản phẩm` });
    } else if (p.stock < quantity) {
      problems.push({
        productId,
        message: p.stock === 0 ? `"${p.name}" đã hết hàng` : `"${p.name}" chỉ còn ${p.stock} sản phẩm`,
      });
    }
    items.push({
      productId: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      quantity,
      lineTotal: p.price * quantity,
    });
  }

  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  let shippingFee = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  let discount = 0;
  let coupon = null;

  if (couponCode) {
    const code = String(couponCode).trim().toUpperCase();
    const c = coupons.find((x) => x.code === code);
    if (!c) throw new ApiError(400, 'Mã giảm giá không tồn tại');
    if (subtotal < c.minSubtotal) {
      throw new ApiError(400, `Mã ${c.code} chỉ áp dụng cho đơn từ ${formatVnd(c.minSubtotal)}`);
    }
    if (c.type === 'percent') discount = Math.min(Math.round((subtotal * c.value) / 100), c.maxDiscount);
    else if (c.type === 'fixed') discount = Math.min(c.value, subtotal);
    else if (c.type === 'shipping') shippingFee = 0;
    coupon = { code: c.code, description: c.description };
  }

  return {
    items,
    problems,
    subtotal,
    shippingFee,
    discount,
    total: Math.max(0, subtotal - discount) + shippingFee,
    coupon,
    freeShippingFrom: FREE_SHIPPING_FROM,
  };
}

function formatVnd(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

// Thuật toán Luhn để kiểm tra số thẻ hợp lệ
function luhnValid(num) {
  let sum = 0;
  let double = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function cardBrand(num) {
  if (/^4/.test(num)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'Mastercard';
  if (/^3[47]/.test(num)) return 'American Express';
  if (/^35/.test(num)) return 'JCB';
  if (/^9704/.test(num)) return 'Napas';
  return 'Thẻ';
}

/**
 * Kiểm tra thông tin thẻ (mô phỏng cổng thanh toán).
 * Thẻ 4000 0000 0000 0002 luôn bị từ chối để thử trường hợp thanh toán thất bại.
 */
function validateCard(card, now = new Date()) {
  const number = String(card?.number ?? '').replace(/\D/g, '');
  const holder = String(card?.holder ?? '').trim();
  const expiry = String(card?.expiry ?? '').trim();
  const cvv = String(card?.cvv ?? '').trim();

  if (number.length < 12 || number.length > 19 || !luhnValid(number)) {
    throw new ApiError(400, 'Số thẻ không hợp lệ');
  }
  if (holder.length < 3) throw new ApiError(400, 'Vui lòng nhập tên chủ thẻ');
  const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!m) throw new ApiError(400, 'Ngày hết hạn phải có dạng MM/YY');
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) throw new ApiError(400, 'Tháng hết hạn không hợp lệ');
  // Thẻ còn hạn đến hết tháng ghi trên thẻ
  const endOfMonth = new Date(year, month, 1);
  if (endOfMonth <= now) throw new ApiError(400, 'Thẻ đã hết hạn');
  if (!/^\d{3,4}$/.test(cvv)) throw new ApiError(400, 'Mã CVV gồm 3 hoặc 4 chữ số');
  if (number === '4000000000000002') {
    throw new ApiError(402, 'Ngân hàng từ chối giao dịch. Vui lòng dùng thẻ khác.');
  }
  return { last4: number.slice(-4), brand: cardBrand(number) };
}

function validateShipping(s) {
  const name = String(s?.name ?? '').trim();
  const phone = String(s?.phone ?? '').replace(/\s/g, '');
  const address = String(s?.address ?? '').trim();
  const note = String(s?.note ?? '').trim().slice(0, 300);
  if (name.length < 2) throw new ApiError(400, 'Vui lòng nhập họ tên người nhận');
  if (!/^0\d{9}$/.test(phone)) throw new ApiError(400, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0');
  if (address.length < 10) throw new ApiError(400, 'Vui lòng nhập địa chỉ giao hàng đầy đủ');
  return { name, phone, address, note };
}

module.exports = {
  SHIPPING_FEE,
  FREE_SHIPPING_FROM,
  MAX_QTY_PER_ITEM,
  PAYMENT_TIMEOUT_MINUTES,
  PAYMENT_METHODS,
  ApiError,
  normalizeText,
  buildQuote,
  luhnValid,
  validateCard,
  validateShipping,
  formatVnd,
};
