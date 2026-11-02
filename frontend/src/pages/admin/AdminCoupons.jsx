import React, { useEffect, useState } from 'react';
import { api } from '../../api';

const EMPTY = { code: '', type: 'percent', value: '', maxUses: '', expiresAt: '', note: '' };
const money = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const describe = coupon => coupon.type === 'percent' ? `Giảm ${coupon.value}%` : `Giảm ${money(coupon.value)}`;
function statusOf(coupon) {
  if (!coupon.active) return ['cancelled', 'Đã tắt'];
  if (coupon.expired) return ['cancelled', 'Hết hạn'];
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) return ['cancelled', 'Hết lượt'];
  return ['paid', 'Đang dùng'];
}

// Discount codes: customers type one in the registration form; the order amount and the
// transfer note ("MERxxxx CODE") follow it. Uses are counted from paid orders only.
export function AdminCoupons() {
  const [list, setList] = useState(null); const [form, setForm] = useState(EMPTY); const [message, setMessage] = useState(''); const [saved, setSaved] = useState('');
  const load = () => api('/api/admin/coupons').then(setList).catch(error => setMessage(error.message));
  useEffect(() => { load(); }, []);
  const field = name => event => setForm(current => ({ ...current, [name]: event.target.value }));

  const create = async event => {
    event.preventDefault(); setMessage('');
    try {
      const coupon = await api('/api/admin/coupons', { method: 'POST', body: JSON.stringify(form) });
      setForm(EMPTY); setSaved(`Đã tạo mã ${coupon.code}.`); setTimeout(() => setSaved(''), 2500); load();
    } catch (error) { setMessage(error.message); }
  };
  const toggle = async coupon => {
    try { await api(`/api/admin/coupons/${coupon.id}`, { method: 'PUT', body: JSON.stringify({ active: !coupon.active }) }); load(); } catch (error) { setMessage(error.message); }
  };
  const remove = async coupon => {
    if (!window.confirm(`Xóa mã ${coupon.code}? Các đơn đã dùng mã này vẫn giữ nguyên số tiền.`)) return;
    try { await api(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' }); load(); } catch (error) { setMessage(error.message); }
  };

  return <section>
    {message && <p className="notice">{message}</p>}
    <form className="adm-box adm-coupon-form" onSubmit={create}>
      <strong>Tạo mã giảm giá</strong>
      <div className="adm-coupon-grid">
        <label>Mã<input value={form.code} onChange={event => setForm(current => ({ ...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} placeholder="VD: GIAM20" required minLength={3} maxLength={20}/></label>
        <label>Kiểu giảm<select value={form.type} onChange={field('type')}><option value="percent">Theo %</option><option value="amount">Số tiền (đ)</option></select></label>
        <label>{form.type === 'percent' ? 'Giảm (%)' : 'Giảm (đ)'}<input type="number" value={form.value} onChange={field('value')} min={form.type === 'percent' ? 1 : 1000} max={form.type === 'percent' ? 100 : undefined} step={form.type === 'percent' ? 1 : 1000} required/></label>
        <label>Số lượt tối đa <small>(trống = không giới hạn)</small><input type="number" value={form.maxUses} onChange={field('maxUses')} min="0" step="1"/></label>
        <label>Hết hạn sau ngày <small>(trống = không hết hạn)</small><input type="date" value={form.expiresAt} onChange={field('expiresAt')}/></label>
        <label>Ghi chú <small>(chỉ admin thấy)</small><input value={form.note} onChange={field('note')} maxLength={200} placeholder="VD: ưu đãi tháng 11"/></label>
      </div>
      <div className="adm-actions"><button>Tạo mã</button>{saved && <span className="adm-saved">{saved}</span>}</div>
      <p className="editor-note">Khách nhập mã ở form đăng ký. Nội dung chuyển khoản sẽ có dạng <code>MERxxxxxx MÃ</code>. Lượt dùng chỉ được tính khi bạn bấm “Đã nhận tiền”.</p>
    </form>

    <div className="adm-table-wrap"><table className="adm-table">
      <thead><tr><th>Mã</th><th>Ưu đãi</th><th>Đã dùng</th><th>Hết hạn</th><th>Trạng thái</th><th/></tr></thead>
      <tbody>{!list ? <tr><td colSpan="6" className="editor-note">Đang tải…</td></tr> : list.length ? list.map(coupon => {
        const [tone, label] = statusOf(coupon);
        return <tr key={coupon.id}>
          <td><code>{coupon.code}</code>{coupon.note && <><br/><small>{coupon.note}</small></>}</td>
          <td>{describe(coupon)}</td>
          <td>{coupon.uses}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}</td>
          <td>{coupon.expiresAt ? new Date(`${coupon.expiresAt}T00:00:00`).toLocaleDateString('vi-VN') : '—'}</td>
          <td><span className={`adm-status ${tone}`}>{label}</span></td>
          <td className="adm-actions"><button className="adm-muted" onClick={() => toggle(coupon)}>{coupon.active ? 'Tắt' : 'Bật'}</button><button className="danger" onClick={() => remove(coupon)}>Xóa</button></td>
        </tr>;
      }) : <tr><td colSpan="6" className="editor-note">Chưa có mã giảm giá nào.</td></tr>}</tbody>
    </table></div>
  </section>;
}
