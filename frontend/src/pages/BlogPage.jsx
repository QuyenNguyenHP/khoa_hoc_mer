import React, { useEffect, useState } from 'react';
import { SiteShell, go } from '../components/SiteShell';
import { RichText } from '../components/RichText';

export const formatDate = value => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function PostCard({ post }) {
  return <a className="s-post-card" href={`#blog/${post.slug}`} onClick={() => window.scrollTo(0, 0)}>
    <span className="s-post-meta">{post.category} · {formatDate(post.createdAt)}</span>
    <h3>{post.title}</h3>
    <p>{post.excerpt}</p>
    <span className="s-more">Đọc bài →</span>
  </a>;
}

// Routes: #blog (list) and #blog/<slug> (one post).
export function BlogPage({ user, slug }) {
  return <SiteShell user={user} active="blog">{openRegister => slug ? <BlogPost slug={slug} openRegister={openRegister}/> : <BlogList/>}</SiteShell>;
}

function BlogList() {
  const [posts, setPosts] = useState(null); const [category, setCategory] = useState('');
  useEffect(() => { fetch('/api/blog').then(response => response.json()).then(list => setPosts(Array.isArray(list) ? list : [])).catch(() => setPosts([])); }, []);
  const categories = [...new Set((posts || []).map(post => post.category).filter(Boolean))];
  const shown = (posts || []).filter(post => !category || post.category === category);
  return <>
    <section className="s-blog-hero"><div className="s-wrap"><p className="s-tag">Blog</p><h1>Kiến thức nghề <em>Merchandiser</em></h1><p>Quy trình, thuật ngữ và kinh nghiệm làm việc trong ngành may mặc xuất khẩu.</p></div></section>
    <section className="s-section" style={{ paddingTop: 48 }}>
      <div className="s-wrap">
        {categories.length > 1 && <div className="s-filters" role="group" aria-label="Lọc theo chủ đề">
          <button className={!category ? 's-on' : ''} onClick={() => setCategory('')}>Tất cả</button>
          {categories.map(item => <button key={item} className={category === item ? 's-on' : ''} onClick={() => setCategory(item)}>{item}</button>)}
        </div>}
        {posts === null ? <p className="s-empty">Đang tải bài viết…</p> : shown.length ? <div className="s-posts">{shown.map(post => <PostCard post={post} key={post.id}/>)}</div> : <p className="s-empty">Chưa có bài viết nào.</p>}
      </div>
    </section>
  </>;
}

function BlogPost({ slug, openRegister }) {
  const [post, setPost] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    setPost(null); setError('');
    fetch(`/api/blog/${encodeURIComponent(slug)}`).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setPost(data); }).catch(problem => setError(problem.message || 'Không tải được bài viết.'));
  }, [slug]);
  useEffect(() => { if (post) document.title = `${post.title} · Merchandising ngành may`; return () => { document.title = 'Khóa học: Merchandising ngành may'; }; }, [post]);

  return <div className="s-wrap"><article className="s-article">
    <button className="s-back" onClick={() => go('#blog')}>← Tất cả bài viết</button>
    {error ? <p className="s-empty">{error}</p> : !post ? <p className="s-empty">Đang tải bài viết…</p> : <>
      <span className="s-post-meta">{post.category} · {formatDate(post.createdAt)}</span>
      <h1>{post.title}</h1>
      {post.excerpt && <p className="s-lead">{post.excerpt}</p>}
      <RichText text={post.content}/>
      <div className="s-article-cta">
        <p>Muốn học bài bản cả quy trình? Khóa học 10 buổi Merchandising ngành may.</p>
        <span className="s-hero-actions"><a className="s-btn s-btn-line" href="#gioi-thieu">Xem khóa học</a><button className="s-btn s-btn-primary" onClick={openRegister}>Đăng ký học</button></span>
      </div>
    </>}
  </article></div>;
}
