/**
 * DW Church Connector — Front-end JavaScript
 *
 * Provides:
 * - Banner slider auto-rotation
 * - Album lightbox modal
 * - Admin AJAX handlers (test connection, clear cache)
 *
 * Vanilla JS, no jQuery dependency.
 */

(function () {
	'use strict';

	// ─── Banner Slider ──────────────────────────────────────────

	/**
	 * Initialize all banner sliders on the page.
	 */
	function initBannerSliders() {
		var sliders = document.querySelectorAll('[data-dwc-banner-slider]');

		sliders.forEach(function (slider) {
			var slides = slider.querySelectorAll('.dwc-banner-slide');
			var dots = slider.querySelectorAll('.dwc-banners__dot');
			var prevBtn = slider.querySelector('[data-dwc-prev]');
			var nextBtn = slider.querySelector('[data-dwc-next]');
			var current = 0;
			var total = slides.length;
			var timer = null;
			var interval = 5000;

			if (total <= 1) {
				return;
			}

			function goToSlide(index) {
				slides[current].classList.remove('dwc-banner-slide--active');
				if (dots[current]) {
					dots[current].classList.remove('dwc-banners__dot--active');
				}

				current = ((index % total) + total) % total;

				slides[current].classList.add('dwc-banner-slide--active');
				if (dots[current]) {
					dots[current].classList.add('dwc-banners__dot--active');
				}
			}

			function nextSlide() {
				goToSlide(current + 1);
			}

			function prevSlide() {
				goToSlide(current - 1);
			}

			function startAutoPlay() {
				stopAutoPlay();
				timer = setInterval(nextSlide, interval);
			}

			function stopAutoPlay() {
				if (timer) {
					clearInterval(timer);
					timer = null;
				}
			}

			// Dot navigation.
			dots.forEach(function (dot) {
				dot.addEventListener('click', function () {
					var slideIndex = parseInt(dot.getAttribute('data-slide'), 10);
					goToSlide(slideIndex);
					startAutoPlay();
				});
			});

			// Prev / Next buttons.
			if (prevBtn) {
				prevBtn.addEventListener('click', function () {
					prevSlide();
					startAutoPlay();
				});
			}

			if (nextBtn) {
				nextBtn.addEventListener('click', function () {
					nextSlide();
					startAutoPlay();
				});
			}

			// Pause on hover.
			slider.addEventListener('mouseenter', stopAutoPlay);
			slider.addEventListener('mouseleave', startAutoPlay);

			// Start auto-rotation.
			startAutoPlay();
		});
	}

	// ─── Album Lightbox ─────────────────────────────────────────

	var lightboxEl = null;
	var lightboxImages = [];
	var lightboxIndex = 0;

	/**
	 * Create the lightbox DOM element.
	 */
	function createLightbox() {
		if (lightboxEl) {
			return;
		}

		lightboxEl = document.createElement('div');
		lightboxEl.className = 'dwc-lightbox';
		lightboxEl.setAttribute('role', 'dialog');
		lightboxEl.setAttribute('aria-modal', 'true');
		lightboxEl.innerHTML =
			'<button class="dwc-lightbox__close" aria-label="Close">&times;</button>' +
			'<button class="dwc-lightbox__prev" aria-label="Previous">&lsaquo;</button>' +
			'<img class="dwc-lightbox__image" src="" alt="" />' +
			'<button class="dwc-lightbox__next" aria-label="Next">&rsaquo;</button>' +
			'<div class="dwc-lightbox__counter"></div>';

		document.body.appendChild(lightboxEl);

		// Close button.
		lightboxEl.querySelector('.dwc-lightbox__close').addEventListener('click', closeLightbox);

		// Click backdrop to close.
		lightboxEl.addEventListener('click', function (e) {
			if (e.target === lightboxEl) {
				closeLightbox();
			}
		});

		// Navigation.
		lightboxEl.querySelector('.dwc-lightbox__prev').addEventListener('click', function (e) {
			e.stopPropagation();
			showLightboxImage(lightboxIndex - 1);
		});

		lightboxEl.querySelector('.dwc-lightbox__next').addEventListener('click', function (e) {
			e.stopPropagation();
			showLightboxImage(lightboxIndex + 1);
		});

		// Keyboard navigation.
		document.addEventListener('keydown', function (e) {
			if (!lightboxEl || !lightboxEl.classList.contains('dwc-lightbox--visible')) {
				return;
			}
			if (e.key === 'Escape') {
				closeLightbox();
			} else if (e.key === 'ArrowLeft') {
				showLightboxImage(lightboxIndex - 1);
			} else if (e.key === 'ArrowRight') {
				showLightboxImage(lightboxIndex + 1);
			}
		});
	}

	/**
	 * Open the lightbox with an array of image URLs.
	 *
	 * @param {string[]} images Array of image URLs.
	 * @param {number}   index  Starting index.
	 */
	function openLightbox(images, index) {
		createLightbox();
		lightboxImages = images;
		lightboxIndex = index || 0;
		showLightboxImage(lightboxIndex);
		lightboxEl.classList.add('dwc-lightbox--visible');
		document.body.style.overflow = 'hidden';
	}

	/**
	 * Close the lightbox.
	 */
	function closeLightbox() {
		if (!lightboxEl) {
			return;
		}
		lightboxEl.classList.remove('dwc-lightbox--visible');
		document.body.style.overflow = '';
	}

	/**
	 * Show a specific image in the lightbox.
	 *
	 * @param {number} index Image index.
	 */
	function showLightboxImage(index) {
		var total = lightboxImages.length;
		lightboxIndex = ((index % total) + total) % total;

		var img = lightboxEl.querySelector('.dwc-lightbox__image');
		img.src = lightboxImages[lightboxIndex];

		var counter = lightboxEl.querySelector('.dwc-lightbox__counter');
		counter.textContent = (lightboxIndex + 1) + ' / ' + total;

		// Hide nav if only one image.
		var prev = lightboxEl.querySelector('.dwc-lightbox__prev');
		var next = lightboxEl.querySelector('.dwc-lightbox__next');
		prev.style.display = total > 1 ? '' : 'none';
		next.style.display = total > 1 ? '' : 'none';
		counter.style.display = total > 1 ? '' : 'none';
	}

	/**
	 * Initialize album card click handlers for lightbox.
	 */
	function initAlbumLightbox() {
		var albumCards = document.querySelectorAll('.dwc-album-card');

		albumCards.forEach(function (card) {
			card.addEventListener('click', function () {
				var gallery = card.querySelector('.dwc-album-card__gallery');
				if (!gallery) {
					return;
				}

				var imgs = gallery.querySelectorAll('img');
				var urls = [];
				imgs.forEach(function (img) {
					if (img.src) {
						urls.push(img.src);
					}
				});

				if (urls.length > 0) {
					openLightbox(urls, 0);
				}
			});
		});
	}

	// ─── Admin AJAX Handlers ────────────────────────────────────

	/**
	 * Initialize admin buttons (test connection, clear cache).
	 */
	function initAdminHandlers() {
		// Only run in admin context.
		if (typeof dwcAdmin === 'undefined') {
			return;
		}

		var testBtn = document.getElementById('dwc-test-connection');
		var testResult = document.getElementById('dwc-test-result');

		if (testBtn && testResult) {
			testBtn.addEventListener('click', function () {
				testBtn.disabled = true;
				testResult.textContent = 'Testing...';
				testResult.style.color = '';

				var xhr = new XMLHttpRequest();
				xhr.open('POST', dwcAdmin.ajaxUrl);
				xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				xhr.onload = function () {
					testBtn.disabled = false;
					try {
						var resp = JSON.parse(xhr.responseText);
						if (resp.success) {
							testResult.textContent = resp.data;
							testResult.style.color = '#16a34a';
						} else {
							testResult.textContent = resp.data || 'Connection failed.';
							testResult.style.color = '#dc2626';
						}
					} catch (e) {
						testResult.textContent = 'Unexpected response.';
						testResult.style.color = '#dc2626';
					}
				};
				xhr.onerror = function () {
					testBtn.disabled = false;
					testResult.textContent = 'Request failed.';
					testResult.style.color = '#dc2626';
				};
				xhr.send('action=dwc_test_connection&nonce=' + encodeURIComponent(dwcAdmin.nonce));
			});
		}

		var cacheBtn = document.getElementById('dwc-clear-cache');
		var cacheResult = document.getElementById('dwc-cache-result');

		if (cacheBtn && cacheResult) {
			cacheBtn.addEventListener('click', function () {
				cacheBtn.disabled = true;
				cacheResult.textContent = 'Clearing...';
				cacheResult.style.color = '';

				var xhr = new XMLHttpRequest();
				xhr.open('POST', dwcAdmin.ajaxUrl);
				xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				xhr.onload = function () {
					cacheBtn.disabled = false;
					try {
						var resp = JSON.parse(xhr.responseText);
						if (resp.success) {
							cacheResult.textContent = resp.data;
							cacheResult.style.color = '#16a34a';
						} else {
							cacheResult.textContent = resp.data || 'Failed to clear cache.';
							cacheResult.style.color = '#dc2626';
						}
					} catch (e) {
						cacheResult.textContent = 'Unexpected response.';
						cacheResult.style.color = '#dc2626';
					}
				};
				xhr.onerror = function () {
					cacheBtn.disabled = false;
					cacheResult.textContent = 'Request failed.';
					cacheResult.style.color = '#dc2626';
				};
				xhr.send('action=dwc_clear_cache&nonce=' + encodeURIComponent(dwcAdmin.nonce));
			});
		}
	}

	// ─── Initialize ─────────────────────────────────────────────

	function init() {
		initBannerSliders();
		initAlbumLightbox();
		initAdminHandlers();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
