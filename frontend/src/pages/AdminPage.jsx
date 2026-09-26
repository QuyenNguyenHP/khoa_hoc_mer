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
`;

export function AdminPage({ user, logout }) {
  const [data, setData] = useState(null); const [selected, setSelected] = useState(null); const [message, setMessage] = useState('');
  const load = async () => { try { const next = await api('/api/admin/students'); setData(next); setSelected(current => next.students.find(item => item.id === current?.id) || next.students[0] || null); } catch (error) { setMessage(error.message); } };
  useEffect(() => { load(); }, []);
  const addStudent = async event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await api('/api/admin/students', { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password'), role: form.get('role') }) }); event.currentTarget.reset(); load(); } catch (error) { setMessage(error.message); } };
  if (!data) return <main className="loading">Đang tải quản trị lớp học...</main>;
  return <main className="admin-page"><style>{ADMIN_PAGE_STYLES}</style><header className="admin-header"><div className="login-mark"><span>KH</span><strong>KHÓA HỌC / QUẢN TRỊ</strong></div><div><span>{user.name}</span><button className="text-button" onClick={logout}>Đăng xuất</button></div></header><section className="admin-content">{message && <p className="notice">{message}</p>}<div className="admin-grid"><section className="student-table"><div className="table-head"><strong>Danh sách học viên</strong><small>Chọn một dòng để xem câu hỏi</small></div>{data.students.map(student => <button className={`student-row ${selected?.id === student.id ? 'selected-row' : ''}`} key={student.id} onClick={() => setSelected(student)}><span className="avatar">{student.name.slice(0, 2).toUpperCase()}</span><span><strong>{student.name}</strong><small>{student.email}</small></span><span className="admin-progress"><i style={{ width: `${student.progress}%` }}/><small>{student.completedLessons.length}/10</small></span></button>)}</section><aside className="admin-detail">{selected && <><div className="detail-heading"><h2>{selected.name}</h2></div><div className="lesson-editor"><p className="eyebrow">CÂU HỎI TỪ HỌC VIÊN</p>{selected.questions?.length ? selected.questions.map(item => <article className="admin-question" key={item.id}><strong>Bài {item.lessonId}</strong><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></article>) : <p className="editor-note">Học viên chưa gửi câu hỏi.</p>}</div></>}</aside></div><section className="add-student"><div><p className="eyebrow">THÊM TÀI KHOẢN</p><h2>Tạo học viên hoặc quản trị viên</h2></div><form onSubmit={addStudent}><input name="name" placeholder="Họ và tên" required/><input name="email" type="email" placeholder="Email" required/><input name="password" type="password" placeholder="Mật khẩu ban đầu" required/><select name="role" defaultValue="student"><option value="student">Học viên</option><option value="admin">Quản trị viên</option></select><button>Tạo tài khoản</button></form></section></section></main>;
}
