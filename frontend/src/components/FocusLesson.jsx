import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { CourseFooter } from './CourseFooter';
import { CourseHeader } from './CourseHeader';

const RAIL_TABS = [
  ['notes', 'Ghi chú'],
  ['question', 'Hỏi giảng viên'],
  ['resources', 'Tài liệu']
];

const FOCUS_LESSON_STYLES = `
  .focus-layout { margin-top: 14px; column-gap: 20px; }
  .focus-main {
    margin: 8px;
    padding: 28px clamp(24px, 4vw, 60px) 60px !important;
    border: 1px solid rgba(105, 201, 255, 0.18);
    border-radius: 18px;
    background: #09172b;
  }
  .vocabulary-list, .quiz-list { display: grid; gap: 10px; margin-top: 16px; }
  .vocabulary-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .vocabulary-list div, .quiz-question { padding: 14px; border-radius: 10px; background: #102641; }
  .vocabulary-list b { display: block; color: #69c9ff; margin-bottom: 5px; }
  .vocabulary-list small { display: block; margin: -2px 0 6px; color: #8ca1b7; font-style: italic; }
  .quiz-question p { margin: 0 0 10px; color: #fff; font-weight: 700; }
  .quiz-question label { display: block; margin: 7px 0; color: #c4d4e0; font-size: 12px; }
  .quiz-question input { margin-right: 8px; }
  .quiz-question label.quiz-correct { padding: 7px 9px; border-radius: 7px; background: rgba(73, 194, 132, 0.18); color: #8ce6b8; }
  .quiz-question label.quiz-wrong { padding: 7px 9px; border-radius: 7px; background: rgba(244, 73, 17, 0.14); color: #ffb09a; }
  .quiz-submit { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 18px; padding: 14px; border-radius: 10px; background: #102641; }
  .quiz-submit strong { color: #8ce6b8; font-size: 13px; }
  .quiz-submit button { border: 0; border-radius: 8px; background: #f44911; color: #fff; padding: 10px 14px; font-weight: 700; cursor: pointer; }
  .focus-rail section > small + p { margin-top: 18px; line-height: 1.7; }
  .activity-toggle { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; width: 100%; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
  .activity-toggle-icon { display: grid; place-items: center; flex: 0 0 28px; height: 28px; border-radius: 50%; background: #102641; color: #69c9ff; font-size: 16px; }
  .lesson-summary { margin-top: 18px; padding: 20px; border: 1px solid rgba(105, 201, 255, 0.16); border-radius: 14px; background: #0b1930; }
  .lesson-summary h2 { margin: 5px 0 8px; color: #fff; font-size: 16px; }
  .lesson-summary p { margin: 0; color: #c4d4e0; font-size: 13px; line-height: 1.55; }
  .video-topics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
  .video-topics span { padding: 10px; border-radius: 8px; background: #102641; color: #c4d4e0; font-size: 12px; }
  .video-topics b { margin-right: 7px; color: #f44911; }
  @media (max-width: 720px) { .video-topics { grid-template-columns: 1fr; } }
  @media (max-width: 720px) { .vocabulary-list { grid-template-columns: 1fr; } }
  @media (max-width: 720px) { .focus-main { margin: 12px; padding: 24px 16px 40px !important; border-radius: 14px; } }
  @media (min-width: 1101px) {
    .focus-layout { align-items: start; }
    .focus-sidebar {
      position: sticky !important;
      top: 50vh !important;
      transform: translateY(-50%);
      min-height: 620px;
      max-height: calc(100vh - 32px);
      border: 1px solid rgba(105, 201, 255, 0.18);
      border-radius: 18px;
      overflow-y: auto;
    }
    .focus-rail {
      position: sticky !important;
      top: 50vh !important;
      transform: translateY(-50%);
      min-height: 620px;
      max-height: calc(100vh - 32px);
      border: 1px solid rgba(105, 201, 255, 0.18);
      border-radius: 18px;
      overflow-y: auto;
    }
    .focus-rail textarea { min-height: 500px; }
    .focus-rail .rail-file {
      margin-top: 12px;
      padding: 14px;
    }
    .focus-rail section > small + .rail-file { margin-top: 18px; }
  }
`;

export function FocusLesson({ lessonId, onBack }) {
  const [course, setCourse] = useState(null);
  const [detail, setDetail] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [tab, setTab] = useState('notes');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [question, setQuestion] = useState('');
  const [questionStatus, setQuestionStatus] = useState('');
  const [answers, setAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [vocabularyOpen, setVocabularyOpen] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api('/api/course'),
      api(`/api/lessons/${lessonId}`),
      api(`/api/lessons/${lessonId}/playback`, { method: 'POST' })
    ]).then(([nextCourse, nextDetail, playback]) => {
      setCourse(nextCourse);
      setDetail(nextDetail);
      setNote(nextDetail.note);
      setVideoUrl(playback.url);
    });
  }, [lessonId]);

  useEffect(() => {
    if (!detail) return undefined;

    const timeoutId = setTimeout(() => {
      api(`/api/lessons/${lessonId}/note`, {
        method: 'PUT',
        body: JSON.stringify({ note })
      }).then(() => setStatus('Đã tự lưu'));
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [detail, lessonId, note]);

  const openLesson = nextLessonId => {
    window.location.hash = `lesson-${nextLessonId}`;
  };

  const completeLesson = async () => {
    await api(`/api/lessons/${lessonId}/complete`, { method: 'POST' });
    if (lessonId < 10) openLesson(lessonId + 1);
  };

  const submitQuestion = async () => {
    try {
      await api(`/api/lessons/${lessonId}/questions`, { method: 'POST', body: JSON.stringify({ text: question }) });
      setQuestion('');
      setQuestionStatus('Đã gửi câu hỏi cho giảng viên.');
    } catch (error) { setQuestionStatus(error.message); }
  };

  if (!course || !detail) {
    return <main className="lesson-page loading">Đang mở bài học...</main>;
  }

  const { lesson, materials } = detail;
  const nextLesson = course.lessons[lessonId];
  const quizScore = lesson.quiz.questions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0);

  return (
    <main className="focus-page">
      <style>{FOCUS_LESSON_STYLES}</style>
      <CourseHeader onBack={onBack}/>

      <div className="focus-layout">
        <aside className="focus-sidebar">
          <div className="sidebar-progress">
            <small>LỘ TRÌNH KHÓA HỌC</small>
            <strong>{course.progress}% hoàn thành</strong>
            <i><b style={{ width: `${course.progress}%` }}/></i>
          </div>

          {course.lessons.map(item => (
            <button
              className={`focus-lesson ${item.id === lessonId ? 'active' : ''}`}
              disabled={!item.unlocked}
              key={item.id}
              onClick={() => openLesson(item.id)}
            >
              <em>{item.completed ? '✓' : String(item.id).padStart(2, '0')}</em>
              <span>
                {item.title.replace(/^Buổi \d+: /, '')}
                <small>
                  {item.id === lessonId ? 'Video · Hoạt động' : item.completed ? 'Đã hoàn thành' : item.unlocked ? 'Sẵn sàng' : 'Đang khóa'}
                </small>
              </span>
            </button>
          ))}

        </aside>

        <section className="focus-main">
          <header>
            <p>BUỔI {String(lessonId).padStart(2, '0')} · {lesson.duration}</p>
            <h1>{lesson.title}</h1>
          </header>

          <section className="focus-video">
            <div>
              <b>01</b>
              <strong>Video bài học</strong>
              <small>Ưu tiên xem xong video trước khi thực hành</small>
            </div>
            <video className="portrait-video" controls controlsList="nodownload" disablePictureInPicture src={videoUrl}/>
          </section>

          <section className="lesson-summary">
            <small> 🎯 MỤC TIÊU BÀI HỌC</small>
            <h2>{lesson.objective}</h2>
            <p>📚 Nội dung chính</p>
            <div className="video-topics">
              {lesson.topics.map((topic, index) => <span key={topic}><b>0{index + 1}</b>{topic}</span>)}
            </div>
          </section>

          <section className="activity">
            <button className="activity-toggle" onClick={() => setVocabularyOpen(open => !open)}>
              <div><small>02 · TỪ VỰNG TIẾNG ANH</small><h2>Từ vựng trọng tâm</h2><p>Ôn các thuật ngữ cần dùng trong bài học này.</p></div>
              <span className="activity-toggle-icon">{vocabularyOpen ? '⌃' : '⌄'}</span>
            </button>
            {vocabularyOpen && <div className="vocabulary-list">{lesson.vocabulary.map(item => <div key={item.term}><b>{item.term}</b>{item.ipa && <small>{item.ipa}</small>}<span>{item.meaning}</span></div>)}</div>}
          </section>

          <section className="activity">
            <button className="activity-toggle" onClick={() => setQuizOpen(open => !open)}>
              <div><small>03 · TRẮC NGHIỆM</small><h2>{lesson.quiz.title} · 20 câu</h2><p>Chọn một đáp án cho mỗi câu hỏi.</p></div>
              <span className="activity-toggle-icon">{quizOpen ? '⌃' : '⌄'}</span>
            </button>
            {quizOpen && <div className="quiz-list">
              {lesson.quiz.questions.map((question, questionIndex) => (
                <div className="quiz-question" key={question.question}>
                  <p>{questionIndex + 1}. {question.question}</p>
                  {question.options.map((option, optionIndex) => (
                    <label className={quizSubmitted ? (optionIndex === question.answer ? 'quiz-correct' : answers[questionIndex] === optionIndex ? 'quiz-wrong' : '') : ''} key={option}>
                      <input checked={answers[questionIndex] === optionIndex} name={`question-${questionIndex}`} onChange={() => { setAnswers({ ...answers, [questionIndex]: optionIndex }); setQuizSubmitted(false); }} type="radio"/>
                      {option}
                    </label>
                  ))}
                </div>
              ))}
              <div className="quiz-submit">
                <div>{quizSubmitted ? <strong>Kết quả: {quizScore}/20 câu đúng</strong> : <span>Đã trả lời {Object.keys(answers).length}/20 câu</span>}</div>
                <button onClick={() => setQuizSubmitted(true)}>{quizSubmitted ? 'Đã chấm bài' : 'Nộp bài & xem kết quả'}</button>
              </div>
            </div>}
          </section>

          <section className="next-lesson">
            <div>
              <small>{status || 'SẴN SÀNG ĐI TIẾP?'}</small>
              <strong>{lessonId < 10 ? `Tiếp theo: ${nextLesson?.title}` : 'Bạn đã hoàn thành khóa học!'}</strong>
            </div>
            <button onClick={completeLesson}>Hoàn thành {lessonId < 10 ? '& học tiếp →' : 'khóa học ✓'}</button>
          </section>
        </section>

        <aside className="focus-rail">
          <nav>
            {RAIL_TABS.map(([key, label]) => (
              <button className={tab === key ? 'selected' : ''} key={key} onClick={() => setTab(key)}>{label}</button>
            ))}
          </nav>

          {tab === 'notes' && <section><small>GHI CHÚ CỦA TÔI</small><textarea value={note} onChange={event => { setNote(event.target.value); setStatus('Đang lưu…'); }} placeholder="Ghi lại điều quan trọng trong bài học…"/><p>{status || 'Tự động lưu khi bạn viết'}</p></section>}

          {tab === 'question' && <section id="question"><small>HỎI GIẢNG VIÊN</small><h3>Gửi câu hỏi về bài học</h3><textarea value={question} onChange={event => setQuestion(event.target.value)} placeholder="Bạn đang vướng ở đâu?"/><button onClick={submitQuestion}>Gửi câu hỏi</button>{questionStatus && <p>{questionStatus}</p>}</section>}

          {tab === 'resources' && <section><small>TÀI LIỆU BÀI HỌC</small>{materials.length ? materials.map(material => <a className="rail-file" download href={material.url} key={material.name}>{material.label} ↓</a>) : <p>Không có tài liệu bổ sung cho buổi này.</p>}</section>}
        </aside>
      </div>

      <CourseFooter/>
    </main>
  );
}
