import React, { useState } from 'react';
import { api } from '../api';

export function LoginPage({ onLogin }) {
  const [message, setMessage] = useState('');

  const submit = async event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    setMessage('');

    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password')
        })
      });

      localStorage.setItem('course-token', result.token);
      localStorage.setItem('course-user', JSON.stringify(result.user));
      onLogin(result.user);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <main className="login-page">
      <div className="login-glow login-glow-a"/>
      <div className="login-glow login-glow-b"/>

      <form className="login-form" onSubmit={submit}>
        <div className="login-mark">
          <span>KH</span>
          <strong>KHÓA HỌC</strong>
        </div>

        <p className="eyebrow">KHÓA HỌC: MERCHANDISING NGÀNH MAY</p>
        <p>Đăng nhập để tiếp tục hành trình học tập.</p>

        {message && <p className="notice">{message}</p>}

        <label>
          Email
          <input name="email" type="email" required/>
        </label>

        <label>
          Mật khẩu
          <input name="password" type="password" required/>
        </label>

        <button>
          Đăng nhập <b>→</b>
        </button>
      </form>
    </main>
  );
}
