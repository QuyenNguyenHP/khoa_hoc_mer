import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AdminOrders } from './admin/AdminOrders';
import { AdminBlog } from './admin/AdminBlog';

// Admin in the shared paper/navy theme (colours from :root in site.css). Prefixed with
// .admin-page so it beats the older dark rules in admin.css and theme.css.
const ADMIN_PAGE_STYLES = `
  .admin-page { background: var(--paper); color: var(--ink); }
  .admin-page .admin-header { margin: 0; background: var(--paper); border-bottom: 1px solid var(--rule); border-radius: 0; }
  .admin-page .admin-header > div:last-child { color: var(--muted); font-size: 15px; }
  .admin-page .admin-header .login-mark span { border: 1px solid var(--rule); background-color: var(--card); }
  .admin-page .admin-header .login-mark strong::after { color: var(--ink); font-size: 13px; }
  .admin-page .text-button { color: var(--accent-ink); font-size: 15px; font-weight: 600; }
  .admin-page .notice { color: var(--bad); background: #fbe4dc; border-radius: 10px; padding: 10px 14px; }
  .admin-page .eyebrow { color: var(--accent-ink); font-size: 13px; font-weight: 500; letter-spacing: .08em; margin: 0 0 8px; }
  .admin-page .editor-note { color: var(--muted); font-size: 14px; }

  .admin-page .adm-tabs { display: flex; gap: 6px; margin: 0 0 24px; border-bottom: 1px solid var(--rule); }
  .admin-page .adm-tabs button { border: 0; border-bottom: 3px solid transparent; margin-bottom: -1px; background: none; color: var(--muted); padding: 12px 16px; font-size: 16px; font-weight: 600; cursor: pointer; }
  .admin-page .adm-tabs button:hover { color: var(--ink); }
  .admin-page .adm-tabs button.on { color: var(--ink); border-bottom-color: var(--brass); }
  .admin-page .adm-tabs a { margin-left: auto; align-self: center; color: var(--accent-ink); font-size: 15px; font-weight: 600; }

  .admin-page .admin-detail { position: static; top: auto; bottom: auto; width: auto; display: block; }
  .admin-page :is(.student-table, .admin-detail, .add-student) { background: var(--card); border: 1px solid var(--rule); border-radius: 16px; }
  .admin-page :is(.table-head, .detail-heading) { border-bottom: 1px solid var(--rule); }
  .admin-page :is(.table-head strong, .detail-heading h2, .add-student h2) { color: var(--ink); }
  .admin-page .table-head strong { font-size: 17px; }
  .admin-page .detail-heading h2 { font-size: 24px; }
  .admin-page .add-student h2 { font-size: 22px; }
  .admin-page .table-head small { color: var(--muted); font-size: 14px; }
  .admin-page .student-row { color: var(--ink); border-bottom: 1px solid var(--rule); }
  .admin-page .student-row:hover, .admin-page .selected-row { background: var(--paper-2); }
  .admin-page .student-row strong { font-size: 15px; }
  .admin-page .student-row small { color: var(--muted); font-size: 13px; }
  .admin-page .avatar { background: var(--night); color: var(--night-ink); font-size: 12px; }
  .admin-page .admin-progress { background: var(--paper-2); }
  .admin-page .admin-progress i { background: var(--brass); }
  .admin-page .admin-question { margin: 12px 0; padding: 14px; border-radius: 10px; background: var(--paper); border: 1px solid var(--rule); }
  .admin-page .admin-question strong { color: var(--accent-ink); font-size: 13px; }
  .admin-page .admin-question p { margin: 7px 0; line-height: 1.55; color: var(--ink); }
  .admin-page .admin-question small { color: var(--muted); font-size: 13px; }

  .admin-page :is(.add-student input, .add-student select, .lesson-editor select, .adm-fields input, .adm-fields textarea) { background: #fffdf8; border: 1px solid var(--control); border-radius: 10px; padding: 10px 12px; color: var(--ink); font-size: 15px; line-height: 1.55; }
  .admin-page .lesson-editor select { width: 100%; margin: 8px 0 20px; }
  .admin-page .add-student form { grid-template-columns: repeat(3, minmax(0, 1fr)) auto auto; }
  @media (max-width: 850px) { .admin-page .add-student form { grid-template-columns: 1fr; } }
  @media (max-width: 600px) {
    .admin-page .admin-header { padding: 0 16px; gap: 12px; }
    .admin-page .admin-header .login-mark strong::after { font-size: 12px; white-space: nowrap; }
    .admin-page .admin-header .text-button { white-space: nowrap; }
    .admin-page .admin-header > div:last-child > span, .admin-page .adm-tabs a { display: none; }
    .admin-page .adm-tabs button { padding: 12px 10px; white-space: nowrap; }
    .admin-page .table-head { flex-wrap: wrap; gap: 4px; }
  }
  .admin-page :is(.add-student button, .adm-actions button, .adm-actions a, .adm-small) { border: 0; border-radius: 10px; background: var(--accent); color: var(--on-accent); padding: 10px 16px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap; }
  .admin-page :is(.add-student button, .adm-actions button, .adm-actions a, .adm-small):hover { background: var(--accent-hover); }
  .admin-page .adm-actions .adm-muted { background: var(--paper-2); color: var(--ink); }
  .admin-page .adm-actions .adm-muted:hover { background: var(--rule); }
  .admin-page .adm-actions .danger, .admin-page .danger { margin: 0; border: 1px solid #c0705a; background: transparent; color: var(--bad); border-radius: 10px; padding: 9px 14px; font-size: 15px; font-weight: 600; }
  .admin-page .adm-actions .danger:hover { background: #fbe4dc; }

  .admin-page .adm-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .admin-page .adm-filters button { border: 1px solid var(--rule); background: var(--card); color: var(--ink); border-radius: 999px; padding: 8px 14px; font-size: 14px; cursor: pointer; }
  .admin-page .adm-filters button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .admin-page .adm-table-wrap { overflow-x: auto; border: 1px solid var(--rule); border-radius: 14px; background: var(--card); }
  .admin-page .adm-table { width: 100%; border-collapse: collapse; font-size: 15px; color: var(--ink); }
  .admin-page .adm-table th { text-align: left; color: var(--muted); font-size: 12px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; padding: 12px 14px; border-bottom: 1px solid var(--rule); white-space: nowrap; }
  .admin-page .adm-table td { padding: 12px 14px; border-bottom: 1px solid var(--rule); vertical-align: top; }
  .admin-page .adm-table tr:last-child td { border-bottom: 0; }
  .admin-page .adm-table small { color: var(--muted); }
  .admin-page .adm-table code { color: var(--accent-ink); font-size: 14px; font-weight: 600; }
  .admin-page .adm-status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .admin-page .adm-status.pending { background: rgba(185, 138, 69, .18); color: #6f4812; }
  .admin-page .adm-status.paid { background: rgba(29, 107, 69, .12); color: var(--good); }
  .admin-page .adm-status.cancelled { background: var(--paper-2); color: var(--muted); }

  .admin-page .adm-box { border-radius: 14px; padding: 18px 20px; margin-bottom: 20px; }
  .admin-page .adm-success { background: #e7efe5; border: 1px solid #a9c7b0; color: var(--ink); }
  .admin-page .adm-success p { color: var(--muted); margin: 6px 0 10px; font-size: 15px; }
  .admin-page .adm-success pre { white-space: pre-wrap; background: var(--card); border: 1px solid var(--rule); padding: 12px; border-radius: 10px; font-size: 14px; color: var(--ink); margin: 0 0 12px; }

  .admin-page .adm-post-row { grid-template-columns: minmax(0, 1fr) auto; }
  .admin-page .adm-editor .detail-heading a { color: var(--accent-ink); font-size: 15px; font-weight: 600; }
  .admin-page .adm-fields { display: grid; gap: 14px; padding: 20px; }
  .admin-page .adm-fields label { display: grid; gap: 6px; font-size: 15px; font-weight: 600; color: var(--ink); }
  .admin-page .adm-fields small { color: var(--muted); font-weight: 400; }
  .admin-page .adm-fields .adm-check { display: flex; align-items: center; gap: 10px; }
  .admin-page .adm-fields .adm-check input { accent-color: var(--accent); width: 18px; height: 18px; }
  .admin-page .adm-fields code { color: var(--accent-ink); }
  .admin-page .adm-saved { color: var(--good); font-size: 14px; font-weight: 600; }
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
