import React from 'react';
import { FocusLesson } from '../components/FocusLesson';

// Route: #lesson-1 … #lesson-10
export function LearningPage({ lessonId, onBack }) {
  return <FocusLesson lessonId={lessonId} onBack={onBack}/>;
}
