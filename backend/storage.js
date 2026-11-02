// Where the site's live data lives. Everything here is created at runtime and is NOT in Git,
// so `git pull` can never overwrite students, orders, blog posts or uploaded files.
//
//   backend/storage/                  (one Docker volume; override with STORAGE_DIR)
//     data.json                       accounts, progress, notes, questions
//     orders.json                     registration orders (personal data)
//     blog.json                       blog posts
//     site-config.json                price, bank, Zalo, instructor
//     avatars/  blog-images/          uploaded pictures
//     lessons/lesson-XX/video.mp4     lesson videos
//     lessons/lesson-XX/materials/    lesson PDFs
//
// On first start, blog.json and site-config.json are copied from backend/seed/, and each
// lesson's video/PDFs are copied once from backend/lessons/ (the course content in Git).
const fs = require('fs');
const path = require('path');

const root = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.join(__dirname, 'storage');
const seedPath = path.join(__dirname, 'seed');
const repoLessonsPath = path.join(__dirname, 'lessons');

const paths = {
  root,
  data: path.join(root, 'data.json'),
  orders: path.join(root, 'orders.json'),
  blog: path.join(root, 'blog.json'),
  siteConfig: path.join(root, 'site-config.json'),
  avatars: path.join(root, 'avatars'),
  blogImages: path.join(root, 'blog-images'),
  lessons: path.join(root, 'lessons')
};

function copyIfMissing(from, to) {
  if (!fs.existsSync(to) && fs.existsSync(from)) { fs.copyFileSync(from, to); console.log(`Storage: created ${path.relative(root, to)} from ${path.relative(__dirname, from)}`); }
}

// Media folder of one lesson inside storage; seeded once from the repo copy.
function lessonMediaPath(directory) { return path.join(paths.lessons, directory); }

function prepareStorage(courseIndex) {
  for (const dir of [root, paths.avatars, paths.blogImages, paths.lessons]) fs.mkdirSync(dir, { recursive: true });
  copyIfMissing(path.join(seedPath, 'blog.json'), paths.blog);
  copyIfMissing(path.join(seedPath, 'site-config.json'), paths.siteConfig);
  for (const { directory } of courseIndex.lessons) {
    const target = lessonMediaPath(directory);
    if (fs.existsSync(target)) continue; // already seeded: later uploads/deletes are kept
    fs.mkdirSync(path.join(target, 'materials'), { recursive: true });
    const source = path.join(repoLessonsPath, directory);
    let video = 'video.mp4';
    try { video = JSON.parse(fs.readFileSync(path.join(source, 'lesson.json'), 'utf8')).videoFile || video; } catch { /* keep default */ }
    copyIfMissing(path.join(source, video), path.join(target, video));
    const materials = path.join(source, 'materials');
    if (fs.existsSync(materials)) for (const name of fs.readdirSync(materials)) {
      if (!name.startsWith('.')) copyIfMissing(path.join(materials, name), path.join(target, 'materials', name));
    }
  }
}

module.exports = { paths, lessonMediaPath, prepareStorage };
