# Hướng dẫn chạy thử và triển khai

Trang gồm 2 phần:

| Phần | Thư mục | Công nghệ | Chạy bằng |
|---|---|---|---|
| Backend (API) | `backend/` | Node.js + Express, dữ liệu lưu file JSON | `node backend/index.js` (cổng 3002) |
| Frontend (giao diện) | `frontend/` | React + Vite | `npm run dev` (cổng 5173) hoặc `npm run build` |

Dữ liệu nằm trong các file, không cần cơ sở dữ liệu:

| File / thư mục | Chứa gì | Có trên GitHub? |
|---|---|---|
| `backend/data.json` | Tài khoản, tiến độ, ghi chú học viên | Có |
| `backend/blog.json` | Bài blog (cả bản nháp) | Có |
| `backend/site-config.json` | Học phí, ngân hàng, Zalo, giảng viên | Có |
| `backend/lessons/lesson-XX/` | Nội dung 10 buổi, `video.mp4`, `materials/*.pdf` | Có (trừ video lớn) |
| `backend/private/orders.json` | Đơn đăng ký (họ tên, email, SĐT) | **Không** |
| `backend/blog-images/` | Ảnh bìa blog do skill tải lên | **Không** |
| `.env` | Khóa bí mật | **Không** |

---

## 1. Chạy thử trên máy

### Lần đầu

1. Cài [Node.js](https://nodejs.org) bản 22 trở lên.
2. Mở terminal tại thư mục dự án và cài thư viện:

   ```bash
   npm install
   ```

3. (Tùy chọn) Tạo file `.env` ở thư mục gốc nếu muốn thử skill đăng blog:

   ```bash
   CONTENT_AGENT_KEY=<chuỗi ngẫu nhiên dài ít nhất 24 ký tự>
   ```

   Máy hiện tại đã có sẵn file này.

### Mỗi lần chạy

```bash
npm run dev
```

- Lệnh này chạy cùng lúc backend (cổng 3002, tự khởi động lại khi sửa code) và frontend (cổng 5173).
- Mở `http://localhost:5173`.
- Các trang chính:
  - `#gioi-thieu`: trang giới thiệu
  - `#blog`: blog
  - `#dang-nhap`: đăng nhập
  - sau khi đăng nhập bằng tài khoản admin: trang quản trị
- Dừng: bấm `Ctrl + C`.

Chạy riêng từng phần (giống kiểu `python3 app.py`):

```bash
node --env-file-if-exists=.env backend/index.js --port 3002
```

```bash
npm run dev:web
```

Build giao diện thành file tĩnh (ra thư mục `frontend/dist/`):

```bash
npm run build
```

---

## 2. Triển khai lên server bằng Docker (khuyên dùng)

Server: Ubuntu có Apache (giữ cổng 80/443 và HTTPS), Docker và Docker Compose.

Sơ đồ: `Người dùng → Apache (HTTPS) → 127.0.0.1:18090 → container nginx (giao diện) → container api (Node, cổng 3002)`.

### 2.1. Lần đầu

1. Lấy code về server:

   ```bash
   git clone https://github.com/QuyenNguyenHP/khoa_hoc_mer.git
   ```

   ```bash
   cd khoa_hoc_mer
   ```

2. Tạo file `.env` cạnh `docker-compose.yml`:

   ```bash
   nano .env
   ```

   Nội dung:

   ```bash
   # Khóa ký phiên đăng nhập. Tạo bằng: openssl rand -hex 32
   JWT_SECRET=<chuỗi ngẫu nhiên>
   # Khóa cho skill đăng blog: copy đúng giá trị CONTENT_AGENT_KEY trong file .env trên máy tính
   CONTENT_AGENT_KEY=<khóa giống trên máy tính>
   ```

   Khóa server với quyền chỉ chủ sở hữu đọc được:

   ```bash
   chmod 600 .env
   ```

   - Thiếu `JWT_SECRET` thì Docker sẽ báo lỗi và không chạy. Như vậy server không bao giờ chạy với khóa mặc định.
   - Đổi `JWT_SECRET` thì mọi người phải đăng nhập lại một lần. Dữ liệu không mất.

3. Tạo các thư mục dữ liệu không có trên GitHub (nếu thiếu, Docker sẽ tự tạo nhầm thành thư mục của root):

   ```bash
   mkdir -p backend/private backend/blog-images
   ```

   `backend/data.json`, `backend/blog.json` và `backend/site-config.json` phải là **file có sẵn** trước khi chạy (đã có khi clone).

4. Điền thông tin ngân hàng, Zalo, giảng viên trong `backend/site-config.json` (xem README).

5. Chạy:

   ```bash
   docker compose up -d --build
   ```

   ```bash
   docker compose ps
   ```

   ```bash
   curl -I http://127.0.0.1:18090
   ```

6. Cấu hình Apache trỏ tên miền vào Docker (chỉ làm một lần):

   ```bash
   sudo cp deploy/apache2/comernganhmay.online-docker.conf /etc/apache2/sites-available/comernganhmay.online.conf
   ```

   ```bash
   sudo a2enmod proxy proxy_http ssl headers
   ```

   ```bash
   sudo a2ensite comernganhmay.online.conf
   ```

   ```bash
   sudo apache2ctl configtest && sudo systemctl reload apache2
   ```

   Chưa có chứng chỉ HTTPS thì tạo bằng Certbot:

   ```bash
   sudo certbot --apache -d comernganhmay.online -d www.comernganhmay.online
   ```

7. Mở `https://comernganhmay.online`, đăng nhập admin, **đổi mật khẩu tài khoản admin mặc định** nếu còn dùng.

### 2.2. Cập nhật khi có code mới

```bash
cd khoa_hoc_mer
```

```bash
git pull
```

```bash
docker compose up -d --build
```

Dữ liệu (`data.json`, `blog.json`, đơn hàng, ảnh, video) nằm ngoài container nên không mất khi build lại.

> Lưu ý: `data.json` và `blog.json` có trên GitHub. Nếu trên server đã có học viên/bài viết mới mà `git pull` báo xung đột ở 2 file này, **giữ bản trên server**. Không commit dữ liệu thật của server lên GitHub.

### 2.3. Xem log, khởi động lại, sao lưu

```bash
docker compose logs -f api
```

```bash
docker compose restart api
```

Sao lưu toàn bộ dữ liệu (nên chạy định kỳ):

```bash
tar czf ~/backup-khoahoc-$(date +%F).tgz backend/data.json backend/blog.json backend/site-config.json backend/private backend/blog-images .env
```

---

## 3. Triển khai không dùng Docker (Apache + Node trực tiếp)

Dùng khi server không có Docker.

1. Cài Node.js 22, lấy code như mục 2.1, tạo `.env` và các thư mục như trên.
2. Cài thư viện và build giao diện:

   ```bash
   npm ci
   ```

   ```bash
   npm run build
   ```

   ```bash
   sudo mkdir -p /var/www/comernganhmay.online && sudo cp -r frontend/dist/* /var/www/comernganhmay.online/
   ```

3. Chạy backend như một dịch vụ, tự bật lại khi server khởi động. Tạo `/etc/systemd/system/khoahoc-api.service`:

   ```ini
   [Unit]
   Description=Khoa hoc Merchandising API
   After=network.target

   [Service]
   WorkingDirectory=/home/<user>/khoa_hoc_mer
   ExecStart=/usr/bin/node --env-file=.env backend/index.js --port 3002
   Restart=always
   User=<user>

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload && sudo systemctl enable --now khoahoc-api
   ```

4. Dùng `deploy/apache2/comernganhmay.online.conf`: Apache phục vụ giao diện từ `/var/www/...` và chuyển `/api` về cổng 3002.
5. Cập nhật: `git pull`, `npm ci`, `npm run build`, copy lại `dist`, rồi chạy:

   ```bash
   sudo systemctl restart khoahoc-api
   ```

---

## 4. Skill đăng blog (Claude)

Skill `comer-blog-agent` (ở `C:\Users\duyqu\.claude\skills\comer-blog-agent\`) viết bài và gửi lên blog dưới dạng **bản nháp** kèm ảnh bìa.

- Khóa phải giống nhau ở 2 nơi:
  - máy tính: biến môi trường người dùng `COMER_CONTENT_API_KEY` (đã đặt) và file `.env` (`CONTENT_AGENT_KEY`)
  - server: file `.env` (`CONTENT_AGENT_KEY`)
- Cách dùng: nói với Claude, ví dụ *"Viết bài blog về quy trình duyệt mẫu"*. Claude hỏi thông tin còn thiếu, cho xem trước, bạn đồng ý thì mới gửi.
- Đăng bài: vào `https://comernganhmay.online/#quan-tri` → tab **Blog** → mở bài "Nháp" → tick **Đăng công khai trên blog** → Lưu.
- Thử trên máy trước khi đưa lên server: cho script gửi về backend chạy ở máy:

  ```bash
  COMER_API_BASE=http://localhost:3002/api/agent python <thư mục skill>/scripts/comer_blog.py blog bai.json --cover anh.jpg
  ```

- Đổi khóa: tạo khóa mới, sửa cả 3 chỗ trên, rồi khởi động lại backend (`docker compose up -d` hoặc `systemctl restart`).

---

## 5. Sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `npm run dev` báo `Cannot find module @rollup/rollup-win32-...` | `node_modules` đang chứa bản cho máy khác (Linux). Chạy `npm install` rồi chạy lại. |
| Sửa code mà trang/API không đổi, hoặc báo "Máy chủ chưa có chức năng này" | Backend hoặc Vite đang chạy bản cũ. Tắt `npm run dev` (`Ctrl + C`) rồi chạy lại. Khi chạy trong WSL trên thư mục `/mnt/c/...`, cả hai đã được cấu hình tự kiểm tra file định kỳ. |
| Chạy cả trên Windows lẫn trong WSL | Hai bên dùng chung `node_modules`. Chỉ chạy `npm install` ở một bên; nếu bên kia báo thiếu module `@rollup/...` hoặc `@esbuild/...` thì chạy `npm install` lại ở bên đó. |
| `Port 3002/5173 is already in use` | Đã có một bản đang chạy. Tắt cửa sổ terminal cũ, hoặc khởi động lại máy. |
| Skill báo `HTTP 401` | Khóa trên máy và server không giống nhau, hoặc server chưa có `CONTENT_AGENT_KEY` trong `.env` (sửa xong phải chạy lại `docker compose up -d`). |
| Skill báo `HTTP 413` | Ảnh bìa quá lớn; nén ảnh dưới 5 MB. |
| `docker compose up` báo `Set JWT_SECRET in .env` | Thiếu `JWT_SECRET` trong `.env` (mục 2.1, bước 2). |
| Đăng nhập xong bị đẩy ra liên tục | `JWT_SECRET` vừa đổi: đăng nhập lại. |
| Ảnh bìa blog không hiện trên server | Thiếu thư mục `backend/blog-images` hoặc sai quyền: `mkdir -p backend/blog-images` rồi `docker compose up -d`. |
