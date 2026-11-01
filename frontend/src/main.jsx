import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppStyles } from './components/AppStyles';
import { MainPage } from './pages/MainPage';
import { LearningPage } from './pages/LearningPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { LandingPage } from './pages/LandingPage';
import { BlogPage } from './pages/BlogPage';

// Hash routes
//   (empty) / #gioi-thieu  sales page (logged-in students land on their class instead of the empty hash)
//   #blog, #blog/<slug>    blog
//   #dang-nhap             login
//   #lop-hoc               student dashboard
//   #lesson-<n>            lesson player
//   #quan-tri              admin
function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('course-user')); } catch { return null; } });
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => { const update = () => setRoute(window.location.hash); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);

  const logout = () => { localStorage.removeItem('course-token'); localStorage.removeItem('course-user'); setUser(null); window.location.hash = ''; };
  const login = nextUser => { setUser(nextUser); window.location.hash = nextUser.role === 'admin' ? '#quan-tri' : '#lop-hoc'; };

  if (route === '#blog' || route.startsWith('#blog/')) return <BlogPage user={user} slug={decodeURIComponent(route.slice(6))}/>;
  if (route === '#gioi-thieu') return <LandingPage user={user}/>;

  const lessonId = Number(route.replace('#lesson-', ''));
  const wantsPrivatePage = route === '#dang-nhap' || route === '#lop-hoc' || route === '#quan-tri' || route.startsWith('#lesson-');
  if (!user) return wantsPrivatePage ? <LoginPage onLogin={login}/> : <LandingPage user={null}/>;
  if (user.role === 'admin') return <AdminPage user={user} logout={logout}/>;
  if (lessonId >= 1 && lessonId <= 10) return <LearningPage lessonId={lessonId} onBack={() => { window.location.hash = '#lop-hoc'; }}/>;
  return <MainPage logout={logout}/>;
}

createRoot(document.getElementById('root')).render(<><AppStyles/><App/></>);
