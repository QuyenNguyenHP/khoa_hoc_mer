import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../api';

const EMPTY = { title: '', category: 'Kiến thức nghề', excerpt: '', content: '', cover: '', published: false };

// Shrinks a picked photo to at most 1600px wide (JPEG) so covers stay light on phones.
function toCoverJpeg(file) {
  return new Promise((resolve, reject) => {
    const image = new Image(); const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1600 / image.width); const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này. Hãy chọn ảnh JPG, PNG hoặc WEBP.')); };
    image.src = url;
  });
}

export function AdminBlog() {
  const [posts, setPosts] = useState(null); const [editing, setEditing] = useState(EMPTY); const [message, setMessage] = useState(''); const [saved, setSaved] = useState(''); const [uploading, setUploading] = useState(false); const coverInput = useRef(null); const imageInput = useRef(null); const contentBox = useRef(null); const [inserting, setInserting] = useState(false);
  const load = async selectId => {
    try { const list = await api('/api/admin/blog'); setPosts(list); if (selectId) setEditing(list.find(post => post.id === selectId) || EMPTY); } catch (error) { setMessage(error.message); }
  };
  useEffect(() => { load(); }, []);
  const field = name => event => setEditing(current => ({ ...current, [name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const save = async event => {
    event.preventDefault(); setMessage('');
    const payload = { title: editing.title, category: editing.category, excerpt: editing.excerpt, content: editing.content, cover: editing.cover || '', published: editing.published };
    try {
      const post = editing.id ? await api(`/api/admin/blog/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) }) : await api('/api/admin/blog', { method: 'POST', body: JSON.stringify(payload) });
      await load(post.id); setSaved(post.published ? 'Đã lưu và đăng bài.' : 'Đã lưu bản nháp.'); setTimeout(() => setSaved(''), 2500);
    } catch (error) { setMessage(error.message); }
  };
  const pickCover = async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    setMessage(''); setUploading(true);
    try {
      const { url } = await api('/api/admin/blog-image', { method: 'POST', body: JSON.stringify({ filename: file.name, dataUrl: await toCoverJpeg(file) }) });
      setEditing(current => ({ ...current, cover: url }));
    } catch (error) { setMessage(error.message); }
    setUploading(false);
  };
  // Uploads an illustration and inserts "![caption](url)" as its own paragraph at the cursor.
  const insertImage = async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    setMessage(''); setInserting(true);
    try {
      const { url } = await api('/api/admin/blog-image', { method: 'POST', body: JSON.stringify({ filename: file.name, dataUrl: await toCoverJpeg(file) }) });
      const box = contentBox.current; const at = box ? box.selectionStart : editing.content.length;
      setEditing(current => {
        const before = current.content.slice(0, at).replace(/\s*$/, ''); const after = current.content.slice(at).replace(/^\s*/, '');
        return { ...current, content: `${before}${before ? '\n\n' : ''}![Mô tả ảnh](${url})${after ? '\n\n' : ''}${after}` };
      });
    } catch (error) { setMessage(error.message); }
    setInserting(false);
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
        <div className="adm-cover">
          <span className="adm-cover-label">Ảnh bìa <small>(tỉ lệ 16:9, ví dụ 1600×900)</small></span>
          {editing.cover ? <img src={editing.cover} alt="Ảnh bìa"/> : <div className="adm-cover-empty">Chưa có ảnh bìa</div>}
          <div className="adm-cover-actions">
            <button type="button" className="adm-small" disabled={uploading} onClick={() => coverInput.current.click()}>{uploading ? 'Đang tải ảnh…' : editing.cover ? 'Đổi ảnh' : 'Tải ảnh lên'}</button>
            {editing.cover && !uploading && <button type="button" className="adm-link" onClick={() => setEditing(current => ({ ...current, cover: '' }))}>Gỡ ảnh</button>}
          </div>
          <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickCover}/>
          {editing.id && <small className="adm-cover-hint">Bấm “Lưu thay đổi” để áp dụng ảnh mới.</small>}
        </div>
        <label>Tiêu đề<input value={editing.title} onChange={field('title')} required maxLength={200}/></label>
        <label>Chủ đề<input value={editing.category} onChange={field('category')} maxLength={60} autoComplete="off"/></label>
        <label>Tóm tắt <small>(hiện ở danh sách bài, để trống sẽ tự lấy đoạn đầu)</small><textarea rows="3" value={editing.excerpt} onChange={field('excerpt')} maxLength={300}/></label>
        <label>Nội dung<textarea ref={contentBox} rows="16" value={editing.content} onChange={field('content')} required/></label>
        <div className="adm-cover-actions">
          <button type="button" className="adm-small" disabled={inserting} onClick={() => imageInput.current.click()}>{inserting ? 'Đang tải ảnh…' : '+ Chèn ảnh vào nội dung'}</button>
          <small className="adm-cover-hint">Ảnh được chèn tại vị trí con trỏ. Sửa chữ “Mô tả ảnh” thành chú thích.</small>
        </div>
        <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={insertImage}/>
        <p className="editor-note">Cách viết: để một dòng trống giữa các đoạn. Dòng bắt đầu bằng <code>## </code> là tiêu đề mục, <code>### </code> là tiêu đề nhỏ, <code>- </code> là gạch đầu dòng, <code>1. </code> là danh sách đánh số, <code>&gt; </code> là khung ghi chú, <code>**chữ**</code> là chữ đậm, một dòng riêng <code>![chú thích](đường dẫn ảnh)</code> là ảnh minh họa.</p>
        <label className="adm-check"><input type="checkbox" checked={editing.published} onChange={field('published')}/>Đăng công khai trên blog</label>
        <div className="adm-actions"><button>{editing.id ? 'Lưu thay đổi' : 'Tạo bài viết'}</button>{editing.id && <button type="button" className="danger" onClick={remove}>Xóa bài</button>}{saved && <span className="adm-saved">{saved}</span>}</div>
      </div>
    </form>
  </div>;
}
