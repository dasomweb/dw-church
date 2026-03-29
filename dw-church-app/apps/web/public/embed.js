/**
 * DW Church Embeddable Widget v1.0
 *
 * Usage:
 *   <div id="dw-sermons" data-tenant="bethelfaith" data-type="sermons" data-limit="6"></div>
 *   <script src="https://truelight.app/embed.js"></script>
 *
 * Supported types: sermons, bulletins, albums, events, staff
 *
 * Attributes:
 *   data-tenant  (required) - Tenant slug
 *   data-type    (required) - Content type
 *   data-limit   (optional) - Number of items (default: 6)
 *   data-theme   (optional) - "light" or "dark" (default: "light")
 */
(function () {
  'use strict';

  var API_BASE = 'https://api-server-production-c612.up.railway.app/api/v1';
  var SITE_BASE = 'https://truelight.app';

  // ── Helpers ─────────────────────────────────────────────────

  function esc(str) {
    if (!str) return '';
    var el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr);
      return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    } catch (_) {
      return dateStr;
    }
  }

  function tenantUrl(tenant, path) {
    return SITE_BASE + '/' + encodeURIComponent(tenant) + path;
  }

  function youtubeThumb(videoId) {
    if (!videoId) return '';
    return 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';
  }

  function extractYoutubeId(url) {
    if (!url) return '';
    var m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }

  // ── Inject Styles ───────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('dw-embed-styles')) return;
    var style = document.createElement('style');
    style.id = 'dw-embed-styles';
    style.textContent = [
      /* Reset & base */
      '.dw-widget { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.5; box-sizing: border-box; }',
      '.dw-widget *, .dw-widget *::before, .dw-widget *::after { box-sizing: inherit; }',

      /* Grid */
      '.dw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }',
      '.dw-grid-albums { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }',
      '.dw-grid-staff { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px; }',

      /* Card */
      '.dw-card { border-radius: 12px; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; text-decoration: none; display: flex; flex-direction: column; }',
      '.dw-card:hover { transform: translateY(-2px); }',

      /* Light theme */
      '.dw-theme-light { color: #1e293b; }',
      '.dw-theme-light .dw-card { background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }',
      '.dw-theme-light .dw-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }',
      '.dw-theme-light .dw-title { color: #0f172a; }',
      '.dw-theme-light .dw-meta { color: #64748b; }',
      '.dw-theme-light .dw-empty { color: #94a3b8; }',
      '.dw-theme-light .dw-list-item { border-bottom: 1px solid #f1f5f9; }',
      '.dw-theme-light .dw-badge { background: #f1f5f9; color: #475569; }',
      '.dw-theme-light .dw-link { color: #2563eb; }',
      '.dw-theme-light .dw-section-title { color: #0f172a; }',

      /* Dark theme */
      '.dw-theme-dark { color: #e2e8f0; }',
      '.dw-theme-dark .dw-card { background: #1e293b; border: 1px solid #334155; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }',
      '.dw-theme-dark .dw-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.4); }',
      '.dw-theme-dark .dw-title { color: #f1f5f9; }',
      '.dw-theme-dark .dw-meta { color: #94a3b8; }',
      '.dw-theme-dark .dw-empty { color: #475569; }',
      '.dw-theme-dark .dw-list-item { border-bottom: 1px solid #334155; }',
      '.dw-theme-dark .dw-badge { background: #334155; color: #94a3b8; }',
      '.dw-theme-dark .dw-link { color: #60a5fa; }',
      '.dw-theme-dark .dw-section-title { color: #f1f5f9; }',

      /* Shared elements */
      '.dw-card-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; background: #e2e8f0; }',
      '.dw-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; }',
      '.dw-title { font-size: 16px; font-weight: 600; margin: 0 0 6px 0; line-height: 1.4; }',
      '.dw-meta { font-size: 13px; margin: 0; }',
      '.dw-meta + .dw-meta { margin-top: 2px; }',
      '.dw-badge { display: inline-block; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 9999px; margin-right: 6px; margin-bottom: 4px; }',
      '.dw-section-title { font-size: 22px; font-weight: 700; margin: 0 0 20px 0; }',

      /* Bulletin list */
      '.dw-list { list-style: none; margin: 0; padding: 0; }',
      '.dw-list-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; gap: 12px; }',
      '.dw-list-item:last-child { border-bottom: none; }',
      '.dw-list-info { flex: 1; min-width: 0; }',
      '.dw-list-title { font-size: 15px; font-weight: 600; margin: 0 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.dw-list-date { font-size: 13px; margin: 0; }',
      '.dw-btn { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 500; padding: 6px 14px; border-radius: 6px; text-decoration: none; transition: opacity 0.15s; white-space: nowrap; }',
      '.dw-btn:hover { opacity: 0.85; }',
      '.dw-btn-primary { background: #2563eb; color: #ffffff; }',

      /* Staff */
      '.dw-staff-card { text-align: center; padding: 24px 16px; }',
      '.dw-staff-photo { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px auto; display: block; background: #e2e8f0; }',
      '.dw-staff-name { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; }',
      '.dw-staff-role { font-size: 13px; margin: 0; }',
      '.dw-staff-dept { font-size: 12px; margin: 4px 0 0 0; }',

      /* Album overlay */
      '.dw-album-card { position: relative; border-radius: 10px; overflow: hidden; aspect-ratio: 1/1; }',
      '.dw-album-card img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s ease; }',
      '.dw-album-card:hover img { transform: scale(1.05); }',
      '.dw-album-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 14px; background: linear-gradient(transparent, rgba(0,0,0,0.7)); }',
      '.dw-album-overlay .dw-title { color: #fff; font-size: 14px; margin: 0; }',
      '.dw-album-overlay .dw-meta { color: rgba(255,255,255,0.8); font-size: 12px; }',

      /* Events */
      '.dw-event-date-box { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 56px; padding: 8px 10px; border-radius: 8px; line-height: 1; }',
      '.dw-theme-light .dw-event-date-box { background: #eff6ff; color: #2563eb; }',
      '.dw-theme-dark .dw-event-date-box { background: #1e3a5f; color: #60a5fa; }',
      '.dw-event-date-box .dw-day { font-size: 22px; font-weight: 700; }',
      '.dw-event-date-box .dw-month { font-size: 11px; font-weight: 600; text-transform: uppercase; margin-top: 2px; }',
      '.dw-event-body { display: flex; gap: 14px; padding: 16px; align-items: flex-start; }',
      '.dw-event-info { flex: 1; min-width: 0; }',
      '.dw-event-location { font-size: 13px; margin: 4px 0 0 0; }',
      '.dw-theme-light .dw-event-location { color: #64748b; }',
      '.dw-theme-dark .dw-event-location { color: #94a3b8; }',

      /* Empty state */
      '.dw-empty { text-align: center; padding: 40px 16px; font-size: 14px; }',

      /* Link */
      'a.dw-card, a.dw-album-card { text-decoration: none; color: inherit; }',

      /* Powered-by */
      '.dw-powered { text-align: right; margin-top: 16px; font-size: 11px; opacity: 0.5; }',
      '.dw-powered a { text-decoration: none; }',
      '.dw-theme-light .dw-powered a { color: #94a3b8; }',
      '.dw-theme-dark .dw-powered a { color: #475569; }',

      /* Responsive */
      '@media (max-width: 640px) {',
      '  .dw-grid { grid-template-columns: 1fr; gap: 16px; }',
      '  .dw-grid-albums { grid-template-columns: repeat(2, 1fr); gap: 10px; }',
      '  .dw-grid-staff { grid-template-columns: repeat(2, 1fr); gap: 16px; }',
      '  .dw-section-title { font-size: 18px; }',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Render Functions ────────────────────────────────────────

  function renderSermons(items, tenant) {
    if (!items.length) {
      return '<p class="dw-empty">등록된 설교가 없습니다.</p>';
    }

    var html = '<div class="dw-grid">';
    items.forEach(function (s) {
      var videoId = s.youtube_video_id || s.youtubeVideoId || extractYoutubeId(s.youtube_url || s.youtubeUrl || '');
      var thumb = youtubeThumb(videoId);
      var date = fmtDate(s.sermon_date || s.sermonDate || s.date || s.created_at || s.createdAt);
      var preacher = s.preacher_name || s.preacherName || s.preacher || '';
      var category = s.category || '';
      var title = s.title || '';
      var link = tenantUrl(tenant, '/sermons/' + (s.id || ''));

      html += '<a class="dw-card" href="' + esc(link) + '" target="_blank" rel="noopener">';
      if (thumb) {
        html += '<img class="dw-card-img" src="' + esc(thumb) + '" alt="' + esc(title) + '" loading="lazy">';
      }
      html += '<div class="dw-card-body">';
      if (category) {
        html += '<div><span class="dw-badge">' + esc(category) + '</span></div>';
      }
      html += '<h3 class="dw-title">' + esc(title) + '</h3>';
      html += '<p class="dw-meta">' + esc(date);
      if (preacher) html += ' &middot; ' + esc(preacher);
      html += '</p>';
      html += '</div></a>';
    });
    html += '</div>';
    return html;
  }

  function renderBulletins(items, tenant) {
    if (!items.length) {
      return '<p class="dw-empty">등록된 주보가 없습니다.</p>';
    }

    var html = '<ul class="dw-list">';
    items.forEach(function (b) {
      var title = b.title || '';
      var date = fmtDate(b.bulletin_date || b.bulletinDate || b.date || b.created_at || b.createdAt);
      var pdfUrl = b.pdf_url || b.pdfUrl || '';
      var link = tenantUrl(tenant, '/bulletins/' + (b.id || ''));

      html += '<li class="dw-list-item">';
      html += '<div class="dw-list-info">';
      html += '<p class="dw-list-title dw-title">' + esc(title) + '</p>';
      html += '<p class="dw-list-date dw-meta">' + esc(date) + '</p>';
      html += '</div>';
      html += '<div style="display:flex;gap:8px;align-items:center;">';
      if (pdfUrl) {
        html += '<a class="dw-btn dw-btn-primary" href="' + esc(pdfUrl) + '" target="_blank" rel="noopener">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
        html += 'PDF</a>';
      }
      html += '<a class="dw-btn dw-link" href="' + esc(link) + '" target="_blank" rel="noopener">보기</a>';
      html += '</div>';
      html += '</li>';
    });
    html += '</ul>';
    return html;
  }

  function renderAlbums(items, tenant) {
    if (!items.length) {
      return '<p class="dw-empty">등록된 앨범이 없습니다.</p>';
    }

    var html = '<div class="dw-grid-albums">';
    items.forEach(function (a) {
      var title = a.title || '';
      var images = a.images || [];
      var thumbnail = a.thumbnail || (images.length > 0 ? images[0] : '');
      var date = fmtDate(a.date || a.created_at || a.createdAt);
      var count = images.length;
      var link = tenantUrl(tenant, '/albums/' + (a.id || ''));

      html += '<a class="dw-album-card" href="' + esc(link) + '" target="_blank" rel="noopener">';
      if (thumbnail) {
        html += '<img src="' + esc(thumbnail) + '" alt="' + esc(title) + '" loading="lazy">';
      } else {
        html += '<div style="width:100%;height:100%;background:#cbd5e1;display:flex;align-items:center;justify-content:center;">';
        html += '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
        html += '</div>';
      }
      html += '<div class="dw-album-overlay">';
      html += '<p class="dw-title">' + esc(title) + '</p>';
      html += '<p class="dw-meta">' + esc(date);
      if (count > 0) html += ' &middot; ' + count + '장';
      html += '</p>';
      html += '</div></a>';
    });
    html += '</div>';
    return html;
  }

  function renderEvents(items, tenant) {
    if (!items.length) {
      return '<p class="dw-empty">등록된 행사가 없습니다.</p>';
    }

    var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    var html = '<div class="dw-grid">';
    items.forEach(function (e) {
      var title = e.title || '';
      var startDate = e.start_date || e.startDate || e.date || '';
      var location = e.location || '';
      var link = tenantUrl(tenant, '/events/' + (e.id || ''));
      var d;
      var day = '';
      var month = '';

      if (startDate) {
        try {
          d = new Date(startDate);
          day = String(d.getDate());
          month = MONTHS[d.getMonth()] || '';
        } catch (_) { /* ignore */ }
      }

      html += '<a class="dw-card" href="' + esc(link) + '" target="_blank" rel="noopener">';
      html += '<div class="dw-event-body">';
      if (day) {
        html += '<div class="dw-event-date-box">';
        html += '<span class="dw-day">' + esc(day) + '</span>';
        html += '<span class="dw-month">' + esc(month) + '</span>';
        html += '</div>';
      }
      html += '<div class="dw-event-info">';
      html += '<h3 class="dw-title">' + esc(title) + '</h3>';
      html += '<p class="dw-meta">' + esc(fmtDate(startDate)) + '</p>';
      if (location) {
        html += '<p class="dw-event-location">' + esc(location) + '</p>';
      }
      html += '</div>';
      html += '</div></a>';
    });
    html += '</div>';
    return html;
  }

  function renderStaff(items, tenant) {
    if (!items.length) {
      return '<p class="dw-empty">등록된 교역자 정보가 없습니다.</p>';
    }

    var html = '<div class="dw-grid-staff">';
    items.forEach(function (s) {
      var name = s.name || '';
      var role = s.role || s.position || '';
      var department = s.department || '';
      var photo = s.photo_url || s.photoUrl || s.photo || '';

      html += '<div class="dw-card dw-staff-card">';
      if (photo) {
        html += '<img class="dw-staff-photo" src="' + esc(photo) + '" alt="' + esc(name) + '" loading="lazy">';
      } else {
        html += '<div class="dw-staff-photo" style="display:flex;align-items:center;justify-content:center;">';
        html += '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        html += '</div>';
      }
      html += '<h3 class="dw-staff-name dw-title">' + esc(name) + '</h3>';
      if (role) html += '<p class="dw-staff-role dw-meta">' + esc(role) + '</p>';
      if (department) html += '<p class="dw-staff-dept dw-meta">' + esc(department) + '</p>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // ── Type Router ─────────────────────────────────────────────

  var RENDERERS = {
    sermons: renderSermons,
    bulletins: renderBulletins,
    albums: renderAlbums,
    events: renderEvents,
    staff: renderStaff,
  };

  // ── Main Init ───────────────────────────────────────────────

  function init() {
    injectStyles();

    var widgets = document.querySelectorAll('[data-tenant][data-type]');
    if (!widgets.length) return;

    widgets.forEach(function (el) {
      // Prevent re-init
      if (el.getAttribute('data-dw-loaded')) return;
      el.setAttribute('data-dw-loaded', '1');

      var tenant = el.getAttribute('data-tenant');
      var type = el.getAttribute('data-type');
      var limit = parseInt(el.getAttribute('data-limit') || '6', 10);
      var theme = el.getAttribute('data-theme') || 'light';

      if (!tenant || !type) return;

      var renderer = RENDERERS[type];
      if (!renderer) {
        el.innerHTML = '<p class="dw-empty">지원하지 않는 위젯 타입입니다: ' + esc(type) + '</p>';
        el.classList.add('dw-widget', 'dw-theme-' + theme);
        return;
      }

      // Show loading state
      el.innerHTML = '<p class="dw-empty" style="opacity:0.5;">불러오는 중...</p>';
      el.classList.add('dw-widget', 'dw-widget-' + type, 'dw-theme-' + theme);

      // Build API URL
      var apiUrl = API_BASE + '/' + encodeURIComponent(type) + '?perPage=' + limit;

      fetch(apiUrl, {
        headers: { 'X-Tenant-Slug': tenant },
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (json) {
          var items = json.data || json || [];
          if (!Array.isArray(items)) items = [];
          el.innerHTML = renderer(items, tenant);
          el.innerHTML += '<div class="dw-powered"><a href="' + SITE_BASE + '" target="_blank" rel="noopener">Powered by TrueLight</a></div>';
        })
        .catch(function () {
          el.innerHTML = '<p class="dw-empty">콘텐츠를 불러올 수 없습니다.</p>';
        });
    });
  }

  // Run on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose reinit for SPAs
  window.DWChurchEmbed = { init: init };
})();
