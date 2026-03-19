# @dw-church/wp-plugin

This package references the existing DW Church WordPress plugin located at the repository root (`../../dw-church.php`).

During Phase 1 (REST API) and Phase 5 (WordPress embed), new PHP files will be added here:

- `class-dw-church-rest-api.php` — Custom REST API endpoints
- `class-dw-church-react-embed.php` — Shortcodes and Gutenberg block registration for React components

The built React assets from `@dw-church/ui-components` and `@dw-church/admin-app` are copied into this package during the release build process.
