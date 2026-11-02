import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';

// Crops the picked photo to a centred square and shrinks it to 256px JPEG before upload.
function toSquareJpeg(file) {
  return new Promise((resolve, reject) => {
    const image = new Image(); const url = URL.createObjectURL(file);
    image.onload = () => {
      const side = Math.min(image.width, image.height); const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      canvas.getContext('2d').drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
      URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này. Hãy chọn ảnh JPG hoặc PNG.')); };
    image.src = url;
  });
}

export function Avatar({ name, avatar }) {
  return avatar ? <img src={avatar} alt=""/> : <>{String(name || '?').slice(0, 2).toUpperCase()}</>;
}

// Profile button with a menu: change photo, change password, sign out.
export function AccountMenu({ student, onAvatarChange, logout }) {
  const [open, setOpen] = useState(false); const [dialog, setDialog] = useState(false); const [notice, setNotice] = useState('');
  const box = useRef(null); const fileInput = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (event.type === 'keydown' ? event.key === 'Escape' : !box.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  useEffect(() => { if (!notice) return undefined; const timer = setTimeout(() => setNotice(''), 3000); return () => clearTimeout(timer); }, [notice]);

  const pickPhoto = async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try {
      const { avatar } = await api('/api/account/avatar', { method: 'POST', body: JSON.stringify({ dataUrl: await toSquareJpeg(file) }) });
      onAvatarChange(avatar); setNotice('Đã cập nhật ảnh đại diện.');
    } catch (error) { setNotice(error.message); }
  };

  return <div className="account" ref={box}>
    <button className="profile" title={student.name} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Avatar name={student.name} avatar={student.avatar}/>
    </button>
    {open && <div className="account-menu" role="menu">
      <div className="account-who"><strong>{student.name}</strong><small>{student.email}</small></div>
      <button role="menuitem" onClick={() => { setOpen(false); fileInput.current.click(); }}>Đổi ảnh đại diện</button>
      <button role="menuitem" onClick={() => { setOpen(false); setDialog(true); }}>Đổi mật khẩu</button>
      <button role="menuitem" className="account-logout" onClick={logout}>Đăng xuất</button>
    </div>}
    <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickPhoto}/>
    {notice && <p className="account-notice" role="status">{notice}</p>}
    {dialog && <PasswordDialog onClose={() => setDialog(false)} onDone={() => { setDialog(false); setNotice('Đã đổi mật khẩu.'); }}/>}
  </div>;
}

function PasswordDialog({ onClose, onDone }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const field = name => event => setForm({ ...form, [name]: event.target.value });
  useEffect(() => { const onKey = event => { if (event.key === 'Escape') onClose(); }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [onClose]);
  const submit = async event => {
    event.preventDefault(); setError('');
    if (form.newPassword.length < 8) return setError('Mật khẩu mới cần ít nhất 8 ký tự.');
    if (form.newPassword !== form.confirm) return setError('Hai lần nhập mật khẩu mới chưa khớp.');
    setBusy(true);
    try { await api('/api/account/password', { method: 'PUT', body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) }); onDone(); }
    catch (problem) { setError(problem.message); setBusy(false); }
  };
  return <div className="account-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="pw-title" onSubmit={submit}>
      <h2 id="pw-title">Đổi mật khẩu</h2>
      <label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" value={form.currentPassword} onChange={field('currentPassword')} required autoFocus/></label>
      <label>Mật khẩu mới <small>(ít nhất 8 ký tự)</small><input type="password" autoComplete="new-password" value={form.newPassword} onChange={field('newPassword')} required minLength={8}/></label>
      <label>Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" value={form.confirm} onChange={field('confirm')} required/></label>
      {error && <p className="notice">{error}</p>}
      <div className="account-actions"><button type="button" className="account-cancel" onClick={onClose}>Hủy</button><button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu mật khẩu'}</button></div>
    </form>
  </div>;
}
