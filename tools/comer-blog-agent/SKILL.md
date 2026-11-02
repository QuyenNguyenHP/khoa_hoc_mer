---
name: comer-blog-agent
description: Write and create draft blog posts, with an optional cover image and 1–2 illustrations inside the article, for the CoMer Merchandising course site (comernganhmay.online) through its agent API. Use when the user wants to post or draft an article on the course blog ("đăng blog", "viết bài blog khóa học"); do not use for DQ Tech content, lessons, students or site deployment.
---

# CoMer blog agent

Create accurate Vietnamese blog posts for the course site
`https://comernganhmay.online` (khóa học Merchandising ngành may) through its
authenticated agent API. Posts are always created as drafts; an admin
publishes them. Never reveal the API key, put it in content, or place it in
frontend/browser code.

## Preconditions

The key must be in the `COMER_CONTENT_API_KEY` environment variable (same
value as `CONTENT_AGENT_KEY` on the server). If it is absent, stop and ask the
user to set it; never ask them to paste it into chat. Do not fall back to the
admin endpoints (`/api/admin/blog`) or to editing `backend/blog.json` directly.

## Helper script

Use `scripts/comer_blog.py` (in this skill's folder) instead of hand-written
HTTP calls. It reads the key from the environment and never prints it.

```bash
python <skill-dir>/scripts/comer_blog.py blog <payload.json> --cover <cover.jpg> --image <minh-hoa-1.jpg> --image <minh-hoa-2.jpg> --dry-run
python <skill-dir>/scripts/comer_blog.py blog <payload.json> --cover <cover.jpg> --image <minh-hoa-1.jpg>
python <skill-dir>/scripts/comer_blog.py blog <payload.json>            # no cover, no illustrations
```

Write payload JSON files to the scratchpad/temp directory, UTF-8 encoded.
Attach the cover with `--cover`: the script uploads it and writes the returned
URL into `cover`. Attach illustrations with `--image` (0, 1 or 2, in order):
in `content`, put one placeholder line `![Chú thích](image:1)` (and
`![Chú thích](image:2)`) where each picture belongs; the script uploads the
files and replaces `image:N` with the real URL. The number of `--image` files
must equal the number of placeholders, numbered from 1. Never copy an `/api/blog-images/...` URL into a shell
command (Git Bash on Windows rewrites arguments starting with `/`). Covers
must be PNG/JPEG/WEBP/GIF and at most 5 MB; save generated covers as `.jpg`.

The script checks the payload before sending (required fields, lengths, no
`# H1`, valid cover URL, illustration placeholders match `--image` files and
each has a caption). Exit code `2` with a `WARNING` means the post was
created but the response doesn't match: tell the user what to fix in the
admin page, and do not create it again.

## Workflow

1. Ask (in ONE short Vietnamese message) only for what is missing:
   - Chủ đề và các ý chính (hoặc tài liệu/nguồn để dựa vào)
   - Chuyên mục: `Kiến thức nghề`, `Kinh nghiệm đi làm` hoặc `Về khóa học`
     (suggest one and let the user confirm)
   - Ảnh bìa: đường dẫn file trên máy, hoặc cho phép tự tạo ảnh bìa
   - Ảnh minh họa trong bài: **0, 1 hoặc 2 ảnh** (người dùng chọn số lượng;
     gợi ý 1 cho bài ngắn, 2 cho bài dài). Với mỗi ảnh: đường dẫn file trên
     máy, hoặc cho phép tự tạo theo nội dung bài
   - Độ dài mong muốn (mặc định khoảng 800–1.200 chữ) và giọng văn
   Photos pasted into chat have no file path: ask for the path on disk.
2. Research facts about the garment industry from reliable sources
   (official standards, brand compliance manuals, reputable trade
   publications). Do not invent statistics, salaries, company names or
   promises about the course (price, schedule, job guarantees). For course
   facts use only what the user gives or what the site shows.
3. If asked to make the cover, generate an original one with Pillow:
   1600x900 JPEG, paper background `#f4eee1`, navy title text `#102641`,
   a thin brass line `#b98a45`, small label "MERCHANDISING NGÀNH MAY".
   Use a font with Vietnamese glyphs (e.g. `C:/Windows/Fonts/segoeui.ttf`,
   `segoeuib.ttf` for bold). Never use copyrighted or watermarked web images.
4. If asked to make illustrations, draw ORIGINAL diagrams with Pillow that
   explain the content (not decoration), one idea per picture, for example:
   - a process flow of steps with arrows (e.g. PO → T&A → mẫu → sản xuất → giao hàng),
   - a comparison or checklist card (2–3 columns, short labels),
   - a timeline of milestones, or a labelled sketch of a document/garment part.
   Spec: 1600x900 JPEG (or 1600x1000 for tall diagrams), background `#fbf8f1`,
   navy `#102641` text and lines, brass `#b98a45` accents, muted `#4a576b`
   for small notes, rounded boxes, text ≥ 30px so it stays readable on a
   phone (the image shows ~343px wide there). Vietnamese text with the
   English term in brackets where useful. Check every label against the
   article; never invent numbers. Look at each generated image before
   sending (Read the file) and fix overlaps or clipped text.
   Place each placeholder line right after the paragraph or list it
   illustrates, never as the first block, and write a caption of 1 short
   sentence saying what the picture shows.
5. Build the payload (see [the API contract](references/api-contract.md)),
   run the script with `--dry-run`, and show the user the title, slug,
   category, excerpt, cover, the illustrations (send the image files to the
   user so they can see them) with their captions and positions, and a short
   outline. Get a clear yes before sending for real.
6. On `201`, tell the user the draft was created and to review it at
   `https://comernganhmay.online/#quan-tri` (đăng nhập admin) → tab **Blog**, then tick
   "Đăng công khai trên blog" and save to publish.
   For `400`, fix only the reported field (for a duplicate slug pick a new
   one). For `401`, stop: the key is missing, wrong, or not set on the server.

## Content format

The site renders a small Markdown subset only. Anything else shows as plain
text, so use exactly these:

- `## Heading` and `### Sub heading` (each as its own paragraph).
- Paragraphs separated by a blank line; a single newline is a line break.
- Bullet lists: every line of the block starts with `- `.
- Numbered lists: every line of the block starts with `1. `, `2. `, ...
- Tips or warnings: every line of the block starts with `> `.
- Illustrations: a paragraph that is exactly one line
  `![Chú thích ngắn](image:N)` (blank line before and after). The site shows
  it as a full-width picture with the caption under it. At most 2 per post.
- Inline `**bold**` only. No links, tables, code blocks, `*italic*` or HTML:
  they are not rendered. Write a source's name and URL as plain text.

Structure:

- Do NOT start with `# H1`: the page already shows `title`.
- Open with 1–2 short paragraphs, then 3–6 `##` sections.
- Keep paragraphs short (2–4 sentences). Use lists for steps and checklists,
  with a **bold label:** at the start of items where helpful.
- Explain English trade terms on first use, e.g. "Tech Pack (bộ hồ sơ kỹ
  thuật của mẫu)", and keep the English term since merchandisers use it daily.
- End with a short closing paragraph that links the topic to the course in a
  factual way (no promises), then a last paragraph `Nguồn tham khảo: ...`
  listing the sources as plain text.
- `excerpt`: 1–2 sentences, ≤ 300 characters, no Markdown.
- `title`: ≤ 200 characters, clear and specific.
- `slug`: lowercase, hyphenated, no Vietnamese accents
  (`quy-trinh-duyet-mau-nganh-may`), unique.

## Boundaries

Only call `POST /upload` and `POST /blog` under the agent base URL. Do not
publish, edit or delete existing posts, change site configuration, or touch
students, orders or lessons.
