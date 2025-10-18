/**
 * Admin JavaScript for Dasom Church Management
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

(function($) {
    'use strict';
    
    jQuery(document).ready(function() {
    // Initialize admin functionality
    DasomChurchAdmin.init();
});

/**
 * Admin functionality object
 */
    window.DasomChurchAdmin = {
    
    /**
     * Initialize admin functionality
     */
    init: function() {
        this.initMediaUploaders();
        this.initImageSorting();
                this.initYouTubeThumbnails();
                this.initFormValidation();
                this.initBannerCategoryToggle();
                this.initBannerAdditionalUploaders();
    },
    
    /**
     * Initialize media uploaders
     */
    initMediaUploaders: function() {
        var self = this;
        
        // PDF uploader for bulletins
        $('#dasom_bulletin_pdf_button').on('click', function(e) {
            e.preventDefault();
            self.openMediaFrame({
                title: dasomChurchAdmin.strings.uploadPdf || 'Upload Bulletin PDF',
                button: { text: dasomChurchAdmin.strings.select || 'Select' },
                library: { type: 'application/pdf' },
                multiple: false,
                onSelect: function(attachment) {
                    $('#dasom_bulletin_pdf').val(attachment.id);
                    $('#dasom_bulletin_pdf_preview').html('<a href="' + attachment.url + '" target="_blank">' + (dasomChurchAdmin.strings.viewPdf || 'View Selected PDF') + '</a>');
                }
            });
        });
        
        // Image uploader for bulletins
        $('#dasom_bulletin_images_button').on('click', function(e) {
            e.preventDefault();
            self.openMediaFrame({
                title: dasomChurchAdmin.strings.uploadImages || 'Upload Bulletin Images',
                button: { text: dasomChurchAdmin.strings.add || 'Add' },
                library: { type: 'image' },
                multiple: true,
                onSelect: function(selection) {
                    var ids = [];
                    $('#dasom_bulletin_images_preview li').each(function() {
                        ids.push($(this).data('id'));
                    });
                    selection.each(function(attachment) {
                        var a = attachment.toJSON();
                        ids.push(a.id);
                        $('#dasom_bulletin_images_preview').append('<li data-id="' + a.id + '"><img src="' + a.url + '" style="width:100px;height:100px;object-fit:cover;" /></li>');
                    });
                    $('#dasom_bulletin_images').val(JSON.stringify(ids));
                }
            });
        });
        
        // Thumbnail uploader for sermons and albums
        $('[id$="_thumb_button"]').on('click', function(e) {
            e.preventDefault();
            var prefix = $(this).attr('id').replace('_thumb_button', '');
            self.openMediaFrame({
                title: dasomChurchAdmin.strings.uploadThumbnail || 'Upload Thumbnail',
                button: { text: dasomChurchAdmin.strings.select || 'Select' },
                library: { type: 'image' },
                multiple: false,
                onSelect: function(attachment) {
                    $('#' + prefix + '_thumb_id').val(attachment.id);
                    $('#' + prefix + '_thumb_preview').html('<img src="' + attachment.url + '" style="width:160px;height:90px;object-fit:cover;" />');
                }
            });
        });
        
        // Album images uploader
        $('#dasom_album_images_button').on('click', function(e) {
            e.preventDefault();
            self.openMediaFrame({
                title: dasomChurchAdmin.strings.uploadAlbumImages || 'Upload Album Images',
                button: { text: dasomChurchAdmin.strings.add || 'Add' },
                library: { type: 'image' },
                multiple: true,
                onSelect: function(selection) {
                    var ids = [];
                    $('#dasom_album_images_preview li').each(function() {
                        ids.push($(this).data('id'));
                    });
                    selection.each(function(attachment) {
                        var a = attachment.toJSON();
                        ids.push(a.id);
                        $('#dasom_album_images_preview').append('<li data-id="' + a.id + '"><img src="' + a.url + '" style="width:100px;height:100px;object-fit:cover;" /></li>');
                    });
                    $('#dasom_album_images').val(JSON.stringify(ids));
                }
            });
        });
    },
    
    /**
     * Open media frame
     */
    openMediaFrame: function(options) {
        var frame = wp.media(options);
        frame.on('select', function() {
            if (options.multiple) {
                options.onSelect(frame.state().get('selection'));
            } else {
                options.onSelect(frame.state().get('selection').first().toJSON());
            }
        });
        frame.open();
    },
    
    /**
     * Initialize image sorting
     */
    initImageSorting: function() {
        $('.dasom-sortable-images, #dasom_bulletin_images_preview, #dasom_album_images_preview').sortable({
            update: function() {
                var ids = [];
                $(this).find('li').each(function() {
                    ids.push($(this).data('id'));
                });
                
                // Update the appropriate hidden field
                var container = $(this);
                if (container.attr('id') === 'dasom_bulletin_images_preview') {
                    $('#dasom_bulletin_images').val(JSON.stringify(ids));
                } else if (container.attr('id') === 'dasom_album_images_preview') {
                    $('#dasom_album_images').val(JSON.stringify(ids));
                }
            }
        });
    },
    
    /**
     * Initialize YouTube thumbnail fetching
     */
    initYouTubeThumbnails: function() {
        var self = this;
        
        $('[id$="_thumb_fetch"]').on('click', function(e) {
            e.preventDefault();
            var prefix = $(this).attr('id').replace('_thumb_fetch', '');
            var url = $('#' + prefix + '_youtube').val();
            
            if (!url) {
                alert(dasomChurchAdmin.strings.enterYoutubeUrl || 'Please enter a YouTube URL first.');
                return;
            }
            
            var videoId = self.extractYouTubeId(url);
            if (!videoId) {
                alert(dasomChurchAdmin.strings.invalidUrl || 'Invalid YouTube URL.');
                return;
            }
            
            self.fetchYouTubeThumbnail(videoId, prefix);
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
     * Fetch YouTube thumbnail
     */
    fetchYouTubeThumbnail: function(videoId, prefix) {
        var maxRes = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
        var hqRes = 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';
        
        var img = new Image();
        img.onload = function() {
            $('#' + prefix + '_thumb_preview').html('<img src="' + maxRes + '" style="width:160px;height:90px;object-fit:cover;" />');
        };
        img.onerror = function() {
            $('#' + prefix + '_thumb_preview').html('<img src="' + hqRes + '" style="width:160px;height:90px;object-fit:cover;" />');
        };
        img.src = maxRes;
    },
    
    /**
     * Initialize form validation
     */
    initFormValidation: function() {
        $('form').on('submit', function(e) {
            var form = $(this);
            var isValid = true;
            
            // Validate required fields
            form.find('[required]').each(function() {
                if (!$(this).val()) {
                    isValid = false;
                    $(this).addClass('error');
                } else {
                    $(this).removeClass('error');
                }
            });
            
            // Validate email fields
            form.find('input[type="email"]').each(function() {
                var email = $(this).val();
                if (email && !DasomChurchAdmin.isValidEmail(email)) {
                    isValid = false;
                    $(this).addClass('error');
                } else {
                    $(this).removeClass('error');
                }
            });
            
            // Validate URL fields
            form.find('input[type="url"]').each(function() {
                var url = $(this).val();
                if (url && !DasomChurchAdmin.isValidUrl(url)) {
                    isValid = false;
                    $(this).addClass('error');
                } else {
                    $(this).removeClass('error');
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                alert(dasomChurchAdmin.strings.validationError || 'Please correct the errors and try again.');
            }
        });
    },
    
    /**
     * Validate email address
     */
    isValidEmail: function(email) {
        var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    },
    
    /**
     * Validate URL
     */
    isValidUrl: function(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    /**
     * Banner category field toggle
     */
    initBannerCategoryToggle: function() {
        if ($('body').hasClass('post-type-banner')) {
            // Function to toggle banner fields based on category
            function toggleBannerFields() {
                var selectedCategory = '';
                
                // Get selected category from taxonomy checkboxes
                $('#banner_categorychecklist input[type="checkbox"]:checked').each(function() {
                    var label = $(this).closest('label').text().trim();
                    if (label === '메인 배너' || label === 'Main Banner') {
                        selectedCategory = 'main';
                    } else if (label === '서브 배너' || label === 'Sub Banner') {
                        selectedCategory = 'sub';
                    }
                });
                
                // Toggle fields
                if (selectedCategory === 'main') {
                    $('.banner-main-field').show();
                    $('.banner-sub-field').hide();
                } else if (selectedCategory === 'sub') {
                    $('.banner-main-field').hide();
                    $('.banner-sub-field').show();
                } else {
                    // No category selected, hide all
                    $('.banner-main-field').hide();
                    $('.banner-sub-field').hide();
                }
            }
            
            // Initial toggle on page load
            toggleBannerFields();
            
            // Toggle on category change
            $(document).on('change', '#banner_categorychecklist input[type="checkbox"]', function() {
                // Uncheck other checkboxes (only one category allowed)
                if ($(this).prop('checked')) {
                    $('#banner_categorychecklist input[type="checkbox"]').not(this).prop('checked', false);
                }
                toggleBannerFields();
            });
        }
    },
    
    /**
     * Banner additional image uploaders
     */
    initBannerAdditionalUploaders: function() {
        var self = this;
        
        if ($('body').hasClass('post-type-banner')) {
            // Banner PC image uploader
            $('#dw_banner_pc_image_button').on('click', function(e) {
                e.preventDefault();
                self.openMediaFrame({
                    title: 'PC용 배너 이미지 업로드',
                    button: { text: '선택' },
                    library: { type: 'image' },
                    multiple: false,
                    onSelect: function(attachment) {
                        $('#dw_banner_pc_image').val(attachment.id);
                        $('#dw_banner_pc_image_preview').html('<img src="' + attachment.url + '" style="max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;" />');
                    }
                });
            });
            
            $('#dw_banner_pc_image_remove').on('click', function(e) {
                e.preventDefault();
                $('#dw_banner_pc_image').val('');
                $('#dw_banner_pc_image_preview').html('');
            });
            
            // Banner mobile image uploader
            $('#dw_banner_mobile_image_button').on('click', function(e) {
                e.preventDefault();
                self.openMediaFrame({
                    title: '모바일용 배너 이미지 업로드',
                    button: { text: '선택' },
                    library: { type: 'image' },
                    multiple: false,
                    onSelect: function(attachment) {
                        $('#dw_banner_mobile_image').val(attachment.id);
                        $('#dw_banner_mobile_image_preview').html('<img src="' + attachment.url + '" style="max-width:300px;height:auto;object-fit:cover;border:1px solid #ddd;" />');
                    }
                });
            });
            
            $('#dw_banner_mobile_image_remove').on('click', function(e) {
                e.preventDefault();
                $('#dw_banner_mobile_image').val('');
                $('#dw_banner_mobile_image_preview').html('');
            });
            
            // Banner sub image uploader
            $('#dw_banner_sub_image_button').on('click', function(e) {
                e.preventDefault();
                self.openMediaFrame({
                    title: '서브 배너 이미지 업로드',
                    button: { text: '선택' },
                    library: { type: 'image' },
                    multiple: false,
                    onSelect: function(attachment) {
                        $('#dw_banner_sub_image').val(attachment.id);
                        $('#dw_banner_sub_image_preview').html('<img src="' + attachment.url + '" style="max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;" />');
                    }
                });
            });
            
            $('#dw_banner_sub_image_remove').on('click', function(e) {
                e.preventDefault();
                $('#dw_banner_sub_image').val('');
                $('#dw_banner_sub_image_preview').html('');
            });
            
            // Date reset buttons
            $('#dw_banner_start_date_reset').on('click', function(e) {
                e.preventDefault();
                $('#dw_banner_start_date').val('');
            });
            
            $('#dw_banner_end_date_reset').on('click', function(e) {
                e.preventDefault();
                $('#dw_banner_end_date').val('');
            });
        }
    }

})(jQuery);
