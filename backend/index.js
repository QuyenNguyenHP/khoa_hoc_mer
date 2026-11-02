const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const courseIndex = require('./course-index.json');
const { paths: storage, lessonMediaPath, prepareStorage } = require('./storage');

const app = express();
// `--port 3002` (used by npm run dev) wins over PORT, so a PORT meant for the web server is ignored.
const portArg = process.argv.indexOf('--port');
const port = (portArg > 0 && process.argv[portArg + 1]) || process.env.PORT || 3002;
const secret = process.env.JWT_SECRET || 'change-this-before-production';
// Live data (accounts, orders, blog, uploads, videos) lives in backend/storage, outside Git.
prepareStorage(courseIndex);
const dataPath = storage.data;
const avatarPath = storage.avatars;
const uploadPath = path.join(__dirname, 'uploads'); // temporary video uploads
// Lesson text (lesson.json, quiz, vocabulary) is course content kept in Git.
const lessonsPath = path.join(__dirname, 'lessons');
fs.mkdirSync(uploadPath, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadPath),
    filename: (_req, _file, callback) => callback(null, `.upload-${Date.now()}-${Math.random().toString(16).slice(2)}.mp4`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype === 'video/mp4' || path.extname(file.originalname).toLowerCase() === '.mp4')
});
// Behind Apache -> Nginx -> API: trust proxies on private networks so req.ip is the real
// visitor (used by the order-form rate limit).
app.set('trust proxy', 'loopback, linklocal, uniquelocal');
app.use(cors());
// The content agent sends cover images as base64, so its routes accept bigger bodies.
app.use('/api/agent', express.json({ limit: '8mb' }));
app.use('/api/account/avatar', express.json({ limit: '1mb' }));
app.use('/api/admin/blog-image', express.json({ limit: '8mb' }));
app.use(express.json());

function loadLessons() {
  return courseIndex.lessons.map(({ id, directory }) => {
    const folder = path.join(lessonsPath, directory);
    const lesson = JSON.parse(fs.readFileSync(path.join(folder, 'lesson.json'), 'utf8'));
    return { id, directory, ...lesson, vocabulary: JSON.parse(fs.readFileSync(path.join(folder, 'vocabulary.json'), 'utf8')), quiz: JSON.parse(fs.readFileSync(path.join(folder, 'quiz.json'), 'utf8')), description: lesson.objective };
  });
}
let lessons = loadLessons();
fs.watch(lessonsPath, { recursive: true }, () => {
  try { lessons = loadLessons(); console.log('Lesson content reloaded.'); }
  catch (error) { console.error('Could not reload lesson content:', error.message); }
});

function writeData(data) { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); }
// First start: create only the admin account, from ADMIN_EMAIL / ADMIN_PASSWORD in .env.
// Without ADMIN_PASSWORD a random one is generated and printed once in the log.
function readData() {
  if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const email = String(process.env.ADMIN_EMAIL || 'admin@khoahoc.local').trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  if (!password) { password = crypto.randomBytes(9).toString('base64url'); console.log(`First admin account: ${email} / ${password} (change this password after signing in)`); }
  const initial = { users: [{ id: 'admin-1', name: 'Quản trị viên', email, passwordHash: bcrypt.hashSync(password, 10), role: 'admin', completedLessons: [] }] };
  writeData(initial); console.log(`Storage: created data.json with admin ${email}`); return initial;
}
readData();
function findUser(id) { return readData().users.find(item => item.id === id); }
function studentCourse(student) {
  const completed = student.completedLessons || [];
  const nextLesson = lessons.find(item => !completed.includes(item.id))?.id || lessons.length + 1;
  return { title: courseIndex.course.title, student: { name: student.name, email: student.email, avatar: student.avatar || null }, instructor: { name: 'Cô Mer', bio: 'Giảng viên nghiệp vụ Merchandiser với kinh nghiệm thực chiến trong ngành may.' }, description: courseIndex.course.description, progress: Math.round(completed.length / lessons.length * 100), lessons: lessons.map(item => ({ ...item, completed: completed.includes(item.id), unlocked: item.id <= nextLesson })), liveSessions: [{ id: 1, title: 'Q&A giữa khóa: Gỡ vướng thực hành', date: 'Thứ Bảy, 19:30', status: 'Sắp diễn ra' }, { id: 2, title: 'Q&A cuối khóa: Định hướng cá nhân', date: 'Thứ Bảy, 19:30', status: 'Mở sau buổi 8' }] };
}
function auth(req, res, next) { try { req.auth = jwt.verify(req.headers.authorization?.replace('Bearer ', ''), secret); next(); } catch { res.status(401).json({ message: 'Vui lòng đăng nhập lại.' }); } }
function admin(req, res, next) { return req.auth.role === 'admin' ? next() : res.status(403).json({ message: 'Chỉ quản trị viên có quyền này.' }); }
function studentSummary(student) { const { passwordHash, ...safe } = student; return { ...safe, progress: Math.round((student.completedLessons || []).length / lessons.length * 100) }; }
// Videos and PDFs of a lesson (in storage, seeded once from the repo).
function lessonDirectory(lesson) { return lessonMediaPath(lesson.directory); }
function materialDirectory(lesson) { return path.join(lessonDirectory(lesson), 'materials'); }
function materialsFor(lesson) {
  const directory = materialDirectory(lesson); fs.mkdirSync(directory, { recursive: true });
  return fs.readdirSync(directory).filter(name => name.toLowerCase().endsWith('.pdf') && !name.startsWith('.')).map(name => ({ name, label: name.replace(/\.pdf$/i, '') }));
}

app.post('/api/auth/login', (req, res) => {
  const found = readData().users.find(item => item.email.toLowerCase() === String(req.body.email || '').toLowerCase());
  if (!found || !bcrypt.compareSync(String(req.body.password || ''), found.passwordHash)) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
  res.json({ token: jwt.sign({ id: found.id, role: found.role }, secret, { expiresIn: '8h' }), user: { id: found.id, name: found.name, email: found.email, role: found.role, avatar: found.avatar || null } });
});

// ---- Own account (any signed-in user) ----
app.put('/api/account/password', auth, (req, res) => {
  const data = readData(); const found = data.users.find(item => item.id === req.auth.id);
  if (!found) return res.status(401).json({ message: 'Tài khoản không tồn tại.' });
  const current = String(req.body.currentPassword || ''); const next = String(req.body.newPassword || '');
  if (!bcrypt.compareSync(current, found.passwordHash)) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
  if (next.length < 8 || next.length > 100) return res.status(400).json({ message: 'Mật khẩu mới cần từ 8 đến 100 ký tự.' });
  if (next === current) return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
  found.passwordHash = bcrypt.hashSync(next, 10); writeData(data); res.json({ message: 'Đã đổi mật khẩu.' });
});
app.post('/api/account/avatar', auth, (req, res) => {
  const data = readData(); const found = data.users.find(item => item.id === req.auth.id);
  if (!found) return res.status(401).json({ message: 'Tài khoản không tồn tại.' });
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.dataUrl || ''));
  if (!match) return res.status(400).json({ message: 'Ảnh phải là PNG, JPEG hoặc WEBP.' });
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 512 * 1024) return res.status(400).json({ message: 'Ảnh đại diện phải nhỏ hơn 512 KB.' });
  // Random, unguessable name: <img> tags cannot send the login token.
  const name = `${crypto.randomBytes(16).toString('hex')}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  fs.writeFileSync(path.join(avatarPath, name), bytes);
  const old = found.avatar && path.join(avatarPath, path.basename(found.avatar));
  found.avatar = `/api/avatars/${name}`; writeData(data);
  if (old && fs.existsSync(old)) fs.unlinkSync(old);
  res.json({ avatar: found.avatar });
});
app.get('/api/avatars/:name', (req, res) => {
  const name = path.basename(req.params.name); const file = path.join(avatarPath, name);
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name) || !fs.existsSync(file)) return res.status(404).end();
  res.set('Cache-Control', 'private, max-age=86400').sendFile(file);
});
app.get('/api/course', auth, (req, res) => { const found = findUser(req.auth.id); if (!found) return res.status(401).json({ message: 'Tài khoản không tồn tại.' }); res.json(studentCourse(found)); });
app.post('/api/lessons/:id/playback', auth, (req, res) => {
  const id = Number(req.params.id); const found = findUser(req.auth.id); const lesson = studentCourse(found).lessons.find(item => item.id === id);
  if (!lesson) return res.status(404).json({ message: 'Không tìm thấy bài học.' });
  if (!lesson.unlocked) return res.status(403).json({ message: 'Hãy hoàn thành bài học trước để mở bài này.' });
  const token = jwt.sign({ userId: found.id, lessonId: id, scope: 'video' }, secret, { expiresIn: '20m' }); res.json({ url: `/api/lessons/${id}/video?token=${token}`, expiresIn: 1200 });
});
app.get('/api/lessons/:id', auth, (req, res) => {
  const id = Number(req.params.id); const found = findUser(req.auth.id); const lesson = studentCourse(found).lessons.find(item => item.id === id);
  if (!lesson) return res.status(404).json({ message: 'Không tìm thấy bài học.' });
  if (!lesson.unlocked) return res.status(403).json({ message: 'Hãy hoàn thành bài học trước để mở bài này.' });
  const note = found.notes?.[id] || '';
  const materials = materialsFor(lesson).map(material => ({ ...material, url: `/api/lessons/${id}/materials/${encodeURIComponent(material.name)}?token=${jwt.sign({ userId: found.id, lessonId: id, material: material.name, scope: 'material' }, secret, { expiresIn: '20m' })}` }));
  res.json({ lesson, note, materials });
});
app.put('/api/lessons/:id/note', auth, (req, res) => {
  const id = Number(req.params.id); const data = readData(); const found = data.users.find(item => item.id === req.auth.id); const lesson = studentCourse(found).lessons.find(item => item.id === id);
  if (!lesson?.unlocked) return res.status(403).json({ message: 'Bài học chưa được mở.' });
  if (typeof req.body.note !== 'string' || req.body.note.length > 10000) return res.status(400).json({ message: 'Ghi chú không hợp lệ hoặc quá dài.' });
  found.notes = found.notes || {}; found.notes[id] = req.body.note; writeData(data); res.json({ note: found.notes[id] });
});
app.post('/api/lessons/:id/questions', auth, (req, res) => {
  const id = Number(req.params.id); const data = readData(); const found = data.users.find(item => item.id === req.auth.id); const lesson = studentCourse(found).lessons.find(item => item.id === id); const text = String(req.body.text || '').trim();
  if (!lesson?.unlocked) return res.status(403).json({ message: 'Bài học chưa được mở.' });
  if (!text || text.length > 2000) return res.status(400).json({ message: 'Câu hỏi cần có từ 1 đến 2.000 ký tự.' });
  found.questions = found.questions || []; found.questions.unshift({ id: `question-${Date.now()}`, lessonId: id, text, createdAt: new Date().toISOString() }); writeData(data);
  res.status(201).json({ question: found.questions[0] });
});
app.get('/api/lessons/:id/materials/:filename', (req, res) => {
  try {
    const token = jwt.verify(req.query.token, secret); const id = Number(req.params.id); const lesson = lessons.find(item => item.id === id); const filename = path.basename(req.params.filename);
    if (!lesson || token.scope !== 'material' || token.lessonId !== id || token.material !== filename || !materialsFor(lesson).some(item => item.name === filename)) throw new Error('invalid');
    res.download(path.join(materialDirectory(lesson), filename), filename);
  } catch { res.status(401).json({ message: 'Liên kết tài liệu không hợp lệ hoặc đã hết hạn.' }); }
});
app.get('/api/lessons/:id/video', (req, res) => {
  try {
    const token = jwt.verify(req.query.token, secret); const id = Number(req.params.id); const lesson = lessons.find(item => item.id === id);
    if (!lesson || token.scope !== 'video' || token.lessonId !== id) throw new Error('invalid');
    const file = path.join(lessonDirectory(lesson), lesson.videoFile); if (!fs.existsSync(file)) return res.status(404).json({ message: `Chưa có ${lesson.videoFile} trong ${lesson.directory}/.` });
    const stat = fs.statSync(file); const range = req.headers.range; res.set({ 'Accept-Ranges': 'bytes', 'Content-Type': 'video/mp4', 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store' });
    if (!range) { res.set('Content-Length', stat.size); return fs.createReadStream(file).pipe(res); }
    const [startText, endText] = range.replace(/bytes=/, '').split('-'); const start = Number(startText); const end = endText ? Number(endText) : stat.size - 1;
    res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 }); fs.createReadStream(file, { start, end }).pipe(res);
  } catch { res.status(401).json({ message: 'Liên kết video không hợp lệ hoặc đã hết hạn.' }); }
});
app.post('/api/lessons/:id/complete', auth, (req, res) => {
  const id = Number(req.params.id); const data = readData(); const found = data.users.find(item => item.id === req.auth.id); const lesson = studentCourse(found).lessons.find(item => item.id === id);
  if (!lesson?.unlocked) return res.status(403).json({ message: 'Bài học chưa được mở.' });
  if (!found.completedLessons.includes(id)) found.completedLessons.push(id); writeData(data); res.json(studentCourse(found));
});

app.get('/api/admin/students', auth, admin, (_req, res) => {
  const accounts = readData().users.map(studentSummary);
  res.json({ lessons, students: accounts.filter(item => item.role === 'student'), accounts });
});
app.post('/api/admin/students', auth, admin, (req, res) => {
  const { name, email, password, role = 'student' } = req.body; if (!name || !email || !password) return res.status(400).json({ message: 'Cần tên, email và mật khẩu.' });
  if (!['student', 'admin'].includes(role)) return res.status(400).json({ message: 'Vai trò không hợp lệ.' });
  const data = readData(); if (data.users.some(item => item.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ message: 'Email đã tồn tại.' });
  const created = { id: `${role}-${Date.now()}`, name, email, passwordHash: bcrypt.hashSync(password, 10), role, completedLessons: [] }; data.users.push(created); writeData(data); res.status(201).json(studentSummary(created));
});
app.put('/api/admin/students/:id', auth, admin, (req, res) => {
  const data = readData(); const found = data.users.find(item => item.id === req.params.id && item.role === 'student'); if (!found) return res.status(404).json({ message: 'Không tìm thấy học viên.' });
  const { name, email, password } = req.body; if (name) found.name = name; if (email) found.email = email; if (password) found.passwordHash = bcrypt.hashSync(password, 10); writeData(data); res.json(studentSummary(found));
});
app.put('/api/admin/accounts/:id/role', auth, admin, (req, res) => {
  const { role } = req.body; const data = readData(); const found = data.users.find(item => item.id === req.params.id);
  if (!found) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
  if (!['student', 'admin'].includes(role)) return res.status(400).json({ message: 'Vai trò không hợp lệ.' });
  if (found.role === 'admin' && role === 'student' && data.users.filter(item => item.role === 'admin').length <= 1) return res.status(400).json({ message: 'Không thể hạ quyền quản trị viên cuối cùng.' });
  found.role = role; writeData(data); res.json(studentSummary(found));
});
app.put('/api/admin/students/:id/progress', auth, admin, (req, res) => {
  const data = readData(); const found = data.users.find(item => item.id === req.params.id && item.role === 'student'); const completedLessons = req.body.completedLessons;
  if (!found) return res.status(404).json({ message: 'Không tìm thấy học viên.' });
  if (!Array.isArray(completedLessons) || completedLessons.some(id => !lessons.some(lesson => lesson.id === Number(id)))) return res.status(400).json({ message: 'Danh sách bài học không hợp lệ.' });
  found.completedLessons = [...new Set(completedLessons.map(Number))].sort((a, b) => a - b); writeData(data); res.json(studentSummary(found));
});
app.delete('/api/admin/students/:id', auth, admin, (req, res) => {
  const data = readData(); const index = data.users.findIndex(item => item.id === req.params.id && item.role === 'student'); if (index < 0) return res.status(404).json({ message: 'Không tìm thấy học viên.' }); data.users.splice(index, 1); writeData(data); res.status(204).end();
});
app.get('/api/admin/videos', auth, admin, (_req, res) => res.json(lessons.map(lesson => {
  const file = path.join(lessonDirectory(lesson), lesson.videoFile); const exists = fs.existsSync(file); const stat = exists ? fs.statSync(file) : null;
  return { id: lesson.id, title: lesson.title, filename: lesson.videoFile, uploaded: exists, size: stat?.size || 0, updatedAt: stat?.mtime || null };
})));
app.post('/api/admin/videos/:id', auth, admin, (req, res, next) => {
  if (!lessons.some(lesson => lesson.id === Number(req.params.id))) return res.status(404).json({ message: 'Không tìm thấy buổi học.' });
  upload.single('video')(req, res, error => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ message: 'Hãy chọn một file MP4.' });
    const lesson = lessons.find(item => item.id === Number(req.params.id)); const target = path.join(lessonDirectory(lesson), lesson.videoFile);
    // In Docker, uploads/ and lessons/ can be on different disks, where rename fails with EXDEV.
    try { fs.renameSync(req.file.path, target); }
    catch (error) { if (error.code !== 'EXDEV') throw error; fs.copyFileSync(req.file.path, target); fs.unlinkSync(req.file.path); }
    const stat = fs.statSync(target);
    res.status(201).json({ id: lesson.id, title: lesson.title, filename: lesson.videoFile, uploaded: true, size: stat.size, updatedAt: stat.mtime });
  });
});
app.delete('/api/admin/videos/:id', auth, admin, (req, res) => {
  const lesson = lessons.find(item => item.id === Number(req.params.id)); if (!lesson) return res.status(404).json({ message: 'Không tìm thấy buổi học.' });
  const file = path.join(lessonDirectory(lesson), lesson.videoFile); if (fs.existsSync(file)) fs.unlinkSync(file); res.status(204).end();
});
require('./site')(app, { auth, admin, readData, writeData, getLessons: () => lessons, courseIndex });

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Video vượt giới hạn 2 GB.' });
  if (error) return res.status(400).json({ message: 'Chỉ nhận file video MP4.' });
});
app.listen(port, () => console.log(`API running at http://localhost:${port}`));
