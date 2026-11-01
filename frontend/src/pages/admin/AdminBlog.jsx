import React, { useEffect, useState } from 'react';
import { api } from '../../api';

const EMPTY = { title: '', category: 'Kiến thức nghề', excerpt: '', content: '', published: false };

export function AdminBlog() {
  const [posts, setPosts] = useState(null); const [editing, setEditing] = useState(EMPTY); const [message, setMessage] = useState(''); const [saved, setSaved] = useState('');
  const load = async selectId => {
    try { const list = await api('/api/admin/blog'); setPosts(list); if (selectId) setEditing(list.find(post => post.id === selectId) || EMPTY); } catch (error) { setMessage(error.message); }
  };
  useEffect(() => { load(); }, []);
  const field = name => event => setEditing(current => ({ ...current, [name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const save = async event => {
    event.preventDefault(); setMessage('');
    const payload = { title: editing.title, category: editing.category, excerpt: editing.excerpt, content: editing.content, published: editing.published };
    try {
      const post = editing.id ? await api(`/api/admin/blog/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) }) : await api('/api/admin/blog', { method: 'POST', body: JSON.stringify(payload) });
      await load(post.id); setSaved(post.published ? 'Đã lưu và đăng bài.' : 'Đã lưu bản nháp.'); setTimeout(() => setSaved(''), 2500);
    } catch (error) { setMessage(error.message); }
  };
  const remove = async () => {
    if (!editing.id || !window.confirm(`Xóa bài “${editing.title}”? Không thể hoàn tác.`)) return;
    try { await api(`/api/admin/blog/${editing.id}`, { method: 'DELETE' }); setEditing(EMPTY); load(); } catch (error) { setMessage(error.message); }
  };

  if (!posts) return <p className="editor-note">{message || 'Đang tải bài viết…'}</p>;
  return <div className="admin-grid">
    <section className="student-table">
      <div className="table-head"><strong>Bài viết ({posts.length})</strong><button className="adm-small" onClick={() => { setEditing(EMPTY); setMessage(''); }}>+ Bài mới</button></div>
      {posts.length ? posts.map(post => <button key={post.id} className={`student-row adm-post-row ${editing.id === post.id ? 'selected-row' : ''}`} onClick={() => { setEditing(post); setMessage(''); }}>
        <span><strong>{post.title}</strong><small>{post.category} · {new Date(post.createdAt).toLocaleDateString('vi-VN')}</small></span>
        <span className={`adm-status ${post.published ? 'paid' : 'pending'}`}>{post.published ? 'Đã đăng' : 'Nháp'}</span>
      </button>) : <p className="editor-note" style={{ padding: 20 }}>Chưa có bài viết.</p>}
    </section>
    <form className="admin-detail adm-editor" onSubmit={save}>
      <div className="detail-heading"><h2>{editing.id ? 'Sửa bài viết' : 'Bài viết mới'}</h2>{editing.id && editing.published && <a href={`#blog/${editing.slug}`} target="_blank" rel="noreferrer">Xem bài ↗</a>}</div>
      <div className="adm-fields">
        {message && <p className="notice">{message}</p>}
        <label>Tiêu đề<input value={editing.title} onChange={field('title')} required maxLength={200}/></label>
        <label>Chủ đề<input value={editing.category} onChange={field('category')} list="blog-categories" maxLength={60}/></label>
        <datalist id="blog-categories"><option value="Kiến thức nghề"/><option value="Về khóa học"/><option value="Kinh nghiệm đi làm"/></datalist>
        <label>Tóm tắt <small>(hiện ở danh sách bài, để trống sẽ tự lấy đoạn đầu)</small><textarea rows="3" value={editing.excerpt} onChange={field('excerpt')} maxLength={300}/></label>
        <label>Nội dung<textarea rows="16" value={editing.content} onChange={field('content')} required/></label>
        <p className="editor-note">Cách viết: để một dòng trống giữa các đoạn. Dòng bắt đầu bằng <code>## </code> là tiêu đề mục, <code>### </code> là tiêu đề nhỏ, <code>- </code> là gạch đầu dòng.</p>
        <label className="adm-check"><input type="checkbox" checked={editing.published} onChange={field('published')}/>Đăng công khai trên blog</label>
        <div className="adm-actions"><button>{editing.id ? 'Lưu thay đổi' : 'Tạo bài viết'}</button>{editing.id && <button type="button" className="danger" onClick={remove}>Xóa bài</button>}{saved && <span className="adm-saved">{saved}</span>}</div>
      </div>
    </form>
  </div>;
}
