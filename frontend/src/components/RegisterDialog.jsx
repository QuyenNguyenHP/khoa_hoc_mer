import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { formatPrice } from './SiteShell';

// Step 1: name / email / phone (+ optional discount code). Step 2: VietQR code with the order's own transfer note.
export function RegisterDialog({ info, onClose }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState('');
  const [couponInput, setCouponInput] = useState(''); const [coupon, setCoupon] = useState(null); const [couponError, setCouponError] = useState(''); const [checking, setChecking] = useState(false);
  const price = info?.price || 1990000;
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
      setOrder(await api('/api/orders', { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), phone: form.get('phone'), couponCode: couponInput.trim() }) }));
    } catch (problem) { setError(problem.message); }
    setSending(false);
  };
  // Checks the code and shows the discounted price before the customer continues.
  const applyCoupon = async () => {
    const code = couponInput.trim(); setCouponError(''); setCoupon(null); if (!code) return;
    setChecking(true);
    try { setCoupon(await api('/api/coupons/check', { method: 'POST', body: JSON.stringify({ code }) })); }
    catch (problem) { setCouponError(problem.message); }
    setChecking(false);
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
        <p>Học phí {coupon ? <><s>{formatPrice(price)}</s> <b>{formatPrice(coupon.amount)}</b></> : formatPrice(price)}. Điền thông tin để nhận mã chuyển khoản.</p>
        <form className="s-form" onSubmit={submit}>
          {error && <p className="s-error" role="alert">{error}</p>}
          <label>Họ và tên<input ref={firstInput} name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>
          <label>Email (nhận tài khoản học)<input name="email" type="email" autoComplete="email" required maxLength={150}/></label>
          <label>Số điện thoại / Zalo<input name="phone" type="tel" autoComplete="tel" inputMode="tel" required minLength={9} maxLength={16}/></label>
          <div className="s-coupon">
            <label htmlFor="coupon-code">Mã giảm giá <small>(nếu có)</small></label>
            <div><input id="coupon-code" value={couponInput} onChange={event => { setCouponInput(event.target.value.toUpperCase()); setCoupon(null); setCouponError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); applyCoupon(); } }} autoComplete="off" maxLength={20}/>
              <button type="button" className="s-btn s-btn-line" onClick={applyCoupon} disabled={checking || !couponInput.trim()}>{checking ? 'Đang kiểm tra…' : 'Áp dụng'}</button></div>
            {coupon && <p className="s-coupon-ok" role="status">Mã {coupon.code} hợp lệ: {coupon.label}, còn <b>{formatPrice(coupon.amount)}</b>.</p>}
            {couponError && <p className="s-error" role="alert">{couponError}</p>}
          </div>
          <button className="s-btn s-btn-primary" disabled={sending}>{sending ? 'Đang gửi…' : 'Tiếp tục thanh toán →'}</button>
        </form>
      </> : <>
        <h2 id="register-title">{order.bank ? 'Chuyển khoản để hoàn tất' : 'Đã ghi nhận đăng ký'}</h2>
        {order.bank && <p>Quét mã QR bằng ứng dụng ngân hàng. Nội dung chuyển khoản đã điền sẵn, bạn <b>nhập số tiền {formatPrice(order.amount)}</b>.</p>}
        {order.bank ? <div className="s-pay">
          <img src={order.qrUrl} alt={`Mã QR chuyển khoản, nội dung ${order.transferNote}`}/>
          <dl>
            <div><dt>Ngân hàng</dt><dd>{order.bank.bankName || order.bank.bankId}</dd></div>
            <div><dt>Số tài khoản</dt><dd><span className="s-code">{order.bank.accountNo}<button onClick={() => copy('acc', order.bank.accountNo)}>{copied === 'acc' ? 'Đã chép' : 'Chép'}</button></span></dd></div>
            {order.bank.accountName && <div><dt>Chủ tài khoản</dt><dd>{order.bank.accountName}</dd></div>}
            <div><dt>Số tiền cần chuyển</dt><dd><span className="s-code">{formatPrice(order.amount)}<button onClick={() => copy('amount', String(order.amount))}>{copied === 'amount' ? 'Đã chép' : 'Chép'}</button></span>{order.couponCode && <small className="s-pay-discount">Đã áp dụng mã {order.couponCode}: giảm {formatPrice(order.discount)} (giá gốc <s>{formatPrice(order.originalAmount)}</s>)</small>}</dd></div>
            <div><dt>Nội dung chuyển khoản</dt><dd><span className="s-code">{order.transferNote}<button onClick={() => copy('note', order.transferNote)}>{copied === 'note' ? 'Đã chép' : 'Chép'}</button></span></dd></div>
          </dl>
        </div> : <p className="s-pay-note">Mã đăng ký của bạn là <span className="s-code">{order.code}</span>. Thông tin chuyển khoản đang được cập nhật, xin vui lòng chờ chúng tôi một chút.</p>}
        <p className="s-pay-note">Sau khi xác nhận thanh toán, chúng tôi sẽ gửi thông tin tài khoản tới số Zalo/điện thoại của bạn. Giữ đúng nội dung <b>{order.transferNote}</b> để đơn được xác nhận nhanh.</p>
        <div className="s-hero-actions" style={{ marginTop: 18 }}>
          {zalo && <a className="s-btn s-btn-primary" href={zalo} target="_blank" rel="noreferrer">Báo đã chuyển qua Zalo</a>}
          <button className="s-btn s-btn-line" onClick={onClose}>Đóng</button>
        </div>
      </>}
    </section>
  </div>;
}
