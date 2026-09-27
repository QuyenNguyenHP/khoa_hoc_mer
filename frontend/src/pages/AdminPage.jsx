import React, { useEffect, useState } from 'react';
import { api } from '../api';

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
  .admin-page .lesson-editor select { width: 100%; margin: 8px 0 20px; background: #071426; border: 1px solid rgba(255,255,255,.16); border-radius: 5px; padding: 10px; color: #fff; }
`;

export function AdminPage({ user, logout }) {
  const [data, setData] = useState(null); const [selected, setSelected] = useState(null); const [message, setMessage] = useState('');
  const load = async () => { try { const next = await api('/api/admin/students'); const accounts = next.accounts || next.students; setData(next); setSelected(current => accounts.find(item => item.id === current?.id) || accounts[0] || null); } catch (error) { setMessage(error.message); } };
  useEffect(() => { load(); }, []);
  const addStudent = async event => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); try { await api('/api/admin/students', { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password'), role: form.get('role') }) }); formElement.reset(); load(); } catch (error) { setMessage(error.message); } };
  const changeRole = async event => { try { const updated = await api(`/api/admin/accounts/${selected.id}/role`, { method: 'PUT', body: JSON.stringify({ role: event.target.value }) }); setSelected(updated); load(); } catch (error) { setMessage(error.message); } };
  if (!data) return <main className="loading">Đang tải quản trị lớp học...</main>;
  return <main className="admin-page"><style>{ADMIN_PAGE_STYLES}</style><header className="admin-header"><div className="login-mark"><span>KH</span><strong>KHÓA HỌC / QUẢN TRỊ</strong></div><div><span>{user.name}</span><button className="text-button" onClick={logout}>Đăng xuất</button></div></header><section className="admin-content">{message && <p className="notice">{message}</p>}<div className="admin-grid"><section className="student-table"><div className="table-head"><strong>Danh sách tài khoản</strong><small>Chọn một dòng để xem câu hỏi</small></div>{(data.accounts || data.students).map(account => <button className={`student-row ${selected?.id === account.id ? 'selected-row' : ''}`} key={account.id} onClick={() => setSelected(account)}><span className="avatar">{account.name.slice(0, 2).toUpperCase()}</span><span><strong>{account.name}</strong><small>{account.email} · {account.role === 'admin' ? 'Quản trị viên' : 'Học viên'}</small></span><span className="admin-progress"><i style={{ width: `${account.progress}%` }}/><small>{account.role === 'admin' ? 'Admin' : `${account.completedLessons.length}/10`}</small></span></button>)}</section><aside className="admin-detail">{selected && <><div className="detail-heading"><h2>{selected.name}</h2></div><div className="lesson-editor"><p className="eyebrow">VAI TRÒ TÀI KHOẢN</p><select value={selected.role} onChange={changeRole}><option value="student">Học viên</option><option value="admin">Quản trị viên</option></select><p className="eyebrow">CÂU HỎI TỪ HỌC VIÊN</p>{selected.questions?.length ? selected.questions.map(item => <article className="admin-question" key={item.id}><strong>Bài {item.lessonId}</strong><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></article>) : <p className="editor-note">{selected.role === 'admin' ? 'Đây là tài khoản quản trị viên.' : 'Học viên chưa gửi câu hỏi.'}</p>}</div></>}</aside></div><section className="add-student"><div><p className="eyebrow">THÊM TÀI KHOẢN</p><h2>Tạo học viên hoặc quản trị viên</h2></div><form onSubmit={addStudent}><input name="name" placeholder="Họ và tên" required/><input name="email" type="email" placeholder="Email" required/><input name="password" type="password" placeholder="Mật khẩu ban đầu" required/><select name="role" defaultValue="student"><option value="student">Học viên</option><option value="admin">Quản trị viên</option></select><button>Tạo tài khoản</button></form></section></section></main>;
}
