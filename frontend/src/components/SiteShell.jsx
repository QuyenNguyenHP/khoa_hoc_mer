import React, { useCallback, useEffect, useState } from 'react';
import { RegisterDialog } from './RegisterDialog';

export const formatPrice = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
export const go = hash => { window.location.hash = hash; window.scrollTo(0, 0); };

// Public site info (price, curriculum, Zalo...) is fetched once and shared by every public page.
let siteInfoCache = null;
export function useSiteInfo() {
  const [info, setInfo] = useState(siteInfoCache);
  useEffect(() => {
    if (siteInfoCache) return;
    fetch('/api/public/site').then(response => response.json()).then(data => { siteInfoCache = data; setInfo(data); }).catch(() => setInfo({ error: true }));
  }, []);
  return info;
}

// Header, footer, floating Zalo button and the registration dialog for public pages.
// `children` is a function that receives `openRegister`.
export function SiteShell({ user, active, children }) {
  const info = useSiteInfo();
  const [registerOpen, setRegisterOpen] = useState(false);
  const openRegister = useCallback(() => setRegisterOpen(true), []);
  const closeRegister = useCallback(() => setRegisterOpen(false), []);
  const home = user ? '#gioi-thieu' : '';
  const zalo = info?.zaloPhone ? `https://zalo.me/${info.zaloPhone}` : '';

  return <div className="site">
    <header className="s-topbar">
      <div className="s-wrap">
        <button className="s-logo" onClick={() => go(home)}><img src="/mina.png" alt=""/><span>Merchandising ngành may</span></button>
        <nav className="s-menu" aria-label="Menu chính">
          <a href={home || '#'} className={`s-hide-sm ${active === 'home' ? 's-active' : ''}`} onClick={() => window.scrollTo(0, 0)}>Khóa học</a>
          <a href="#blog" className={active === 'blog' ? 's-active' : ''} onClick={() => window.scrollTo(0, 0)}>Blog</a>
          {user
            ? <a href={user.role === 'admin' ? '#quan-tri' : '#lop-hoc'}>{user.role === 'admin' ? 'Quản trị' : 'Vào lớp học'}</a>
            : <a href="#dang-nhap">Đăng nhập</a>}
          <button className="s-btn s-btn-primary" onClick={openRegister}>Đăng ký học</button>
        </nav>
      </div>
    </header>

    <main>{children(openRegister, info)}</main>

    <footer className="s-footer">
      <div className="s-wrap">
        <span>© {new Date().getFullYear()} Khóa học Merchandising ngành may · comernganhmay.online</span>
        <span>
          <a href="#blog">Blog</a>
          {zalo && <a href={zalo} target="_blank" rel="noreferrer">Zalo hỗ trợ</a>}
          <a href="#dang-nhap">Đăng nhập học viên</a>
        </span>
      </div>
    </footer>

    {zalo && <a className="s-zalo" href={zalo} target="_blank" rel="noreferrer" aria-label="Chat Zalo với chúng tôi"><b>Zalo</b><span>Chat tư vấn</span></a>}
    {registerOpen && <RegisterDialog info={info} onClose={closeRegister}/>}
  </div>;
}
