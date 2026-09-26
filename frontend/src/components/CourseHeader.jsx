import React from 'react';

export function CourseHeader({ onBack }) {
  return <header className="course-header">
    <button className="back-button" onClick={onBack}>← Quay lại lớp học</button>
    <div className="lesson-brand"><img src="/mina.png" alt="Logo Khóa học Merchandising ngành may"/>Khóa học: Merchandising ngành may</div>
  </header>;
}
