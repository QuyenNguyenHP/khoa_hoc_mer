# CoMer blog agent API contract

Base URL: `https://comernganhmay.online/api/agent`
(local tests: `http://localhost:3002/api/agent`, set `COMER_API_BASE`).

Every request needs:

```http
Authorization: Bearer <COMER_CONTENT_API_KEY>
Content-Type: application/json
```

The server compares the key with its `CONTENT_AGENT_KEY` environment
variable (at least 24 characters). If the server has no key set, every call
returns `401`.

## Upload a cover image

`POST /upload`

```json
{
  "filename": "quy-trinh-duyet-mau.jpg",
  "dataUrl": "data:image/jpeg;base64,BASE64_IMAGE_BYTES"
}
```

PNG, JPEG, WEBP or GIF, at most 5 MB. A successful response is `201`:

```json
{ "url": "/api/blog-images/1730000000000-quy-trinh-duyet-mau.jpg" }
```

Use that exact URL as `cover` in the post created next, or inside `content`
as an illustration line `![Chú thích](/api/blog-images/...)`. The helper
script does this for you with `--cover` and `--image`.

## Create a draft post

`POST /blog`

```json
{
  "title": "Quy trình duyệt mẫu trong ngành may: từ Proto đến PP Sample",
  "slug": "quy-trinh-duyet-mau-nganh-may",
  "category": "Kiến thức nghề",
  "excerpt": "Các vòng mẫu một đơn hàng may mặc đi qua và merchandiser cần làm gì ở mỗi vòng.",
  "content": "Mở bài...\n\n## Các vòng mẫu\n\n- **Proto sample:** ...",
  "cover": "/api/blog-images/1730000000000-quy-trinh-duyet-mau.jpg"
}
```

- Required: `title` (≤ 200 chars), `content` (≤ 50,000 chars).
- `slug`: lowercase, hyphenated, no accents. If it already exists the server
  returns `400`; pick another slug. If omitted it is made from the title.
- `category`: free text ≤ 60 chars; use one of the site's categories.
- `excerpt`: ≤ 300 chars, plain text.
- `cover`: optional; a URL from `/upload` or a public `https://` image.
- Illustrations live inside `content`: a paragraph that is exactly
  `![caption](url)`, where `url` comes from `/upload` (or is `https://`).
  Other URLs are not rendered.
- `published` is ignored: the agent API always creates a draft
  (`"published": false`). An admin publishes it in the admin page.

`201` response: the stored post (`id`, `slug`, `title`, `category`,
`excerpt`, `content`, `cover`, `published: false`, `createdAt`, ...).

## Responses

- `201`: image uploaded or draft created.
- `400`: invalid or missing field, image too big or wrong type, or duplicate slug.
- `401`: missing or wrong key, or the server has no `CONTENT_AGENT_KEY`.
- `413`: request body too large (proxy limit); compress the image.
