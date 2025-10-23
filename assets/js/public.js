/**
 * Public JavaScript for Dasom Church Management
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

jQuery(document).ready(function($) {
    'use strict';
    
    // Initialize public functionality
    DasomChurchPublic.init();
});

/**
 * Public functionality object
 */
var DasomChurchPublic = {
    
    /**
     * Initialize public functionality
     */
    init: function() {
        this.initImageGalleries();
        this.initYouTubeEmbeds();
        this.initLazyLoading();
    },
    
    /**
     * Initialize image galleries
     */
    initImageGalleries: function() {
        $('.dasom-album-images').each(function() {
            var gallery = $(this);
            var images = gallery.find('img');
            
            if (images.length > 0) {
                // Add click handlers for image lightbox
                images.on('click', function() {
                    DasomChurchPublic.openLightbox($(this).attr('src'), images);
                });
            }
        });
    },
    
    /**
     * Initialize YouTube embeds
     */
    initYouTubeEmbeds: function() {
        $('.dasom-youtube-link').each(function() {
            var link = $(this);
            var url = link.attr('href');
            var videoId = DasomChurchPublic.extractYouTubeId(url);
            
            if (videoId) {
                // Add click handler to open YouTube in new tab
                link.on('click', function(e) {
                    e.preventDefault();
                    window.open(url, '_blank');
                });
            }
        });
    },
    
    /**
     * Initialize lazy loading for images
     */
    initLazyLoading: function() {
        if ('IntersectionObserver' in window) {
            var imageObserver = new IntersectionObserver(function(entries, observer) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            $('img[data-src]').each(function() {
                imageObserver.observe(this);
            });
        }
    },
    
    /**
     * Open lightbox for images
     */
    openLightbox: function(src, images) {
        var lightbox = $('<div class="dasom-lightbox">' +
            '<div class="dasom-lightbox-content">' +
            '<span class="dasom-lightbox-close">&times;</span>' +
            '<img src="' + src + '" alt="">' +
            '<div class="dasom-lightbox-nav">' +
            '<button class="dasom-lightbox-prev">&larr;</button>' +
            '<button class="dasom-lightbox-next">&rarr;</button>' +
            '</div>' +
            '</div>' +
            '</div>');
        
        $('body').append(lightbox);
        
        var currentIndex = images.index(images.filter('[src="' + src + '"]'));
        var totalImages = images.length;
        
        // Navigation handlers
        lightbox.find('.dasom-lightbox-prev').on('click', function() {
            currentIndex = (currentIndex - 1 + totalImages) % totalImages;
            lightbox.find('img').attr('src', images.eq(currentIndex).attr('src'));
        });
        
        lightbox.find('.dasom-lightbox-next').on('click', function() {
            currentIndex = (currentIndex + 1) % totalImages;
            lightbox.find('img').attr('src', images.eq(currentIndex).attr('src'));
        });
        
        // Close handlers
        lightbox.find('.dasom-lightbox-close').on('click', function() {
            lightbox.remove();
        });
        
        lightbox.on('click', function(e) {
            if (e.target === this) {
                lightbox.remove();
            }
        });
        
        // Keyboard navigation
        $(document).on('keydown.lightbox', function(e) {
            if (e.keyCode === 27) { // Escape
                lightbox.remove();
                $(document).off('keydown.lightbox');
            } else if (e.keyCode === 37) { // Left arrow
                currentIndex = (currentIndex - 1 + totalImages) % totalImages;
                lightbox.find('img').attr('src', images.eq(currentIndex).attr('src'));
            } else if (e.keyCode === 39) { // Right arrow
                currentIndex = (currentIndex + 1) % totalImages;
                lightbox.find('img').attr('src', images.eq(currentIndex).attr('src'));
            }
        });
    },
    
    /**
     * Extract YouTube video ID from URL
     */
    extractYouTubeId: function(url) {
        var pattern = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^\&\?\/]+)/;
        var match = url.match(pattern);
        return match ? match[1] : null;
    },
    
    /**
     * Load more content via AJAX
     */
    loadMore: function(container, postType, page) {
        var data = {
            action: 'dasom_church_load_more',
            post_type: postType,
            page: page,
            nonce: dasomChurchPublic.nonce
        };
        
        $.ajax({
            url: dasomChurchPublic.ajaxUrl,
            type: 'POST',
            data: data,
            beforeSend: function() {
                container.append('<div class="dasom-loading">Loading more content...</div>');
            },
            success: function(response) {
                container.find('.dasom-loading').remove();
                if (response.success) {
                    container.append(response.data);
                    DasomChurchPublic.init(); // Re-initialize for new content
                } else {
                    container.append('<div class="dasom-error">' + (response.data || 'Failed to load more content.') + '</div>');
                }
            },
            error: function() {
                container.find('.dasom-loading').remove();
                container.append('<div class="dasom-error">Failed to load more content.</div>');
            }
        });
    }
};

// Add lightbox styles dynamically
jQuery(document).ready(function($) {
    if (!$('#dasom-lightbox-styles').length) {
        $('head').append('<style id="dasom-lightbox-styles">' +
            '.dasom-lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; }' +
            '.dasom-lightbox-content { position: relative; max-width: 90%; max-height: 90%; }' +
            '.dasom-lightbox img { max-width: 100%; max-height: 100%; }' +
            '.dasom-lightbox-close { position: absolute; top: -30px; right: 0; color: white; font-size: 30px; cursor: pointer; }' +
            '.dasom-lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 100%; display: flex; justify-content: space-between; }' +
            '.dasom-lightbox-prev, .dasom-lightbox-next { background: rgba(0,0,0,0.5); color: white; border: none; padding: 10px; cursor: pointer; }' +
            '</style>');
    }
});





