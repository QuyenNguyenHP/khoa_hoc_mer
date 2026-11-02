# CLAUDE.md: bối cảnh dự án cho AI

Trang bán và học khóa **Merchandising ngành may** (10 buổi) tại `https://comernganhmay.online`.
Chủ dự án nói tiếng Việt, không chuyên kỹ thuật: trả lời bằng tiếng Việt, câu ngắn, ít thuật ngữ.

## Kiến trúc

- **Backend:** Node.js + Express, không có cơ sở dữ liệu, lưu file JSON. Điểm vào `backend/index.js` (đăng nhập JWT, bài học, video, tài khoản), `backend/site.js` (trang bán, đơn hàng VietQR, mã giảm giá, blog, API cho agent), `backend/storage.js` (đường dẫn dữ liệu).
  - Chủ dự án thường dùng backend Python (`python3 app.py`) cho dự án khác, nhưng **dự án này giữ Node** (đã quyết định 02/11/2026, không viết lại).
- **Frontend:** React 18 + Vite 6, điều hướng bằng hash trong `frontend/src/main.jsx`:
  - `#`/`#gioi-thieu` trang bán (`LandingPage`), `#blog`, `#blog/<slug>` (`BlogPage`), `#dang-nhap`, `#lop-hoc` (`MainPage`), `#lesson-<n>` (`LearningPage` → `FocusLesson`), `#quan-tri` (`AdminPage` với các tab trong `pages/admin/`: Đơn đăng ký, Mã giảm giá, Blog).
  - Gọi API qua `frontend/src/api.js` (token trong localStorage `course-token`, user trong `course-user`).
- **CSS:** các file CSS được nhúng dạng chuỗi `?raw` trong `components/AppStyles.jsx` theo thứ tự: styles, learning, video, admin, theme, lesson, lesson-layout, **site** (trang công khai + biến màu), **learn** (trang học + admin). Sửa giao diện chủ yếu ở `site.css` và `learn.css`.
  - `theme.css` ép font Roboto bằng `!important`, nên các override dùng `!important` và tiền tố gốc (`.site`, `.class-page`, `.focus-page`, `.admin-page`).
  - Một số component có `<style>` riêng (`FOCUS_LESSON_STYLES`, `ADMIN_PAGE_STYLES`) nạp sau AppStyles.
  - Theme: nền giấy kem, chữ/nút navy, điểm nhấn vàng đồng. Biến màu ở `:root` đầu `site.css`. Font Fraunces / Be Vietnam Pro / JetBrains Mono nạp ở `frontend/index.html`.
- **Blog:** nội dung là Markdown rút gọn do `components/RichText.jsx` vẽ: `##`, `###`, `- `, `1. `, `> `, `**đậm**`, dòng riêng `![chú thích](url)` là ảnh (chỉ ảnh `/api/blog-images/...` hoặc `https://`).

## Dữ liệu (quan trọng)

Dữ liệu thật **không nằm trong Git**, tất cả ở `backend/storage/` (một Docker volume):
`data.json` (tài khoản, tiến độ), `orders.json`, `coupons.json`, `blog.json`, `site-config.json` (học phí, ngân hàng, Zalo, giảng viên), `avatars/`, `blog-images/`, `lessons/lesson-XX/video.mp4` + `materials/*.pdf`.

- Lần chạy đầu: chép `backend/seed/*.json` và video/PDF có sẵn trong `backend/lessons/` vào storage; tạo **một** admin từ `ADMIN_EMAIL`/`ADMIN_PASSWORD` trong `.env` (không có thì mật khẩu ngẫu nhiên in ra log).
- Nội dung bài học (`backend/lessons/*/lesson.json`, `quiz.json`, `vocabulary.json`, `backend/course-index.json`) nằm trong Git như code.
- Sửa `backend/seed/site-config.json` **không** đổi server đang chạy: trên server phải `cp backend/seed/site-config.json backend/storage/site-config.json` (hoặc sửa thẳng file trong storage; có hiệu lực ngay, không cần restart).
- Thanh toán: VietinBank (mã VietQR `ICB`), STK 104002173651, NGUYEN DUY QUYEN. Mã QR (img.vietqr.io) **không** điền sẵn số tiền, chỉ điền nội dung `MERxxxxxx` hoặc `MERxxxxxx MÃGIẢM`. Lượt dùng mã giảm giá đếm theo đơn đã thanh toán. Sau khi thanh toán, tài khoản gửi cho học viên qua Zalo/điện thoại.

## Chạy và kiểm tra trên máy

- `npm run dev`: backend cổng 3002 qua `backend/dev.js` (tự restart khi đổi `backend/*.js`, đọc `.env`) + Vite cổng 5173 (proxy `/api`).
- Chủ dự án thường chạy `npm run dev` **trong WSL** trên chính thư mục này (cổng 5173 do `wslrelay` giữ). Vite và dev.js đã dùng polling nên nhận được file sửa từ Windows.
- `node_modules` **đang bị theo dõi trong Git** và dùng chung giữa Windows và WSL: không commit `node_modules`; không `npm install` bừa (sẽ thay binary Linux/Windows của bên kia). Nếu thiếu `@rollup/rollup-win32-arm64-msvc` hoặc `@esbuild/win32-arm64` trên Windows, chép thêm gói đó cạnh gói Linux (`npm pack` rồi giải nén vào `node_modules/@rollup|@esbuild/`).
- Node trên Windows ở `C:\Program Files\nodejs` (Git Bash không có trong PATH: dùng PowerShell với `$env:Path += ";C:\Program Files\nodejs"`). Python 3.11 có Pillow.
- Cách test an toàn đã dùng:
  - Backend riêng: `STORAGE_DIR=<thư mục tạm>` + `ADMIN_EMAIL`/`ADMIN_PASSWORD`, chạy `node backend/index.js --port 30xx`, gọi API bằng PowerShell, xong tắt process.
  - Token tạm: ký JWT bằng secret mặc định `change-this-before-production` (chỉ dùng trên máy).
  - Build kiểm tra: `npx vite build --config frontend/vite.config.js --outDir <thư mục tạm> --emptyOutDir` (không ghi đè `dist/`).
  - Luôn sao lưu rồi khôi phục file trong `backend/storage/` nếu test ghi vào đó.
- `dist/` và `frontend/dist/` là bản build cũ còn trong Git, không sửa tay.
- `lesson.css`, `lesson-layout.css` (trang `.lesson-page` cũ) gần như không dùng.

## Triển khai server

- Server Ubuntu, Docker: `frontend` (nginx) `127.0.0.1:18090 → 80`, `api` (Node) cổng 3002 trong mạng Docker. Apache giữ 80/443 và proxy tên miền vào 18090 (`deploy/apache2/comernganhmay.online-docker.conf`).
- Cài/cập nhật: `sh deploy.sh` (sao lưu file bố cục cũ, `git pull --ff-only`, tạo `.env` lần đầu với `JWT_SECRET` + mật khẩu admin ngẫu nhiên, `docker compose up -d --build`).
- Hướng dẫn đầy đủ cho người: `DEPLOY.md`. Mô tả tính năng: `README.md`.

## Skill đăng blog `comer-blog-agent`

- Cài ở `~/.claude/skills/comer-blog-agent/`; bản sao trong repo: `tools/comer-blog-agent/` (chép lại vào `~/.claude/skills/` nếu đổi máy).
- Gửi bài **nháp** qua `POST /api/agent/upload` và `/api/agent/blog`, khóa `CONTENT_AGENT_KEY` (server `.env`) = `COMER_CONTENT_API_KEY` (biến môi trường người dùng trên máy) = `CONTENT_AGENT_KEY` trong `.env` ở thư mục dự án. Không bao giờ in hoặc commit khóa.
- Mặc định gửi lên server thật; gửi về máy thì đặt `COMER_API_BASE=http://localhost:3002/api/agent`.
- Hỗ trợ ảnh bìa (`--cover`) và 0–2 ảnh minh họa (`--image`, chỗ đặt `![Chú thích](image:N)`).

## Cách làm việc với chủ dự án

- Khi được bảo "commit và push": commit thẳng lên `main` rồi push `origin main` (repo `QuyenNguyenHP/khoa_hoc_mer`). Chỉ add file liên quan, **không** add `node_modules`, `backend/storage`, `.env`. Commit message tiếng Việt, kết thúc bằng dòng `Co-Authored-By` theo hướng dẫn của phiên làm việc.
- Trước khi commit thường hỏi lại; sau khi sửa luôn chạy thử API/build và báo rõ phần nào chưa xem được trên màn hình.
- Khi chủ dự án tự xem giao diện (họ thường muốn tự xem), nhắc họ chạy lại `npm run dev` trong WSL nếu cần.

## Việc còn dang dở (cập nhật 02/11/2026)

- Server trả 401 với khóa skill: cần điền `CONTENT_AGENT_KEY` trong `.env` trên server rồi `sh deploy.sh`.
- Số Zalo (`zaloPhone`) và phần giới thiệu giảng viên trong `site-config.json` chưa điền.
- Sau lần deploy đầu với `deploy.sh`: đăng nhập admin bằng mật khẩu in ra, rồi đổi mật khẩu (menu avatar → Đổi mật khẩu).
- Chưa build thử Docker trên máy (Docker Desktop tắt) và chưa chạy `deploy.sh` trọn vẹn trên server.
- 2 bài blog trên máy ("10 thuật ngữ…", "Quản lý tiến độ và nguyên phụ liệu") chỉ có trong `backend/storage` của máy; muốn đưa lên trang thật thì gửi lại bằng skill.
- Chưa có tab "Cài đặt" trong admin để sửa học phí/ngân hàng/Zalo trên web (đang sửa file).
