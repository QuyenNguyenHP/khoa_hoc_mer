import React from 'react';
import baseStyles from '../styles.css?raw';
import learningStyles from '../learning.css?raw';
import videoStyles from '../video.css?raw';
import adminStyles from '../admin.css?raw';
import themeStyles from '../theme.css?raw';
import lessonStyles from '../lesson.css?raw';
import lessonLayoutStyles from '../lesson-layout.css?raw';

// CSS is injected by React so all application styling has one JSX entry point.
export function AppStyles() {
  return <style>{`${baseStyles}\n${learningStyles}\n${videoStyles}\n${adminStyles}\n${themeStyles}\n${lessonStyles}\n${lessonLayoutStyles}`}</style>;
}
