import React from 'react';

// Renders blog content written in a tiny Markdown subset:
//   "## Heading", "### Sub heading", "- list item", "1. numbered item",
//   "> tip", "**bold**", "![caption](image url)" on its own paragraph,
//   blank line = new paragraph.
// Text is rendered by React (escaped), so posts cannot inject HTML.
const IMAGE = /^!\[([^\]]*)\]\((\S+)\)$/;
// Only images uploaded to this site or served over HTTPS.
const safeImage = url => /^\/api\/blog-images\/[\w.-]+$/.test(url) || /^https:\/\/\S+$/.test(url);

function inline(text) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={index}>{part.slice(2, -2)}</strong> : part);
}

export function RichText({ text }) {
  const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  return <div className="s-prose">{blocks.map((block, index) => {
    const image = IMAGE.exec(block);
    if (image && safeImage(image[2])) return <figure key={index}><img src={image[2]} alt={image[1]} loading="lazy"/>{image[1] && <figcaption>{image[1]}</figcaption>}</figure>;
    if (block.startsWith('### ')) return <h3 key={index}>{inline(block.slice(4))}</h3>;
    if (block.startsWith('## ')) return <h2 key={index}>{inline(block.slice(3))}</h2>;
    const lines = block.split('\n').map(line => line.trim());
    if (lines.every(line => line.startsWith('- '))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{inline(line.slice(2))}</li>)}</ul>;
    if (lines.every(line => /^\d+\.\s/.test(line))) return <ol key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\d+\.\s/, ''))}</li>)}</ol>;
    if (lines.every(line => line.startsWith('>'))) return <blockquote key={index}>{lines.map((line, i) => <React.Fragment key={i}>{i > 0 && <br/>}{inline(line.replace(/^>\s?/, ''))}</React.Fragment>)}</blockquote>;
    return <p key={index}>{lines.map((line, i) => <React.Fragment key={i}>{i > 0 && <br/>}{inline(line)}</React.Fragment>)}</p>;
  })}</div>;
}
