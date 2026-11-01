import React, { useEffect, useState } from 'react';
import { api } from '../../api';

const STATUS = { pending: 'Chờ thanh toán', paid: 'Đã thanh toán', cancelled: 'Đã hủy' };
const money = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

// Admin checks the bank statement for the order code, then confirms: this creates
// the student account and shows a one-time password to send to the student.
export function AdminOrders() {
  const [orders, setOrders] = useState(null); const [filter, setFilter] = useState('pending'); const [message, setMessage] = useState(''); const [created, setCreated] = useState(null); const [copied, setCopied] = useState(false);
  const load = () => api('/api/admin/orders').then(setOrders).catch(error => setMessage(error.message));
  useEffect(() => { load(); }, []);

  const confirm = async order => {
    if (!window.confirm(`Xác nhận đã nhận ${money(order.amount)} với nội dung ${order.code} từ ${order.name}?`)) return;
    try { const result = await api(`/api/admin/orders/${order.id}/confirm`, { method: 'POST' }); setCreated(result); setCopied(false); load(); } catch (error) { setMessage(error.message); }
  };
  const cancel = async order => {
    if (!window.confirm(`Hủy đơn ${order.code} của ${order.name}?`)) return;
    try { await api(`/api/admin/orders/${order.id}/cancel`, { method: 'POST' }); load(); } catch (error) { setMessage(error.message); }
  };
  const loginText = created && `Chào ${created.order.name},\nChúng tôi đã nhận học phí khóa Merchandising ngành may. Thông tin đăng nhập:\nWebsite: ${window.location.origin}/#dang-nhap\nEmail: ${created.order.email}\n${created.password ? `Mật khẩu: ${created.password}` : 'Mật khẩu: dùng mật khẩu tài khoản hiện có của bạn'}\nChúc bạn học tốt!`;
  const copy = async () => { try { await navigator.clipboard.writeText(loginText); setCopied(true); } catch { setCopied(false); } };

  if (!orders) return <p className="editor-note">{message || 'Đang tải đơn đăng ký…'}</p>;
  const shown = orders.filter(order => !filter || order.status === filter);
  const count = status => orders.filter(order => order.status === status).length;

  return <section>
    {message && <p className="notice">{message}</p>}
    {created && <div className="adm-box adm-success">
      <strong>Đã tạo tài khoản cho {created.order.name}</strong>
      {created.existingAccount && <p>Email này đã có tài khoản từ trước nên không tạo mới.</p>}
      <p>Gửi nội dung dưới đây cho học viên qua email hoặc Zalo ({created.order.phone}). Mật khẩu chỉ hiện một lần.</p>
      <pre>{loginText}</pre>
      <div className="adm-actions"><button onClick={copy}>{copied ? 'Đã chép ✓' : 'Chép nội dung'}</button>{created.order.phone && <a href={`https://zalo.me/${created.order.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">Mở Zalo học viên</a>}<button className="adm-muted" onClick={() => setCreated(null)}>Đóng</button></div>
    </div>}
    <div className="adm-filters">
      {[['pending', `Chờ thanh toán (${count('pending')})`], ['paid', `Đã thanh toán (${count('paid')})`], ['cancelled', `Đã hủy (${count('cancelled')})`], ['', `Tất cả (${orders.length})`]].map(([key, label]) => <button key={key} className={filter === key ? 'on' : ''} onClick={() => setFilter(key)}>{label}</button>)}
    </div>
    <div className="adm-table-wrap"><table className="adm-table">
      <thead><tr><th>Mã chuyển khoản</th><th>Học viên</th><th>Liên hệ</th><th>Số tiền</th><th>Ngày đăng ký</th><th>Trạng thái</th><th/></tr></thead>
      <tbody>{shown.length ? shown.map(order => <tr key={order.id}>
        <td><code>{order.code}</code></td>
        <td>{order.name}</td>
        <td>{order.email}<br/><small>{order.phone}</small></td>
        <td>{money(order.amount)}</td>
        <td>{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
        <td><span className={`adm-status ${order.status}`}>{STATUS[order.status]}</span></td>
        <td className="adm-actions">{order.status === 'pending' && <><button onClick={() => confirm(order)}>Đã nhận tiền</button><button className="adm-muted" onClick={() => cancel(order)}>Hủy</button></>}</td>
      </tr>) : <tr><td colSpan="7" className="editor-note">Không có đơn nào.</td></tr>}</tbody>
    </table></div>
  </section>;
}
