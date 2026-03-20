# DW Church — WordPress Integration Guide

This guide explains how to connect a WordPress site to the DW Church SaaS platform using the **DW Church Connector** plugin.

---

## Table of Contents

1. [Installation](#1-installation)
2. [Configuration](#2-configuration)
3. [Using Shortcodes](#3-using-shortcodes)
4. [Customizing Appearance](#4-customizing-appearance)
5. [Cache Management](#5-cache-management)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Installation

### Option A: Manual Upload

1. Download the `wp-connector` folder from the repository.
2. Rename it to `dw-church-connector`.
3. Upload it to your WordPress site's `/wp-content/plugins/` directory.
4. Go to **Plugins** in WordPress admin and activate **DW Church Connector**.

### Option B: ZIP Upload

1. Compress the `wp-connector` folder as `dw-church-connector.zip`.
2. In WordPress admin, go to **Plugins > Add New > Upload Plugin**.
3. Upload the ZIP file and activate it.

### Requirements

- WordPress 5.6 or higher
- PHP 7.4 or higher
- An active DW Church SaaS account

---

## 2. Configuration

After activation, go to **Settings > DW Church** in WordPress admin.

### API URL

Enter your DW Church SaaS URL:

```
https://your-church-slug.dw-church.app
```

This is the base URL of your church's DW Church instance.

### API Key

Enter your API key or JWT token. This is required for accessing authenticated endpoints. For public-only data (sermons, bulletins, etc.), this can be left empty if the API allows unauthenticated reads.

To obtain a token:
1. Login to your DW Church admin dashboard.
2. Navigate to Settings > API Keys (if available).
3. Or use the login API endpoint to get a JWT token.

### Cache TTL

Default: **300 seconds (5 minutes)**. This controls how long API responses are cached locally. Set to `0` to disable caching (not recommended for production).

### Testing the Connection

Click the **Test Connection** button to verify your API URL and key are correct. A green success message confirms the connection is working.

---

## 3. Using Shortcodes

Insert any of these shortcodes into pages, posts, or widget areas.

### Sermons

```
[dw_church_sermons limit="6" category="sunday" class="my-sermons"]
```

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | 6 | Number of sermons to display |
| `category` | (all) | Filter by sermon category slug |
| `class` | (none) | Extra CSS class on the wrapper |

Displays a responsive grid of sermon cards with thumbnail, title, preacher, scripture, and date.

### Bulletins

```
[dw_church_bulletins limit="3" class="my-bulletins"]
```

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | 3 | Number of bulletins to display |
| `class` | (none) | Extra CSS class |

Displays a vertical list of bulletin cards with thumbnail, title, date, and PDF download link.

### Albums

```
[dw_church_albums limit="8" category="" class="my-albums"]
```

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | 8 | Number of albums to display |
| `category` | (all) | Filter by album category slug |
| `class` | (none) | Extra CSS class |

Displays a grid of album cards. Clicking a card opens a lightbox gallery.

### Staff

```
[dw_church_staff department="all" class="my-staff"]
```

| Param | Default | Description |
|-------|---------|-------------|
| `department` | all | Filter by department (or "all") |
| `class` | (none) | Extra CSS class |

Displays staff profile cards with photo, name, role, department, bio, and social links.

### History

```
[dw_church_history class="my-history"]
```

| Param | Default | Description |
|-------|---------|-------------|
| `class` | (none) | Extra CSS class |

Displays a timeline of church history grouped by year.

### Events

```
[dw_church_events limit="4" class="my-events"]
```

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | 4 | Number of events to display |
| `class` | (none) | Extra CSS class |

Displays a grid of upcoming event cards with image, title, date, location, and description.

### Banners

```
[dw_church_banners category="main" class="my-banners"]
```

| Param | Default | Description |
|-------|---------|-------------|
| `category` | main | Banner category: `main` or `sub` |
| `class` | (none) | Extra CSS class |

Displays a full-width banner slider with auto-rotation, navigation dots, and prev/next buttons. Supports responsive images (separate desktop and mobile images) and text overlays.

---

## 4. Customizing Appearance

### CSS Custom Properties

The plugin uses CSS custom properties (variables) for easy theming. Add these to your theme's CSS or the WordPress Customizer's "Additional CSS":

```css
:root {
  --dwc-primary: #your-color;
  --dwc-primary-hover: #your-hover-color;
  --dwc-secondary: #64748b;
  --dwc-text: #1e293b;
  --dwc-text-light: #64748b;
  --dwc-bg: #ffffff;
  --dwc-bg-alt: #f8fafc;
  --dwc-border: #e2e8f0;
  --dwc-radius: 8px;
  --dwc-gap: 1.5rem;
}
```

### Overriding Styles

All elements use BEM-style CSS classes prefixed with `dwc-`. Target specific elements:

```css
/* Make sermon cards wider */
.dwc-sermons {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

/* Change staff card text alignment */
.dwc-staff-card {
  text-align: left;
}

/* Custom banner height */
.dwc-banner-slide__image {
  max-height: 500px;
}
```

### Using the `class` Parameter

Add custom classes to any shortcode for page-specific styling:

```
[dw_church_sermons limit="3" class="home-sermons"]
```

```css
.home-sermons .dwc-sermon-card__title {
  font-size: 1.3rem;
}
```

---

## 5. Cache Management

### How Caching Works

The plugin caches API responses as WordPress transients. Each unique API request (endpoint + parameters) gets its own cache entry with a key based on an MD5 hash.

### Cache TTL

Configure the cache duration in **Settings > DW Church > Cache TTL**:

- **300** (default) — 5 minutes, good for most sites
- **60** — 1 minute, for frequently updated content
- **3600** — 1 hour, for static content
- **0** — Disabled (every page load makes API calls)

### Clearing the Cache

Two ways to clear the cache:

1. **Admin UI:** Go to Settings > DW Church, click **Clear All Cache**.
2. **Programmatic:** Call `DW_Church_API_Client::clear_cache()` in PHP.

The cache is also automatically cleared when the plugin is deactivated.

### When to Clear Cache

- After updating content in the DW Church admin dashboard
- After changing the API URL or key
- If you see stale content on the WordPress site

---

## 6. Troubleshooting

### "No sermons found" or empty output

1. Verify your API URL in Settings > DW Church.
2. Click **Test Connection** to confirm connectivity.
3. Ensure your DW Church account has published content.
4. Check that the `status=published` content exists for the content type.

### Connection test fails

1. Confirm the API URL format: `https://your-slug.dw-church.app` (no trailing slash).
2. If using an API key, verify it is valid and not expired.
3. Check that your WordPress server can make outbound HTTPS requests.
4. Check if a firewall or security plugin is blocking outgoing requests.

### Styles not loading

1. Confirm the plugin is activated.
2. Check for CSS conflicts with your theme. Use browser DevTools to inspect.
3. Try adding `!important` to your custom CSS overrides if needed.

### Banner slider not working

1. Ensure the banner shortcode has more than one banner (single banners don't auto-rotate).
2. Check the browser console for JavaScript errors.
3. Verify that the plugin's JS file is loading (`dw-church-connector.js`).

### Lightbox not opening for albums

1. Make sure the album has multiple images in the DW Church dashboard.
2. Check for JavaScript conflicts with other plugins.
3. Verify the plugin JS file loads without errors.

### Performance issues

1. Increase the Cache TTL to reduce API calls.
2. Reduce the `limit` parameter on shortcodes.
3. Consider using a WordPress caching plugin (e.g., WP Super Cache, W3 Total Cache) for full-page caching.

### Error messages visible on the page

Error messages from the API are only shown to users with `manage_options` capability (administrators). Regular visitors see nothing if an API call fails.

---

## Plugin File Structure

```
dw-church-connector/
  dw-church-connector.php     — Main plugin file
  includes/
    class-api-client.php      — HTTP client with caching
    class-settings.php        — Admin settings page
    class-shortcodes.php      — All 7 shortcodes
  assets/
    css/
      dw-church-connector.css — Default styles
    js/
      dw-church-connector.js  — Banner slider + lightbox + admin AJAX
```
