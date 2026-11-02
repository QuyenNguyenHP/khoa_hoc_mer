# Nền tảng khóa học online

## Chạy dự án

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`. Hướng dẫn đầy đủ để chạy thử trên máy, triển khai lên server (Docker hoặc Apache + Node) và cài skill đăng blog: xem [DEPLOY.md](DEPLOY.md).

## Trang giới thiệu, đăng ký và blog

- `#` hoặc `#gioi-thieu`: trang giới thiệu bán khóa học (học phí, nội dung 10 buổi lấy từ `backend/lessons/`, giảng viên, hỏi đáp).
- `#blog`, `#blog/<slug>`: blog công khai. `#dang-nhap`: đăng nhập học viên.
- Cấu hình trong `backend/storage/site-config.json`, tạo từ `backend/seed/site-config.json` ở lần chạy đầu (hoặc biến môi trường `COURSE_PRICE`, `BANK_ID`, `BANK_NAME`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`, `ZALO_PHONE`):
  - `bank.bankId`: mã ngân hàng theo VietQR (ví dụ `VCB`, `MB`, `TCB`, `ACB`), `bank.accountNo`, `bank.accountName` (viết hoa, không dấu). Khi chưa điền, form đăng ký chỉ hiện mã đăng ký và nhờ khách nhắn Zalo.
  - `zaloPhone`: số Zalo, hiện nút chat Zalo nổi ở góc màn hình.
  - `instructor`: tên, chức danh, giới thiệu giảng viên.
- Quy trình mua: khách bấm **Đăng ký học** → điền họ tên, email, SĐT → nhận mã QR (ảnh tạo bởi img.vietqr.io) với nội dung chuyển khoản riêng dạng `MERxxxxxx`.
- Quản trị → tab **Đơn đăng ký**: đối chiếu sao kê theo mã, bấm **Đã nhận tiền** để tạo tài khoản học viên. Mật khẩu ngẫu nhiên chỉ hiện một lần kèm nội dung soạn sẵn để gửi qua email/Zalo.
- Đơn đăng ký lưu ở `backend/storage/orders.json` (có thông tin cá nhân, không lên GitHub).
- Quản trị → tab **Blog**: viết, sửa, đăng/ẩn bài. Bài lưu ở `backend/storage/blog.json`. Cách viết: dòng trống giữa các đoạn, `## ` tiêu đề mục, `### ` tiêu đề nhỏ, `- ` gạch đầu dòng, `1. ` danh sách đánh số, `> ` khung ghi chú, `**chữ đậm**`.
- Bài do skill Claude gửi qua `POST /api/agent/blog` (khóa `CONTENT_AGENT_KEY`) luôn là bản nháp, có thể kèm ảnh bìa lưu ở `backend/blog-images/`.

## Video, học viên và mở khóa bài

- Video MP4 của mỗi buổi nằm ở `backend/storage/lessons/lesson-01/video.mp4` đến `lesson-10/video.mp4` (tải lên từ trang quản trị hoặc chép trực tiếp). Thư mục này không được public qua web.
- Mỗi lần bấm phát, backend kiểm tra đăng nhập và quyền mở bài, rồi tạo URL stream riêng có hiệu lực 20 phút. Video phát theo byte-range để trình duyệt có thể tua; URL trực tiếp không tồn tại lâu dài.
- Học viên bấm `Đánh dấu đã hoàn thành` sau khi xem. Backend lưu tiến độ trong `backend/storage/data.json` và tự mở bài chưa hoàn thành kế tiếp.
- Khi chưa có `backend/storage/data.json`, backend chỉ tạo một tài khoản admin từ `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env` (không có thì tạo mật khẩu ngẫu nhiên và in ra log). Không còn tài khoản mẫu. Phân loại dữ liệu: xem [DEPLOY.md](DEPLOY.md).
- Quản lý học viên hiện có API dành cho quản trị: `GET /api/admin/students`, `POST /api/admin/students`, và `POST /api/admin/students/:id/unlock/:lessonId`. Ba API này yêu cầu token của tài khoản quản trị.

Đây là lưu trữ JSON phù hợp để chạy thử hoặc lớp nhỏ. Khi đưa lên production, chuyển `backend/storage/data.json` sang PostgreSQL/MySQL, đặt `JWT_SECRET` thành giá trị bí mật và dùng HTTPS. Không lưu video trong thư mục `public`.

## Lộ trình đóng gói khóa học

1. Chia mỗi buổi hiện có thành video 25–45 phút, tài liệu tải về, bài thực hành và 3–5 câu tự kiểm tra.
2. Mở dần bài học theo lịch hoặc theo tiến độ; đặt Q&A 1 sau buổi 5 và Q&A 2 sau buổi 9. Thu câu hỏi trước 48 giờ.
3. Quay theo từng chủ đề nhỏ, có slide/ghi màn hình, âm thanh sạch và một phần tóm tắt cuối bài. Tránh một video 2–3 giờ.
4. Tải video lên Mux hoặc Cloudflare Stream, dùng HLS có URL ký ngắn hạn. Backend hiện đã có endpoint cấp token 10 phút để tích hợp nhà cung cấp này.
5. Dùng Zoom/Google Meet cho Q&A và chỉ phát link cho học viên đã đăng nhập; lưu bản ghi trong cùng hệ thống video bảo vệ.

## Bảo vệ video

Không có cách nào chặn tuyệt đối việc sao chép nội dung người dùng đang xem (họ luôn có thể quay màn hình). Không đặt MP4 trong thư mục `public` hoặc một URL cố định. Thay vào đó: HLS/DASH phân mảnh, URL/token ký ngắn hạn theo từng học viên, kiểm tra quyền ở backend, giới hạn tên miền phát, watermark động bằng tên/email học viên; với nội dung giá trị cao, chọn DRM Widevine/FairPlay/PlayReady của Mux/Cloudflare hoặc dịch vụ tương đương. Endpoint `POST /api/lessons/:lessonId/playback` là điểm gắn quyền truy cập đó.

Trước khi xuất bản, thay `JWT_SECRET`, thêm cơ sở dữ liệu cho tài khoản/đơn hàng/tiến độ, và cấu hình nhà cung cấp video thật.

## Upload video từ admin

Video được lưu riêng trong `backend/storage/lessons/lesson-XX/video.mp4`, không phải thư mục public. Chỉ quản trị viên có token mới có thể upload; hệ thống chỉ nhận MP4, tối đa 2 GB, rồi tự đặt tên theo buổi học.

```bash
# Xem trạng thái 10 video
curl http://localhost:3002/api/admin/videos -H "Authorization: Bearer <token>"

# Upload hoặc ghi đè video buổi 1
curl -X POST http://localhost:3002/api/admin/videos/1 \
  -H "Authorization: Bearer <token>" \
  -F "video=@/duong-dan/toi/video.mp4"

# Xóa video buổi 1
curl -X DELETE http://localhost:3002/api/admin/videos/1 \
  -H "Authorization: Bearer <token>"
```

## Tài liệu đính kèm và ghi chú

Mỗi buổi có thư mục PDF riêng: `backend/storage/lessons/lesson-01/materials/` đến `lesson-10/materials/`. Ví dụ, đặt `slide.pdf` hoặc `bai-tap.pdf` vào `backend/storage/lessons/lesson-01/materials/` để chúng tự xuất hiện ở Buổi 1. Học viên chỉ thấy và tải được PDF của bài đang mở; file được tải qua liên kết có xác thực, không phải public URL. Ghi chú của từng học viên được lưu trong trường `notes` của hồ sơ tương ứng tại `backend/storage/data.json`.
