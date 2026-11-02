// Public sales page, registration orders (bank transfer via VietQR) and blog.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { paths: storage } = require('./storage');

// All live data is in backend/storage (outside Git), see storage.js.
const configPath = storage.siteConfig;
const blogPath = storage.blog;
const ordersPath = storage.orders; // customers' names, emails and phone numbers
const blogImagesPath = storage.blogImages;
const IMAGE_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2)); }

// Environment variables override site-config.json (handy for Docker).
function siteConfig() {
  const file = readJson(configPath, {});
  const bank = file.bank || {};
  return {
    price: Number(process.env.COURSE_PRICE || file.price || 1990000),
    bank: {
      bankId: process.env.BANK_ID || bank.bankId || '',
      bankName: process.env.BANK_NAME || bank.bankName || '',
      accountNo: process.env.BANK_ACCOUNT_NO || bank.accountNo || '',
      accountName: process.env.BANK_ACCOUNT_NAME || bank.accountName || ''
    },
    zaloPhone: String(process.env.ZALO_PHONE || file.zaloPhone || '').replace(/\D/g, ''),
    instructor: file.instructor || { name: 'Cô Mer', role: '', bio: '' }
  };
}
const bankReady = bank => Boolean(bank.bankId && bank.accountNo);

// The QR fills in the account and the transfer note only; the customer types the amount
// (shown in the dialog), so the QR stays valid whatever the price.
function qrUrl(bank, note) {
  const params = new URLSearchParams({ addInfo: note });
  if (bank.accountName) params.set('accountName', bank.accountName);
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(bank.accountNo)}-compact2.png?${params}`;
}

// Short code without look-alike characters (0/O, 1/I) so it is easy to type into a bank app.
function orderCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'MER' + Array.from(crypto.randomBytes(6), byte => alphabet[byte % alphabet.length]).join('');
}
function randomPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(10), byte => alphabet[byte % alphabet.length]).join('');
}

function slugify(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `bai-viet-${Date.now()}`;
}
function excerptOf(post) {
  if (post.excerpt) return post.excerpt;
  const text = post.content.replace(/^!\[[^\]]*\]\(\S+\)$/gm, '').replace(/^#+\s.*$/gm, '').replace(/^-\s/gm, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}
// Saves a base64 blog image (cover) and returns its public URL, or an error message.
function saveBlogImage(body) {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(body.dataUrl || ''));
  if (!match) return { error: 'Ảnh phải là PNG, JPEG, WEBP hoặc GIF dạng base64.' };
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return { error: 'Ảnh phải nhỏ hơn 5 MB.' };
  const base = slugify(path.parse(String(body.filename || 'anh-bia')).name).slice(0, 60);
  const name = `${Date.now()}-${base}${IMAGE_TYPES[match[1]]}`;
  fs.writeFileSync(path.join(blogImagesPath, name), bytes);
  return { url: `/api/blog-images/${name}` };
}
const validCover = cover => !cover || /^\/api\/blog-images\/[\w.-]+$/.test(cover) || /^https:\/\/\S+$/.test(cover);

const publicPost = ({ content, ...post }) => ({ ...post, excerpt: excerptOf({ content, ...post }) });

// Very small in-memory limits so public forms cannot be flooded or used to guess codes.
function rateLimiter(maxPerWindow, windowMs = 10 * 60 * 1000) {
  const recent = new Map();
  return ip => {
    const now = Date.now(); const list = (recent.get(ip) || []).filter(time => now - time < windowMs);
    if (list.length >= maxPerWindow) { recent.set(ip, list); return true; }
    list.push(now); recent.set(ip, list); return false;
  };
}
const tooManyOrders = rateLimiter(5);
const tooManyCouponChecks = rateLimiter(20);

// ---- Discount codes ----
// { id, code, type: 'percent' | 'amount', value, active, maxUses (0 = unlimited), expiresAt ('YYYY-MM-DD' or ''), note }
// Uses are counted from PAID orders, so unpaid registrations never use up a code.
const normalizeCode = value => String(value || '').toUpperCase().replace(/\s+/g, '');
const COUPON_CODE = /^[A-Z0-9]{3,20}$/;
// A code is valid through the end of its expiry date, Vietnam time (UTC+7).
const expired = coupon => coupon.expiresAt && Date.now() > new Date(`${coupon.expiresAt}T23:59:59+07:00`).getTime();
function discountFor(coupon, price) {
  const off = coupon.type === 'percent' ? Math.round(price * coupon.value / 100) : coupon.value;
  return Math.min(price, Math.max(0, off));
}
function couponLabel(coupon) { return coupon.type === 'percent' ? `giảm ${coupon.value}%` : `giảm ${Number(coupon.value).toLocaleString('vi-VN')}đ`; }

module.exports = function registerSiteRoutes(app, { auth, admin, readData, writeData, getLessons, courseIndex }) {
  const posts = () => readJson(blogPath, { posts: [] }).posts;
  const savePosts = list => writeJson(blogPath, { posts: list });
  const orders = () => readJson(ordersPath, { orders: [] }).orders;
  const saveOrders = list => writeJson(ordersPath, { orders: list });
  const coupons = () => readJson(storage.coupons, { coupons: [] }).coupons;
  const saveCoupons = list => writeJson(storage.coupons, { coupons: list });
  const usesOf = code => orders().filter(order => order.couponCode === code && order.status === 'paid').length;
  // Returns { coupon, discount, amount } for a usable code, or { error } with a message for the customer.
  function priceWithCoupon(rawCode, price) {
    const code = normalizeCode(rawCode);
    if (!code) return { coupon: null, discount: 0, amount: price };
    const coupon = coupons().find(item => item.code === code);
    if (!coupon || !coupon.active) return { error: 'Mã giảm giá không đúng hoặc đã ngừng áp dụng.' };
    if (expired(coupon)) return { error: 'Mã giảm giá đã hết hạn.' };
    if (coupon.maxUses && usesOf(code) >= coupon.maxUses) return { error: 'Mã giảm giá đã hết lượt sử dụng.' };
    const discount = discountFor(coupon, price);
    return { coupon, discount, amount: price - discount };
  }

  // ---- Public ----
  app.get('/api/public/site', (_req, res) => {
    const config = siteConfig();
    res.json({
      price: config.price,
      zaloPhone: config.zaloPhone,
      bankReady: bankReady(config.bank),
      instructor: config.instructor,
      course: {
        title: courseIndex.course.title,
        description: courseIndex.course.description,
        lessons: getLessons().map(({ id, title, objective, topics, duration }) => ({ id, title, objective, topics, duration }))
      }
    });
  });

  app.post('/api/coupons/check', (req, res) => {
    if (tooManyCouponChecks(req.ip)) return res.status(429).json({ message: 'Bạn đã thử nhiều mã liên tiếp. Vui lòng thử lại sau ít phút.' });
    const price = siteConfig().price; const result = priceWithCoupon(req.body.code, price);
    if (result.error) return res.status(400).json({ message: result.error });
    if (!result.coupon) return res.status(400).json({ message: 'Hãy nhập mã giảm giá.' });
    res.json({ code: result.coupon.code, label: couponLabel(result.coupon), original: price, discount: result.discount, amount: result.amount });
  });

  app.post('/api/orders', (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').replace(/[^\d+]/g, '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Vui lòng nhập họ tên (2–100 ký tự).' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) return res.status(400).json({ message: 'Email chưa đúng định dạng.' });
    if (!/^\+?\d{9,12}$/.test(phone)) return res.status(400).json({ message: 'Số điện thoại chưa đúng (9–12 chữ số).' });
    if (tooManyOrders(req.ip)) return res.status(429).json({ message: 'Bạn đã gửi nhiều đăng ký liên tiếp. Vui lòng thử lại sau ít phút hoặc nhắn Zalo cho chúng tôi.' });

    const config = siteConfig(); const priced = priceWithCoupon(req.body.couponCode, config.price);
    if (priced.error) return res.status(400).json({ message: priced.error });
    const list = orders(); const now = new Date().toISOString();
    // Reuse an unpaid order for the same email so the customer keeps one transfer code.
    let order = list.find(item => item.email === email && item.status === 'pending');
    if (order) { order.name = name; order.phone = phone; order.updatedAt = now; }
    else {
      let code; do { code = orderCode(); } while (list.some(item => item.code === code));
      order = { id: `order-${Date.now()}`, code, name, email, phone, status: 'pending', createdAt: now };
      list.unshift(order);
    }
    // Price, discount and transfer note always follow the latest registration.
    Object.assign(order, { originalAmount: config.price, discount: priced.discount, amount: priced.amount, couponCode: priced.coupon?.code || null });
    order.transferNote = order.couponCode ? `${order.code} ${order.couponCode}` : order.code;
    saveOrders(list);
    res.status(201).json({
      code: order.code, amount: order.amount, originalAmount: order.originalAmount, discount: order.discount, couponCode: order.couponCode, transferNote: order.transferNote,
      bank: bankReady(config.bank) ? config.bank : null,
      qrUrl: bankReady(config.bank) ? qrUrl(config.bank, order.transferNote) : null,
      zaloPhone: config.zaloPhone
    });
  });

  app.get('/api/blog', (_req, res) => {
    res.json(posts().filter(post => post.published).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicPost));
  });
  app.get('/api/blog/:slug', (req, res) => {
    const post = posts().find(item => item.slug === req.params.slug && item.published);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
    res.json({ ...post, excerpt: excerptOf(post) });
  });

  // ---- Admin: orders ----
  app.get('/api/admin/orders', auth, admin, (_req, res) => res.json(orders()));
  app.post('/api/admin/orders/:id/confirm', auth, admin, (req, res) => {
    const list = orders(); const order = list.find(item => item.id === req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn đăng ký.' });
    if (order.status === 'paid') return res.status(400).json({ message: 'Đơn này đã được xác nhận.' });
    const data = readData(); let student = data.users.find(item => item.email.toLowerCase() === order.email);
    let password = null;
    if (!student) {
      password = randomPassword();
      student = { id: `student-${Date.now()}`, name: order.name, email: order.email, phone: order.phone, passwordHash: bcrypt.hashSync(password, 10), role: 'student', completedLessons: [] };
      data.users.push(student); writeData(data);
    }
    order.status = 'paid'; order.paidAt = new Date().toISOString(); order.studentId = student.id; saveOrders(list);
    // The password is returned once so the admin can send it; it is never stored in plain text.
    res.json({ order, password, existingAccount: !password });
  });
  app.post('/api/admin/orders/:id/cancel', auth, admin, (req, res) => {
    const list = orders(); const order = list.find(item => item.id === req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn đăng ký.' });
    if (order.status === 'paid') return res.status(400).json({ message: 'Không thể hủy đơn đã thanh toán.' });
    order.status = 'cancelled'; order.updatedAt = new Date().toISOString(); saveOrders(list); res.json(order);
  });

  // ---- Admin: discount codes ----
  function validCoupon(body) {
    const code = normalizeCode(body.code); const type = body.type === 'amount' ? 'amount' : 'percent'; const value = Math.round(Number(body.value));
    if (!COUPON_CODE.test(code)) return { error: 'Mã gồm 3–20 chữ cái không dấu hoặc số, viết liền (ví dụ GIAM20).' };
    if (type === 'percent' && !(value >= 1 && value <= 100)) return { error: 'Phần trăm giảm phải từ 1 đến 100.' };
    if (type === 'amount' && !(value >= 1000)) return { error: 'Số tiền giảm phải từ 1.000đ trở lên.' };
    const maxUses = Math.max(0, Math.round(Number(body.maxUses) || 0));
    const expiresAt = String(body.expiresAt || '').trim();
    if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return { error: 'Ngày hết hạn không hợp lệ.' };
    return { code, type, value, maxUses, expiresAt, active: body.active !== false, note: String(body.note || '').trim().slice(0, 200) };
  }
  const couponView = coupon => ({ ...coupon, uses: usesOf(coupon.code), expired: Boolean(expired(coupon)) });
  app.get('/api/admin/coupons', auth, admin, (_req, res) => res.json(coupons().map(couponView)));
  app.post('/api/admin/coupons', auth, admin, (req, res) => {
    const fields = validCoupon(req.body); if (fields.error) return res.status(400).json({ message: fields.error });
    const list = coupons(); if (list.some(item => item.code === fields.code)) return res.status(400).json({ message: `Mã ${fields.code} đã tồn tại.` });
    const coupon = { id: `coupon-${Date.now()}`, ...fields, createdAt: new Date().toISOString() };
    list.unshift(coupon); saveCoupons(list); res.status(201).json(couponView(coupon));
  });
  app.put('/api/admin/coupons/:id', auth, admin, (req, res) => {
    const list = coupons(); const coupon = list.find(item => item.id === req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Không tìm thấy mã giảm giá.' });
    const fields = validCoupon({ ...coupon, ...req.body }); if (fields.error) return res.status(400).json({ message: fields.error });
    if (fields.code !== coupon.code && list.some(item => item.code === fields.code)) return res.status(400).json({ message: `Mã ${fields.code} đã tồn tại.` });
    Object.assign(coupon, fields, { updatedAt: new Date().toISOString() }); saveCoupons(list); res.json(couponView(coupon));
  });
  app.delete('/api/admin/coupons/:id', auth, admin, (req, res) => {
    const list = coupons(); const index = list.findIndex(item => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: 'Không tìm thấy mã giảm giá.' });
    list.splice(index, 1); saveCoupons(list); res.status(204).end();
  });

  // ---- Admin: blog ----
  function validPost(body) {
    const title = String(body.title || '').trim(); const content = String(body.content || '').trim();
    if (!title || title.length > 200) return { error: 'Tiêu đề cần từ 1 đến 200 ký tự.' };
    if (!content || content.length > 50000) return { error: 'Nội dung không được trống (tối đa 50.000 ký tự).' };
    const fields = { title, content, category: String(body.category || 'Kiến thức nghề').trim().slice(0, 60), excerpt: String(body.excerpt || '').trim().slice(0, 300), published: Boolean(body.published) };
    // "cover" is optional: omitted keeps the current image, an empty string removes it.
    if ('cover' in body) {
      const cover = String(body.cover || '').trim();
      if (!validCover(cover)) return { error: 'Ảnh bìa phải là ảnh đã tải lên hoặc một URL https://.' };
      fields.cover = cover || undefined;
    }
    return fields;
  }
  app.post('/api/admin/blog-image', auth, admin, (req, res) => {
    const saved = saveBlogImage(req.body); if (saved.error) return res.status(400).json({ message: saved.error });
    res.status(201).json(saved);
  });
  app.get('/api/admin/blog', auth, admin, (_req, res) => res.json(posts().sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
  app.post('/api/admin/blog', auth, admin, (req, res) => {
    const fields = validPost(req.body); if (fields.error) return res.status(400).json({ message: fields.error });
    const list = posts(); let slug = slugify(req.body.slug || fields.title); while (list.some(item => item.slug === slug)) slug = `${slug}-${Date.now() % 1000}`;
    const now = new Date().toISOString(); const post = { id: `post-${Date.now()}`, slug, ...fields, createdAt: now, updatedAt: now };
    list.push(post); savePosts(list); res.status(201).json(post);
  });
  app.put('/api/admin/blog/:id', auth, admin, (req, res) => {
    const list = posts(); const post = list.find(item => item.id === req.params.id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
    const fields = validPost(req.body); if (fields.error) return res.status(400).json({ message: fields.error });
    Object.assign(post, fields, { updatedAt: new Date().toISOString() }); savePosts(list); res.json(post);
  });
  app.delete('/api/admin/blog/:id', auth, admin, (req, res) => {
    const list = posts(); const index = list.findIndex(item => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
    list.splice(index, 1); savePosts(list); res.status(204).end();
  });

  // ---- Blog cover images ----
  app.get('/api/blog-images/:name', (req, res) => {
    const name = path.basename(req.params.name);
    const file = path.join(blogImagesPath, name);
    if (name.startsWith('.') || !fs.existsSync(file)) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=31536000, immutable').sendFile(file);
  });

  // ---- Content agent (Claude skill) ----
  // Authenticated with CONTENT_AGENT_KEY. It can only upload a cover and create draft posts;
  // an admin reviews and publishes them in the admin page.
  function agentAuth(req, res, next) {
    const key = process.env.CONTENT_AGENT_KEY || '';
    const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const ok = key.length >= 24 && given.length === key.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key));
    if (!ok) return res.status(401).json({ message: 'API key không hợp lệ hoặc máy chủ chưa cấu hình CONTENT_AGENT_KEY.' });
    next();
  }
  app.post('/api/agent/upload', agentAuth, (req, res) => {
    const saved = saveBlogImage(req.body); if (saved.error) return res.status(400).json({ message: saved.error });
    res.status(201).json(saved);
  });
  app.post('/api/agent/blog', agentAuth, (req, res) => {
    const fields = validPost(req.body); if (fields.error) return res.status(400).json({ message: fields.error });
    const list = posts(); const slug = slugify(req.body.slug || fields.title);
    if (list.some(item => item.slug === slug)) return res.status(400).json({ message: `Slug "${slug}" đã tồn tại, hãy chọn slug khác.` });
    const now = new Date().toISOString();
    const post = { id: `post-${Date.now()}`, slug, ...fields, published: false, author: 'Claude (agent)', createdAt: now, updatedAt: now };
    list.push(post); savePosts(list); res.status(201).json(post);
  });
};
