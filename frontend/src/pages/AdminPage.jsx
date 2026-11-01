import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AdminOrders } from './admin/AdminOrders';
import { AdminBlog } from './admin/AdminBlog';

const ADMIN_PAGE_STYLES = `
  .admin-page .admin-header { margin: 0; }
  .admin-page .admin-detail {
    position: static;
    top: auto;
    bottom: auto;
    width: auto;
    display: block;
  }
  .admin-page .admin-question { margin: 12px 0; padding: 12px; border-radius: 8px; background: #102641; }
  .admin-page .admin-question strong { color: #69c9ff; font-size: 12px; }
  .admin-page .admin-question p { margin: 7px 0; line-height: 1.5; }
  .admin-page .admin-question small { color: #8ca1b7; font-size: 10px; }
  .admin-page .add-student select { background: #071426; border: 1px solid rgba(255,255,255,.16); border-radius: 5px; padding: 10px; color: #fff; }
  .admin-page .adm-tabs { display: flex; gap: 6px; margin: 0 0 24px; border-bottom: 1px solid rgba(255,255,255,.12); }
  .admin-page .adm-tabs button { border-top: 0; border-left: 0; border-right: 0; background: none; color: #b9c9da; padding: 12px 16px; font-size: 15px; font-weight: 600; cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -1px; }
  .admin-page .adm-tabs button.on { color: #fff; border-bottom-color: #f44911; }
  .admin-page .adm-tabs a { margin-left: auto; align-self: center; color: #69c9ff; font-size: 14px; }
  .admin-page .adm-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .admin-page .adm-filters button { border: 1px solid rgba(255,255,255,.16); background: #0b1930; color: #d4e0ed; border-radius: 999px; padding: 8px 14px; font-size: 14px; cursor: pointer; }
  .admin-page .adm-filters button.on { background: #f44911; border-color: #f44911; color: #fff; }
  .admin-page .adm-table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; background: #0b1930; }
  .admin-page .adm-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .admin-page .adm-table th { text-align: left; color: #8ca1b7; font-weight: 600; padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.12); white-space: nowrap; }
  .admin-page .adm-table td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.06); vertical-align: top; }
  .admin-page .adm-table small { color: #8ca1b7; }
  .admin-page .adm-table code { color: #69c9ff; font-size: 14px; }
  .admin-page .adm-status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 13px; white-space: nowrap; }
  .admin-page .adm-status.pending { background: rgba(244,73,17,.16); color: #ffb08f; }
  .admin-page .adm-status.paid { background: rgba(80,200,120,.16); color: #8fe0a8; }
  .admin-page .adm-status.cancelled { background: rgba(255,255,255,.08); color: #8ca1b7; }
  .admin-page .adm-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .admin-page .adm-actions button, .admin-page .adm-actions a, .admin-page .adm-small { border: 0; border-radius: 8px; background: #f44911; color: #fff; padding: 8px 14px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap; }
  .admin-page .adm-actions .adm-muted { background: rgba(255,255,255,.1); color: #d4e0ed; }
  .admin-page .adm-box { border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; }
  .admin-page .adm-success { background: #0f2d22; border: 1px solid #2f7a52; }
  .admin-page .adm-success p { color: #c9e6d5; margin: 6px 0 10px; font-size: 14px; }
  .admin-page .adm-success pre { white-space: pre-wrap; background: #071426; padding: 12px; border-radius: 8px; font-size: 14px; color: #fff; margin: 0 0 12px; }
  .admin-page .adm-post-row { grid-template-columns: minmax(0,1fr) auto; }
  .admin-page .adm-editor .detail-heading a { color: #69c9ff; font-size: 14px; }
  .admin-page .adm-fields { display: grid; gap: 14px; padding: 20px; }
  .admin-page .adm-fields label { display: grid; gap: 6px; font-size: 14px; font-weight: 600; color: #d4e0ed; }
  .admin-page .adm-fields small { color: #8ca1b7; font-weight: 400; }
  .admin-page .adm-fields input, .admin-page .adm-fields textarea { background: #071426; border: 1px solid rgba(255,255,255,.16); border-radius: 8px; padding: 10px 12px; color: #fff; font: inherit; font-size: 15px; line-height: 1.55; }
  .admin-page .adm-fields .adm-check { display: flex; align-items: center; gap: 10px; }
  .admin-page .adm-fields code { color: #69c9ff; }
  .admin-page .adm-saved { color: #8fe0a8; font-size: 14px; }
  .admin-page .lesson-editor select { width: 100%; margin: 8px 0 20px; background: #071426; border: 1px solid rgba(255,255,255,.16); border-radius: 5px; padding: 10px; color: #fff; }
`;

export function AdminPage({ user, logout }) {
  const [data, setData] = useState(null); const [selected, setSelected] = useState(null); const [message, setMessage] = useState(''); const [tab, setTab] = useState('accounts');
  const load = async () => { try { const next = await api('/api/admin/students'); const accounts = next.accounts || next.students; setData(next); setSelected(current => accounts.find(item => item.id === current?.id) || accounts[0] || null); } catch (error) { setMessage(error.message); } };
  useEffect(() => { load(); }, []);
  const addStudent = async event => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); try { await api('/api/admin/students', { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password'), role: form.get('role') }) }); formElement.reset(); load(); } catch (error) { setMessage(error.message); } };
  const changeRole = async event => { try { const updated = await api(`/api/admin/accounts/${selected.id}/role`, { method: 'PUT', body: JSON.stringify({ role: event.target.value }) }); setSelected(updated); load(); } catch (error) { setMessage(error.message); } };
  if (!data) return <main className="loading">Đang tải quản trị lớp học...</main>;
  return <main className="admin-page"><style>{ADMIN_PAGE_STYLES}</style><header className="admin-header"><div className="login-mark"><span>KH</span><strong>KHÓA HỌC / QUẢN TRỊ</strong></div><div><span>{user.name}</span><button className="text-button" onClick={logout}>Đăng xuất</button></div></header><section className="admin-content"><nav className="adm-tabs" aria-label="Khu vực quản trị">{[['accounts', 'Tài khoản'], ['orders', 'Đơn đăng ký'], ['blog', 'Blog']].map(([key, label]) => <button key={key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label}</button>)}<a href="#gioi-thieu" target="_blank" rel="noreferrer">Xem trang giới thiệu ↗</a></nav>{tab === 'orders' && <AdminOrders/>}{tab === 'blog' && <AdminBlog/>}{tab === 'accounts' && <>{message && <p className="notice">{message}</p>}<div className="admin-grid"><section className="student-table"><div className="table-head"><strong>Danh sách tài khoản</strong><small>Chọn một dòng để xem câu hỏi</small></div>{(data.accounts || data.students).map(account => <button className={`student-row ${selected?.id === account.id ? 'selected-row' : ''}`} key={account.id} onClick={() => setSelected(account)}><span className="avatar">{account.name.slice(0, 2).toUpperCase()}</span><span><strong>{account.name}</strong><small>{account.email} · {account.role === 'admin' ? 'Quản trị viên' : 'Học viên'}</small></span><span className="admin-progress"><i style={{ width: `${account.progress}%` }}/><small>{account.role === 'admin' ? 'Admin' : `${account.completedLessons.length}/10`}</small></span></button>)}</section><aside className="admin-detail">{selected && <><div className="detail-heading"><h2>{selected.name}</h2></div><div className="lesson-editor"><p className="eyebrow">VAI TRÒ TÀI KHOẢN</p><select value={selected.role} onChange={changeRole}><option value="student">Học viên</option><option value="admin">Quản trị viên</option></select><p className="eyebrow">CÂU HỎI TỪ HỌC VIÊN</p>{selected.questions?.length ? selected.questions.map(item => <article className="admin-question" key={item.id}><strong>Bài {item.lessonId}</strong><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></article>) : <p className="editor-note">{selected.role === 'admin' ? 'Đây là tài khoản quản trị viên.' : 'Học viên chưa gửi câu hỏi.'}</p>}</div></>}</aside></div><section className="add-student"><div><p className="eyebrow">THÊM TÀI KHOẢN</p><h2>Tạo học viên hoặc quản trị viên</h2></div><form onSubmit={addStudent}><input name="name" placeholder="Họ và tên" required/><input name="email" type="email" placeholder="Email" required/><input name="password" type="password" placeholder="Mật khẩu ban đầu" required/><select name="role" defaultValue="student"><option value="student">Học viên</option><option value="admin">Quản trị viên</option></select><button>Tạo tài khoản</button></form></section></>}</section></main>;
}
