import React from 'react';

// Renders blog content written in a tiny Markdown subset:
//   "## Heading", "### Sub heading", "- list item", blank line = new paragraph.
// Text is rendered by React (escaped), so posts cannot inject HTML.
export function RichText({ text }) {
  const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  return <div className="s-prose">{blocks.map((block, index) => {
    if (block.startsWith('### ')) return <h3 key={index}>{block.slice(4)}</h3>;
    if (block.startsWith('## ')) return <h2 key={index}>{block.slice(3)}</h2>;
    const lines = block.split('\n');
    if (lines.every(line => line.trim().startsWith('- '))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{line.trim().slice(2)}</li>)}</ul>;
    return <p key={index}>{lines.map((line, i) => <React.Fragment key={i}>{i > 0 && <br/>}{line}</React.Fragment>)}</p>;
  })}</div>;
}
