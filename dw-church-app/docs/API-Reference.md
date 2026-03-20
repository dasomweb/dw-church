# DW Church SaaS — API Reference

## Base URL

```
https://{slug}.dw-church.app/api/v1
```

Where `{slug}` is your church's unique identifier (e.g., `mychurch`).

## Authentication

Most read endpoints are public. Write endpoints require a Bearer JWT token.

```
Authorization: Bearer <access_token>
```

Obtain a token via the login endpoint. Tokens include `accessToken`, `refreshToken`, and `expiresAt`.

---

## Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register a new church |
| POST | `/auth/login` | No | Login and get JWT tokens |
| POST | `/auth/logout` | Yes | Invalidate current session |
| GET | `/auth/me` | Yes | Get current user info |
| POST | `/auth/forgot-password` | No | Request password reset email |
| POST | `/auth/reset-password` | No | Reset password with token |
| POST | `/auth/invite` | Yes | Invite a team member |

**POST `/auth/register`**

Request body:
```json
{
  "churchName": "My Church",
  "slug": "mychurch",
  "email": "admin@example.com",
  "password": "securepassword",
  "ownerName": "John Doe"
}
```

Response:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresAt": 1700000000,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "John Doe",
    "tenantId": "uuid",
    "tenantSlug": "mychurch",
    "role": "owner"
  }
}
```

**POST `/auth/login`**

Request body:
```json
{
  "email": "admin@example.com",
  "password": "securepassword"
}
```

Response: Same as register.

---

### Sermons

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sermons` | No | List sermons (paginated) |
| GET | `/sermons/:id` | No | Get a single sermon |
| POST | `/sermons` | Yes | Create a sermon |
| PUT | `/sermons/:id` | Yes | Update a sermon |
| DELETE | `/sermons/:id` | Yes | Delete a sermon |
| GET | `/sermons/:id/related` | No | Get related sermons |

**Query params for GET `/sermons`:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `per_page` | int | Items per page (default: 10) |
| `search` | string | Search term |
| `orderby` | string | Sort field |
| `order` | string | `asc` or `desc` |
| `status` | string | `published`, `draft`, or `archived` |
| `category` | string | Filter by category slug |
| `preacher` | string | Filter by preacher |

**Paginated response format:**

Response body is an array of sermon objects. Pagination metadata is in headers:

| Header | Description |
|--------|-------------|
| `X-Total-Count` | Total number of items |
| `X-Total-Pages` | Total number of pages |

**Sermon object:**

```json
{
  "id": "uuid",
  "title": "Sunday Worship",
  "youtubeUrl": "https://youtube.com/watch?v=...",
  "scripture": "John 3:16",
  "preacher": "Pastor Kim",
  "date": "2025-01-05",
  "thumbnailUrl": "https://...",
  "categoryIds": ["uuid"],
  "category": "sunday",
  "status": "published",
  "createdAt": "2025-01-05T10:00:00Z",
  "modifiedAt": "2025-01-05T10:00:00Z"
}
```

---

### Bulletins

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/bulletins` | No | List bulletins (paginated) |
| GET | `/bulletins/:id` | No | Get a single bulletin |
| POST | `/bulletins` | Yes | Create a bulletin |
| PUT | `/bulletins/:id` | Yes | Update a bulletin |
| DELETE | `/bulletins/:id` | Yes | Delete a bulletin |
| GET | `/bulletins/:id/related` | No | Get related bulletins |

**Query params:** Same pagination params as sermons (without `category` and `preacher`).

**Bulletin object:**

```json
{
  "id": "uuid",
  "title": "Weekly Bulletin - Jan 5",
  "date": "2025-01-05",
  "pdfUrl": "https://...",
  "images": ["https://..."],
  "thumbnailUrl": "https://...",
  "status": "published",
  "createdAt": "2025-01-05T10:00:00Z",
  "modifiedAt": "2025-01-05T10:00:00Z"
}
```

---

### Columns (Pastoral Columns)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/columns` | No | List columns (paginated) |
| GET | `/columns/:id` | No | Get a single column |
| POST | `/columns` | Yes | Create a column |
| PUT | `/columns/:id` | Yes | Update a column |
| DELETE | `/columns/:id` | Yes | Delete a column |
| GET | `/columns/:id/related` | No | Get related columns |

**Column object:**

```json
{
  "id": "uuid",
  "title": "Pastor's Corner",
  "content": "<p>HTML content...</p>",
  "topImageUrl": "https://...",
  "bottomImageUrl": "https://...",
  "youtubeUrl": "",
  "thumbnailUrl": "https://...",
  "status": "published",
  "createdAt": "2025-01-05T10:00:00Z",
  "modifiedAt": "2025-01-05T10:00:00Z"
}
```

---

### Albums

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/albums` | No | List albums (paginated) |
| GET | `/albums/:id` | No | Get a single album |
| POST | `/albums` | Yes | Create an album |
| PUT | `/albums/:id` | Yes | Update an album |
| DELETE | `/albums/:id` | Yes | Delete an album |
| GET | `/albums/:id/related` | No | Get related albums |

**Album object:**

```json
{
  "id": "uuid",
  "title": "Christmas Service 2024",
  "images": ["https://...", "https://..."],
  "youtubeUrl": "",
  "thumbnailUrl": "https://...",
  "categoryIds": ["uuid"],
  "status": "published",
  "createdAt": "2025-01-05T10:00:00Z",
  "modifiedAt": "2025-01-05T10:00:00Z"
}
```

---

### Banners

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/banners` | No | List banners (paginated) |
| GET | `/banners/:id` | No | Get a single banner |
| POST | `/banners` | Yes | Create a banner |
| PUT | `/banners/:id` | Yes | Update a banner |
| DELETE | `/banners/:id` | Yes | Delete a banner |

**Additional query params for GET `/banners`:**

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | `main` or `sub` |
| `active` | boolean | Filter active banners only |

**Banner object:**

```json
{
  "id": "uuid",
  "title": "Welcome Banner",
  "pcImageUrl": "https://...",
  "mobileImageUrl": "https://...",
  "subImageUrl": "https://...",
  "linkUrl": "https://...",
  "linkTarget": "_self",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "textOverlay": {
    "heading": "Welcome",
    "subheading": "Join us this Sunday",
    "description": "",
    "position": "center-center",
    "align": "center",
    "widths": { "pc": "60%", "laptop": "70%", "tablet": "80%", "mobile": "90%" }
  },
  "category": "main",
  "status": "published",
  "createdAt": "2025-01-05T10:00:00Z",
  "modifiedAt": "2025-01-05T10:00:00Z"
}
```

---

### Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events` | No | List events (paginated) |
| GET | `/events/:id` | No | Get a single event |
| POST | `/events` | Yes | Create an event |
| PUT | `/events/:id` | Yes | Update an event |
| DELETE | `/events/:id` | Yes | Delete an event |
| GET | `/events/:id/related` | No | Get related events |

**Event object:**

```json
{
  "id": "uuid",
  "title": "Easter Service",
  "backgroundImageUrl": "https://...",
  "imageOnly": false,
  "department": "Worship",
  "eventDate": "2025-04-20",
  "location": "Main Sanctuary",
  "linkUrl": "",
  "description": "Join us for Easter worship...",
  "youtubeUrl": "",
  "thumbnailUrl": "https://...",
  "status": "published",
  "createdAt": "2025-01-05T10:00:00Z",
  "modifiedAt": "2025-01-05T10:00:00Z"
}
```

---

### Staff

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/staff` | No | List all staff |
| GET | `/staff/:id` | No | Get a single staff member |
| POST | `/staff` | Yes | Create a staff entry |
| PUT | `/staff/:id` | Yes | Update a staff entry |
| DELETE | `/staff/:id` | Yes | Delete a staff entry |
| POST | `/staff/reorder` | Yes | Reorder staff members |

**Query params for GET `/staff`:**

| Param | Type | Description |
|-------|------|-------------|
| `department` | string | Filter by department |
| `active_only` | boolean | Show only active staff |

**Staff object:**

```json
{
  "id": "uuid",
  "name": "Pastor Kim",
  "role": "Senior Pastor",
  "department": "Pastoral",
  "email": "pastor@church.com",
  "phone": "010-1234-5678",
  "bio": "Bio text...",
  "order": 1,
  "photoUrl": "https://...",
  "snsLinks": {
    "facebook": "https://facebook.com/...",
    "instagram": "https://instagram.com/...",
    "youtube": ""
  },
  "isActive": true
}
```

**POST `/staff/reorder`** — Request body:
```json
{ "ids": ["uuid1", "uuid2", "uuid3"] }
```

---

### History

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/history` | No | List all history entries |
| GET | `/history/:id` | No | Get a single history entry |
| GET | `/history/years` | No | Get list of available years |
| POST | `/history` | Yes | Create a history entry |
| PUT | `/history/:id` | Yes | Update a history entry |
| DELETE | `/history/:id` | Yes | Delete a history entry |

**Query params for GET `/history`:**

| Param | Type | Description |
|-------|------|-------------|
| `year` | int | Filter by year |

**History object:**

```json
{
  "id": "uuid",
  "year": 2024,
  "items": [
    {
      "id": "uuid",
      "month": 3,
      "day": 15,
      "content": "Church building dedication",
      "photoUrl": "https://..."
    }
  ]
}
```

---

### Pages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pages` | No | List all pages |
| GET | `/pages/:slug` | No | Get a page by slug |
| POST | `/pages` | Yes | Create a page |
| PUT | `/pages/:id` | Yes | Update a page |
| DELETE | `/pages/:id` | Yes | Delete a page |

**Page Sections:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pages/:pageId/sections` | No | List sections |
| POST | `/pages/:pageId/sections` | Yes | Create a section |
| PUT | `/pages/:pageId/sections/:sectionId` | Yes | Update a section |
| DELETE | `/pages/:pageId/sections/:sectionId` | Yes | Delete a section |
| POST | `/pages/:pageId/sections/reorder` | Yes | Reorder sections |

**Available block types:** `hero_banner`, `text_image`, `text_only`, `image_gallery`, `video`, `divider`, `recent_sermons`, `recent_bulletins`, `album_gallery`, `staff_grid`, `history_timeline`, `event_grid`, `worship_schedule`, `location_map`, `contact_info`, `newcomer_info`, `two_columns`, `three_columns`, `tabs`, `accordion`.

---

### Menus

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/menus` | No | List all menu items |
| POST | `/menus` | Yes | Create a menu item |
| PUT | `/menus/:id` | Yes | Update a menu item |
| DELETE | `/menus/:id` | Yes | Delete a menu item |
| POST | `/menus/reorder` | Yes | Reorder menu items |

---

### Theme

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/theme` | No | Get current theme |
| PUT | `/theme` | Yes | Update theme settings |

**Theme object:**

```json
{
  "id": "uuid",
  "templateName": "default",
  "colors": {
    "primary": "#2563eb",
    "secondary": "#64748b",
    "accent": "#f59e0b",
    "background": "#ffffff",
    "surface": "#f8fafc",
    "text": "#1e293b"
  },
  "fonts": {
    "heading": "Pretendard",
    "body": "Pretendard"
  },
  "customCss": ""
}
```

---

### Taxonomies

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/taxonomies/sermon_category` | No | Sermon categories |
| GET | `/taxonomies/sermon_preacher` | No | Sermon preachers |
| GET | `/taxonomies/banner_category` | No | Banner categories |
| GET | `/taxonomies/album_category` | No | Album categories |
| GET | `/taxonomies/staff_department` | No | Staff departments |

**Taxonomy term object:**

```json
{
  "id": "uuid",
  "name": "Sunday Worship",
  "slug": "sunday-worship",
  "count": 42,
  "parentId": null
}
```

---

### Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings` | No | Get church settings |
| POST | `/settings` | Yes | Update church settings |

**Settings object:**

```json
{
  "name": "My Church",
  "address": "123 Church St",
  "phone": "02-1234-5678",
  "email": "info@church.com",
  "website": "https://church.com",
  "socialYoutube": "https://youtube.com/@church",
  "socialInstagram": "https://instagram.com/church",
  "socialFacebook": "",
  "socialLinkedin": "",
  "socialTiktok": "",
  "socialKakaotalk": "",
  "socialKakaotalkChannel": ""
}
```

---

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Yes | List all users in tenant |
| POST | `/users/invite` | Yes | Invite a new user |
| DELETE | `/users/:id` | Yes | Remove a user |

---

### Files

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/files` | Yes | List uploaded files |
| POST | `/files` | Yes | Upload a file (multipart/form-data) |
| DELETE | `/files/:id` | Yes | Delete a file |

**Upload:** Send as `multipart/form-data` with a `file` field.

**File object:**

```json
{
  "id": "uuid",
  "url": "https://..."
}
```

---

## Example curl Commands

### Login

```bash
curl -X POST https://mychurch.dw-church.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "mypassword"}'
```

### List sermons (published, page 1, 10 per page)

```bash
curl "https://mychurch.dw-church.app/api/v1/sermons?status=published&page=1&per_page=10"
```

### Create a sermon

```bash
curl -X POST https://mychurch.dw-church.app/api/v1/sermons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "title": "Sunday Worship",
    "youtubeUrl": "https://youtube.com/watch?v=abc123",
    "scripture": "John 3:16",
    "preacher": "Pastor Kim",
    "date": "2025-01-05",
    "thumbnailUrl": "",
    "categoryIds": [],
    "category": "sunday",
    "status": "published"
  }'
```

### Upload a file

```bash
curl -X POST https://mychurch.dw-church.app/api/v1/files \
  -H "Authorization: Bearer eyJ..." \
  -F "file=@/path/to/image.jpg"
```

---

## Error Responses

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation error description",
  "error": "Bad Request"
}
```

Common status codes:

| Code | Description |
|------|-------------|
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — missing or invalid token |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found |
| 409 | Conflict — duplicate resource |
| 500 | Internal Server Error |
