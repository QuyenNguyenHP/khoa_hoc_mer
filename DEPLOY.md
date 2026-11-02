# Hướng dẫn chạy thử và triển khai

## Dữ liệu nằm ở đâu

Code và dữ liệu được tách riêng, để cập nhật code từ GitHub không bao giờ ghi đè học viên, đơn hàng hay bài blog.

| Loại | Gồm | Nằm ở | Lên GitHub? |
|---|---|---|---|
| Code | backend, frontend, cấu hình Docker | `backend/`, `frontend/`, `deploy/` | Có |
| Nội dung khóa học | 10 buổi: `lesson.json`, quiz, từ vựng, danh sách buổi | `backend/lessons/`, `backend/course-index.json` | Có |
| Dữ liệu khởi tạo | 3 bài blog ban đầu, cấu hình site mẫu, video/PDF có sẵn | `backend/seed/`, `backend/lessons/` | Có (chỉ dùng lần chạy đầu) |
| **Dữ liệu chạy thật** | tài khoản, tiến độ, ghi chú, câu hỏi, đơn hàng, bài blog, cấu hình site (học phí, ngân hàng, Zalo), ảnh, video, PDF | `backend/storage/` | **Không** |
| Khóa bí mật | `JWT_SECRET`, mật khẩu admin đầu tiên, khóa skill blog | `.env` | **Không** |

- Lần chạy đầu, backend tự tạo `backend/storage/`: chép blog và cấu hình từ `backend/seed/`, chép video/PDF có sẵn từ `backend/lessons/`, và tạo **một** tài khoản admin từ `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env`.
- Sau đó mọi thay đổi (học viên mới, bài blog mới, video tải lên, đổi học phí…) chỉ nằm trong `backend/storage/`.
- Sửa nội dung bài học (`lesson.json`, quiz, từ vựng) thì sửa trong repo rồi commit như code.
- Sao lưu = sao lưu thư mục `backend/storage/` và file `.env`.

Chi tiết từng file trong `storage`: xem đầu file [backend/storage.js](backend/storage.js).

---

## 1. Chạy thử trên máy

Cần Node.js 22 trở lên. Lần đầu:

```bash
npm install
```

Mỗi lần chạy (backend cổng 3002 và giao diện cổng 5173, tự cập nhật khi sửa code, kể cả trong WSL):

```bash
npm run dev
```

Mở `http://localhost:5173`. Lần đầu chạy trên một máy mới, mật khẩu admin được in ra trong cửa sổ terminal (hoặc đặt trước `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong file `.env`).

Build giao diện thành file tĩnh:

```bash
npm run build
```

---

## 2. Server (Docker): cài lần đầu và cập nhật

Trên server: Docker chạy 2 container, Apache trỏ tên miền vào `127.0.0.1:18090`.

| Container | Cổng |
|---|---|
| `frontend` (nginx, giao diện) | `127.0.0.1:18090 → 80` |
| `api` (Node) | `3002`, chỉ trong mạng Docker |

### Lần đầu chuyển sang cách lưu dữ liệu mới

Trên server hiện chưa có dữ liệu thật, nên chỉ cần bỏ các thay đổi cũ và lấy code mới (vào thư mục dự án trước):

```bash
git checkout -- . && git pull
```

```bash
sh deploy.sh
```

`deploy.sh` sẽ tạo `.env` (khóa bí mật + mật khẩu admin ngẫu nhiên), build và chạy Docker, rồi **in ra email và mật khẩu admin**. Ghi lại, đăng nhập ở `https://comernganhmay.online/#quan-tri`, rồi bấm avatar → **Đổi mật khẩu**.

### Mỗi lần cập nhật sau này

```bash
sh deploy.sh
```

Script tự `git pull`, build lại và khởi động lại. Không đụng tới `backend/storage/` và `.env`.

### Lệnh hay dùng

Xem log backend:

```bash
docker compose logs -f api
```

Khởi động lại:

```bash
docker compose restart
```

Sao lưu dữ liệu (nên chạy định kỳ):

```bash
tar czf ~/backup-khoahoc-$(date +%F).tgz backend/storage .env
```

### Cấu hình Apache (chỉ làm một lần, nếu chưa có)

```bash
sudo cp deploy/apache2/comernganhmay.online-docker.conf /etc/apache2/sites-available/comernganhmay.online.conf
```

```bash
sudo a2enmod proxy proxy_http ssl headers && sudo a2ensite comernganhmay.online.conf && sudo systemctl reload apache2
```

---

## 3. Skill đăng blog (Claude)

Skill `comer-blog-agent` gửi bài **nháp** kèm ảnh bìa và ảnh minh họa qua API `/api/agent`.

- Trên server: điền `CONTENT_AGENT_KEY=` trong `.env` bằng đúng giá trị `CONTENT_AGENT_KEY` trong file `.env` trên máy tính, rồi chạy `sh deploy.sh`.
- Trên máy tính: biến môi trường `COMER_CONTENT_API_KEY` phải có cùng giá trị (đã đặt sẵn).
- Đăng bài: `https://comernganhmay.online/#quan-tri` → tab **Blog** → mở bài "Nháp" → tick **Đăng công khai trên blog** → Lưu.
- Gửi về backend trên máy thay vì server: đặt `COMER_API_BASE=http://localhost:3002/api/agent` trước khi chạy script của skill.

---

## 4. Sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `git pull` báo "local changes would be overwritten" ở `data.json`/`blog.json` | Server còn bố cục cũ. Chạy `sh deploy.sh`: script tự sao lưu các file đó vào `backup-old-layout-…/` rồi mới cập nhật. |
| `docker compose` báo `Set JWT_SECRET in .env` | Chưa có `.env`: chạy `sh deploy.sh`. |
| Quên mật khẩu admin đầu tiên | Xem `ADMIN_PASSWORD` trong `.env` (chỉ đúng nếu chưa đổi trong trang web). |
| Đăng nhập xong bị đẩy ra | `JWT_SECRET` vừa đổi: đăng nhập lại. |
| Skill báo `HTTP 401` | `CONTENT_AGENT_KEY` trên server khác khóa trên máy, hoặc chưa chạy lại `sh deploy.sh` sau khi sửa `.env`. |
| `npm run dev` báo `Cannot find module @rollup/...` hoặc `@esbuild/...` | `node_modules` đang là bản của hệ điều hành khác (Windows/WSL dùng chung thư mục). Chạy `npm install` ở bên đang lỗi. |
| Sửa code mà trang/API không đổi | Tắt `npm run dev` (`Ctrl + C`) rồi chạy lại. |
