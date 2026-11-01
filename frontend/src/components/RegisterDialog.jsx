import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { formatPrice } from './SiteShell';

// Step 1: name / email / phone. Step 2: VietQR code with the order's own transfer note.
export function RegisterDialog({ info, onClose }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState('');
  const firstInput = useRef(null);

  useEffect(() => {
    firstInput.current?.focus();
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  const submit = async event => {
    event.preventDefault(); setError(''); setSending(true);
    const form = new FormData(event.currentTarget);
    try {
      setOrder(await api('/api/orders', { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), phone: form.get('phone') }) }));
    } catch (problem) { setError(problem.message); }
    setSending(false);
  };
  const copy = async (label, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 1500); } catch { /* clipboard blocked: user can still read the text */ }
  };
  const zalo = (order?.zaloPhone || info?.zaloPhone) ? `https://zalo.me/${order?.zaloPhone || info.zaloPhone}` : '';

  return <div className="s-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="s-dialog" role="dialog" aria-modal="true" aria-labelledby="register-title">
      <button className="s-close" onClick={onClose} aria-label="Đóng">×</button>

      {!order ? <>
        <h2 id="register-title">Đăng ký khóa học</h2>
        <p>Học phí {formatPrice(info?.price || 1990000)}. Điền thông tin để nhận mã chuyển khoản.</p>
        <form className="s-form" onSubmit={submit}>
          {error && <p className="s-error" role="alert">{error}</p>}
          <label>Họ và tên<input ref={firstInput} name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>
          <label>Email (nhận tài khoản học)<input name="email" type="email" autoComplete="email" required maxLength={150}/></label>
          <label>Số điện thoại / Zalo<input name="phone" type="tel" autoComplete="tel" inputMode="tel" required minLength={9} maxLength={16}/></label>
          <button className="s-btn s-btn-primary" disabled={sending}>{sending ? 'Đang gửi…' : 'Tiếp tục thanh toán →'}</button>
        </form>
      </> : <>
        <h2 id="register-title">Chuyển khoản để hoàn tất</h2>
        <p>Quét mã QR bằng ứng dụng ngân hàng. Số tiền và nội dung đã điền sẵn.</p>
        {order.bank ? <div className="s-pay">
          <img src={order.qrUrl} alt={`Mã QR chuyển khoản ${formatPrice(order.amount)}, nội dung ${order.transferNote}`}/>
          <dl>
            <div><dt>Ngân hàng</dt><dd>{order.bank.bankName || order.bank.bankId}</dd></div>
            <div><dt>Số tài khoản</dt><dd><span className="s-code">{order.bank.accountNo}<button onClick={() => copy('acc', order.bank.accountNo)}>{copied === 'acc' ? 'Đã chép' : 'Chép'}</button></span></dd></div>
            {order.bank.accountName && <div><dt>Chủ tài khoản</dt><dd>{order.bank.accountName}</dd></div>}
            <div><dt>Số tiền</dt><dd>{formatPrice(order.amount)}</dd></div>
            <div><dt>Nội dung chuyển khoản</dt><dd><span className="s-code">{order.transferNote}<button onClick={() => copy('note', order.transferNote)}>{copied === 'note' ? 'Đã chép' : 'Chép'}</button></span></dd></div>
          </dl>
        </div> : <p className="s-pay-note">Mã đăng ký của bạn là <span className="s-code">{order.code}</span>. Thông tin chuyển khoản đang được cập nhật, vui lòng nhắn Zalo để nhận số tài khoản.</p>}
        <p className="s-pay-note">Sau khi nhận được tiền, chúng tôi sẽ gửi tài khoản đăng nhập tới email của bạn. Giữ đúng nội dung <b>{order.transferNote}</b> để đơn được xác nhận nhanh.</p>
        <div className="s-hero-actions" style={{ marginTop: 18 }}>
          {zalo && <a className="s-btn s-btn-primary" href={zalo} target="_blank" rel="noreferrer">Báo đã chuyển qua Zalo</a>}
          <button className="s-btn s-btn-line" onClick={onClose}>Đóng</button>
        </div>
      </>}
    </section>
  </div>;
}
