import React, { useEffect, useState } from 'react';
import { SiteShell, formatPrice } from '../components/SiteShell';
import { PostCard } from './BlogPage';

const AUDIENCE = [
  { icon: '🎓', title: 'Sinh viên dệt may và người muốn chuyển ngành', text: 'Chưa từng làm merchandiser? Khóa học đi từ nền tảng: vai trò của nghề, sản phẩm, tài liệu kỹ thuật, rồi mới đến quản lý đơn hàng.', points: ['Hiểu nghề trước khi đi phỏng vấn', 'Nắm thuật ngữ tiếng Anh dùng hằng ngày', 'Có bài thực hành để kể lại khi xin việc'] },
  { icon: '🧵', title: 'Merchandiser đang làm ở công ty may xuất khẩu', text: 'Đã đi làm nhưng học theo kiểu “cầm tay chỉ việc”? Khóa học giúp bạn hệ thống lại kiến thức thành một quy trình rõ ràng.', points: ['Hệ thống hóa quy trình từ Tech Pack đến shipment', 'Lập T&A, theo dõi nguyên phụ liệu chủ động hơn', 'Viết email tiếng Anh với khách gọn, đúng ý'] }
];
const OUTCOMES = [
  { icon: '🧭', title: 'Hiểu hành trình đơn hàng', text: 'Nhận đơn → phát triển mẫu → duyệt mẫu → sản xuất → giao hàng, và vai trò của bạn ở từng chặng.' },
  { icon: '📐', title: 'Đọc Tech Pack, duyệt mẫu', text: 'Đọc measurement, construction, BOM, artwork; phân biệt fit, size set, PP, TOP sample.' },
  { icon: '📅', title: 'Quản lý tiến độ, nguyên phụ liệu', text: 'Đọc PO, lập T&A, đặt hàng theo lead time và xử lý khi thiếu phụ liệu.' },
  { icon: '✉️', title: 'Phối hợp và giao tiếp', text: 'Làm việc với TD, QA/QC, kế hoạch, sản xuất; viết email thương mại theo nguyên tắc 3C.' }
];
const INCLUDED = ['10 buổi video quay sẵn, học theo lộ trình', 'Tài liệu PDF, từ vựng và câu hỏi ôn tập từng buổi', '2 buổi hỏi đáp trực tuyến với giảng viên', 'Ghi chú cá nhân ngay trong bài học', 'Học trên laptop hoặc điện thoại'];
const FAQ = [
  ['Tôi chưa có kinh nghiệm, có học được không?', 'Được. Khóa học bắt đầu từ vai trò của merchandiser và kiến thức sản phẩm cơ bản, phù hợp cả sinh viên và người trái ngành.'],
  ['Học như thế nào?', 'Bạn xem video bài giảng quay sẵn trên website, tải tài liệu PDF, làm câu hỏi ôn tập và ghi chú. Bài sau mở khi bạn hoàn thành bài trước để học đúng lộ trình.'],
  ['Có được hỏi giảng viên không?', 'Có. Khóa học có 2 buổi hỏi đáp trực tuyến (giữa khóa và cuối khóa). Bạn có thể gửi câu hỏi trước ngay trong trang học.'],
  ['Thanh toán thế nào?', 'Bấm “Đăng ký học”, điền họ tên, email, số điện thoại, rồi quét mã QR chuyển khoản. Mỗi đăng ký có nội dung chuyển khoản riêng để chúng tôi đối soát.'],
  ['Bao lâu thì tôi nhận được tài khoản?', 'Sau khi xác nhận thanh toán, chúng tôi tạo tài khoản và gửi thông tin đăng nhập tới số Zalo/điện thoại bạn đăng ký.'],
  ['Nên học trên thiết bị nào?', 'Nên dùng laptop để xem video và tài liệu thoải mái nhất. Điện thoại vẫn học được khi bạn di chuyển.']
];

const minutesOf = lessons => lessons.reduce((sum, lesson) => sum + (parseInt(lesson.duration, 10) || 0), 0);
const scrollToId = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export function LandingPage({ user }) {
  const [posts, setPosts] = useState([]);
  useEffect(() => { fetch('/api/blog').then(response => response.json()).then(list => setPosts(Array.isArray(list) ? list.slice(0, 3) : [])).catch(() => {}); }, []);

  return <SiteShell user={user} active="home">{(openRegister, info) => {
    const lessons = info?.course?.lessons || [];
    const hours = Math.floor(minutesOf(lessons) / 60);
    const price = formatPrice(info?.price || 1990000);
    return <>
      <section className="s-hero">
        <div className="s-wrap">
          <div>
            <p className="s-tag">Khóa học online · 10 buổi</p>
            <h1>Làm chủ nghiệp vụ <em>Merchandiser</em> ngành may</h1>
            <p className="s-hero-lead">Từ đọc Tech Pack, duyệt mẫu, lập T&A đến giao tiếp với khách hàng: học qua một đơn hàng áo sơ mi thực tế từ A đến Z.</p>
            <div className="s-hero-actions">
              <button className="s-btn s-btn-primary" onClick={openRegister}>Đăng ký học · {price}</button>
              <button className="s-btn s-btn-ghost" onClick={() => scrollToId('noi-dung')}>Xem nội dung khóa học</button>
            </div>
            <ul className="s-hero-facts">
              <li><b>10</b><span>buổi video</span></li>
              {hours > 0 && <li><b>{hours}+ giờ</b><span>bài giảng</span></li>}
              <li><b>2</b><span>buổi hỏi đáp trực tuyến</span></li>
            </ul>
          </div>
          <div className="s-price-card" aria-label="Học phí">
            <h2>{info?.course?.title || 'Khóa học: Merchandising ngành may'}</h2>
            <p className="s-price">{price} <small>/ trọn khóa</small></p>
            <ul>{INCLUDED.map(item => <li key={item}>{item}</li>)}</ul>
            <button className="s-btn s-btn-primary" onClick={openRegister}>Đăng ký ngay</button>
            <p className="s-price-note">Thanh toán bằng chuyển khoản QR, không cần thẻ.</p>
          </div>
        </div>
      </section>

      <section className="s-section">
        <div className="s-wrap">
          <div className="s-section-head"><p className="s-tag">Dành cho ai</p><h2>Khóa học phù hợp với bạn <em>nếu…</em></h2></div>
          <div className="s-cards">{AUDIENCE.map(item => <article className="s-card" key={item.title}><div className="s-icon" aria-hidden="true">{item.icon}</div><h3>{item.title}</h3><p>{item.text}</p><ul>{item.points.map(point => <li key={point}>{point}</li>)}</ul></article>)}</div>
        </div>
      </section>

      <section className="s-section s-section-soft">
        <div className="s-wrap">
          <div className="s-section-head"><p className="s-tag">Sau khóa học</p><h2>Bạn sẽ <em>làm được</em> gì</h2><p>Bài thực hành xuyên suốt: quản lý một đơn hàng áo sơ mi từ Tech Pack đến shipment.</p></div>
          <div className="s-cards">{OUTCOMES.map(item => <article className="s-card" key={item.title}><div className="s-icon" aria-hidden="true">{item.icon}</div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        </div>
      </section>

      <section className="s-section" id="noi-dung">
        <div className="s-wrap">
          <div className="s-section-head"><p className="s-tag">Nội dung</p><h2><em>10 buổi</em> học theo lộ trình</h2><p>Mỗi buổi gồm video bài giảng, tài liệu PDF, từ vựng trọng tâm và câu hỏi ôn tập.</p></div>
          {lessons.length ? <div className="s-curriculum">{lessons.map(lesson => <article className="s-lesson" key={lesson.id}>
            <span className="s-lesson-no">{String(lesson.id).padStart(2, '0')}</span>
            <div><h3>{lesson.title}</h3><p>{lesson.objective}</p>{lesson.duration && <small>{lesson.duration}</small>}</div>
          </article>)}</div> : <p className="s-empty">{info?.error ? 'Chưa tải được nội dung khóa học.' : 'Đang tải nội dung…'}</p>}
        </div>
      </section>

      <section className="s-section s-section-soft">
        <div className="s-wrap">
          <div className="s-section-head"><p className="s-tag">Giảng viên</p><h2>Người đồng hành cùng bạn</h2></div>
          <div className="s-instructor">
            <div className="s-avatar" aria-hidden="true"/>
            <div><h3>{info?.instructor?.name || 'Cô Mer'}</h3>{info?.instructor?.role && <p className="s-role">{info.instructor.role}</p>}{String(info?.instructor?.bio || '').split(/\n\s*\n/).filter(Boolean).map((text, index) => <p key={index}>{text}</p>)}</div>
          </div>
        </div>
      </section>

      <section className="s-section">
        <div className="s-wrap">
          <div className="s-section-head"><p className="s-tag">Đăng ký</p><h2>Bắt đầu học trong <em>3 bước</em></h2></div>
          <div className="s-steps">
            <article className="s-step"><h3>Điền thông tin</h3><p>Bấm “Đăng ký học”, nhập họ tên, email và số điện thoại.</p></article>
            <article className="s-step"><h3>Chuyển khoản qua QR</h3><p>Quét mã QR {price}. Nội dung chuyển khoản là mã riêng của bạn.</p></article>
            <article className="s-step"><h3>Nhận tài khoản và học</h3><p>Chúng tôi xác nhận thanh toán và gửi tài khoản đăng nhập qua Zalo/điện thoại.</p></article>
          </div>
        </div>
      </section>

      <section className="s-section s-section-soft">
        <div className="s-wrap">
          <div className="s-section-head"><p className="s-tag">Hỏi đáp</p><h2>Câu hỏi thường gặp</h2></div>
          <div className="s-faq">{FAQ.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        </div>
      </section>

      {posts.length > 0 && <section className="s-section">
        <div className="s-wrap">
          <div className="s-section-head"><p className="s-tag">Blog</p><h2>Kiến thức nghề merchandiser</h2><p>Bài viết miễn phí về nghề, quy trình và thuật ngữ trong ngành may xuất khẩu.</p></div>
          <div className="s-posts">{posts.map(post => <PostCard post={post} key={post.id}/>)}</div>
          <p style={{ marginTop: 24 }}><a className="s-btn s-btn-line" href="#blog">Xem tất cả bài viết →</a></p>
        </div>
      </section>}

      <section className="s-section" style={{ paddingTop: posts.length ? 0 : undefined }}>
        <div className="s-wrap">
          <div className="s-cta">
            <div><h2>Sẵn sàng bắt đầu?</h2><p>Học phí {price} cho trọn khóa 10 buổi và 2 buổi hỏi đáp.</p></div>
            <button className="s-btn s-btn-primary" onClick={openRegister}>Đăng ký học ngay →</button>
          </div>
        </div>
      </section>
    </>;
  }}</SiteShell>;
}
