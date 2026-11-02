// Public sales page, registration orders (bank transfer via VietQR) and blog.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const configPath = path.join(__dirname, 'site-config.json');
const blogPath = path.join(__dirname, 'blog.json');
// Blog cover images uploaded by the content agent (git-ignored, mounted as a Docker volume).
const blogImagesPath = path.join(__dirname, 'blog-images');
fs.mkdirSync(blogImagesPath, { recursive: true });
const IMAGE_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Orders hold customers' names, emails and phone numbers: backend/private/ is git-ignored.
const privatePath = path.join(__dirname, 'private');
const ordersPath = path.join(privatePath, 'orders.json');
fs.mkdirSync(privatePath, { recursive: true });

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

function qrUrl(bank, amount, note) {
  const params = new URLSearchParams({ amount: String(amount), addInfo: note });
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

// Very small in-memory limit so the public order form cannot be flooded.
const recentOrders = new Map();
function tooManyOrders(ip) {
  const now = Date.now(); const windowMs = 10 * 60 * 1000;
  const list = (recentOrders.get(ip) || []).filter(time => now - time < windowMs);
  if (list.length >= 5) { recentOrders.set(ip, list); return true; }
  list.push(now); recentOrders.set(ip, list); return false;
}

module.exports = function registerSiteRoutes(app, { auth, admin, readData, writeData, getLessons, courseIndex }) {
  const posts = () => readJson(blogPath, { posts: [] }).posts;
  const savePosts = list => writeJson(blogPath, { posts: list });
  const orders = () => readJson(ordersPath, { orders: [] }).orders;
  const saveOrders = list => writeJson(ordersPath, { orders: list });

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

  app.post('/api/orders', (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').replace(/[^\d+]/g, '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Vui lòng nhập họ tên (2–100 ký tự).' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) return res.status(400).json({ message: 'Email chưa đúng định dạng.' });
    if (!/^\+?\d{9,12}$/.test(phone)) return res.status(400).json({ message: 'Số điện thoại chưa đúng (9–12 chữ số).' });
    if (tooManyOrders(req.ip)) return res.status(429).json({ message: 'Bạn đã gửi nhiều đăng ký liên tiếp. Vui lòng thử lại sau ít phút hoặc nhắn Zalo cho chúng tôi.' });

    const config = siteConfig(); const list = orders();
    // Reuse an unpaid order for the same email so the customer keeps one transfer code.
    let order = list.find(item => item.email === email && item.status === 'pending');
    if (order) { order.name = name; order.phone = phone; order.updatedAt = new Date().toISOString(); }
    else {
      let code; do { code = orderCode(); } while (list.some(item => item.code === code));
      order = { id: `order-${Date.now()}`, code, name, email, phone, amount: config.price, status: 'pending', createdAt: new Date().toISOString() };
      list.unshift(order);
    }
    saveOrders(list);
    res.status(201).json({
      code: order.code, amount: order.amount, transferNote: order.code,
      bank: bankReady(config.bank) ? config.bank : null,
      qrUrl: bankReady(config.bank) ? qrUrl(config.bank, order.amount, order.code) : null,
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
