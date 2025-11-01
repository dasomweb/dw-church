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
        this.initBannerAdditionalUploaders();
        
        // Update album image count on page load (with multiple attempts to ensure DOM is ready)
        var self = this;
        var updateCount = function(attempt) {
            attempt = attempt || 1;
            if ($('#dw_album_images_preview, #dasom_album_images_preview').length || $('#dw_album_images, #dasom_album_images').length) {
                self.updateAlbumImageCount();
            } else if (attempt < 5) {
                // Retry up to 5 times with increasing delays
                setTimeout(function() {
                    updateCount(attempt + 1);
                }, 100 * attempt);
            }
        };
        updateCount();
        
        // Also update after a longer delay to catch any late-loading content
        setTimeout(function() {
            if ($('#dw_album_images_preview, #dasom_album_images_preview').length || $('#dw_album_images, #dasom_album_images').length) {
                self.updateAlbumImageCount();
            }
        }, 500);
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
        
        // Album images uploader - Support both button IDs
        $('#dw_album_images_button, #dasom_album_images_button').on('click', function(e) {
            e.preventDefault();
            var maxImages = 16;
            var currentIds = [];
            
            // Get current image count
            $('#dw_album_images_preview li, #dasom_album_images_preview li').each(function() {
                currentIds.push($(this).data('id'));
            });
            
            var remainingSlots = maxImages - currentIds.length;
            
            if (remainingSlots <= 0) {
                alert('최대 16개의 이미지만 업로드할 수 있습니다. (Maximum 16 images allowed)');
                return;
            }
            
            // Create media frame directly to access selection properly
            var mediaFrame = wp.media({
                title: dasomChurchAdmin.strings.uploadAlbumImages || 'Upload Album Images',
                button: { text: dasomChurchAdmin.strings.add || 'Add' },
                library: { type: 'image' },
                multiple: true
            });
            
            // Handle 'select' event - this fires when user clicks the "Select" button in media modal
            mediaFrame.on('select', function() {
                // Get the selection collection from the media frame state
                var selection = mediaFrame.state().get('selection');
                
                // Get selected count using selection.length (as per WordPress media uploader best practices)
                var selectedCount = selection.length;
                
                // Start with current IDs
                var ids = currentIds.slice();
                
                // Limit to maxImages
                var maxToAdd = Math.min(selectedCount, maxImages - ids.length);
                
                if (maxToAdd <= 0) {
                    alert('최대 16개의 이미지만 업로드할 수 있습니다. (Maximum 16 images allowed)');
                    return;
                }
                
                // Add selected images to IDs array
                var added = 0;
                selection.each(function(attachment, index) {
                    if (added >= maxToAdd) {
                        return false; // Stop adding
                    }
                    var a = attachment.toJSON();
                    if (ids.indexOf(a.id) === -1) { // Avoid duplicates
                        ids.push(a.id);
                        added++;
                    }
                });
                
                // Update both hidden fields FIRST with the new IDs array
                $('#dw_album_images, #dasom_album_images').val(JSON.stringify(ids));
                
                // Update image count display IMMEDIATELY using the actual count
                var totalCount = ids.length;
                var $countElement = $('#dw_album_images_count');
                if ($countElement.length) {
                    var maxCount = 16;
                    var countText = '현재 ' + totalCount + '개 / 최대 ' + maxCount + '개 이미지';
                    
                    if (totalCount > maxCount) {
                        countText += ' <span style="color:#dc3545;font-weight:bold;">(경고: ' + totalCount + '개 이미지가 선택되어 있습니다. 저장 시 16개 이하로 줄여주세요)</span>';
                        if (!$('#dw_album_images_error').length) {
                            $countElement.after('<p class="description" style="color:#dc3545;font-weight:bold;" id="dw_album_images_error">앨범 이미지는 최대 16개까지 저장할 수 있습니다. 이미지를 제거하여 16개 이하로 줄여주세요.</p>');
                        }
                    } else if (totalCount >= maxCount) {
                        countText += ' <span style="color:#dc3545;">(최대 개수에 도달했습니다)</span>';
                        $('#dw_album_images_error').remove();
                    } else {
                        $('#dw_album_images_error').remove();
                    }
                    
                    $countElement.html(countText);
                    
                    // Hide "no images" message if images exist
                    $('#dw_album_images_empty, #dasom_album_images_empty').hide();
                }
                
                // Now add thumbnails to preview container
                var previewContainer = $('#dw_album_images_preview').length ? $('#dw_album_images_preview') : $('#dasom_album_images_preview');
                previewContainer.empty(); // Clear existing previews
                
                selection.each(function(attachment) {
                    var a = attachment.toJSON();
                    if (ids.indexOf(a.id) !== -1) {
                        previewContainer.append('<li data-id="' + a.id + '" style="position:relative;"><img src="' + a.url + '" style="width:100px;height:100px;object-fit:cover;" /><button type="button" class="button-link remove-image" style="position:absolute;top:-8px;right:-8px;background:#dc3545;color:white;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:all 0.2s ease;">×</button></li>');
                    }
                });
                
                // Final count update after thumbnails are added
                setTimeout(function() {
                    self.updateAlbumImageCount();
                }, 100);
                
                // Show message if some images were not added due to limit
                if (selectedCount > maxToAdd || ids.length > maxImages) {
                    alert('최대 16개의 이미지만 업로드할 수 있습니다. ' + Math.min(added, maxToAdd) + '개의 이미지만 추가되었습니다. (Maximum 16 images allowed. Only ' + Math.min(added, maxToAdd) + ' images were added.)');
                }
                
                // Show warning if total exceeds 16
                if (ids.length > 16) {
                    alert('경고: 현재 ' + ids.length + '개의 이미지가 선택되어 있습니다. 저장 시 16개 이하로 줄여주세요. (Warning: ' + ids.length + ' images selected. Please reduce to 16 or less before saving.)');
                }
            });
            
            // Open the media frame
            mediaFrame.open();
        });
        
        // Remove image button handler for album images
        $(document).on('click', '#dw_album_images_preview .remove-image, #dasom_album_images_preview .remove-image', function(e) {
            e.preventDefault();
            $(this).closest('li').remove();
            
            // Collect remaining image IDs
            var ids = [];
            $(this).closest('ul').find('li').each(function() {
                var id = $(this).data('id');
                if (id) {
                    ids.push(id);
                }
            });
            
            // Update hidden input field
            $('#dw_album_images, #dasom_album_images').val(JSON.stringify(ids));
            
            // Update image count display IMMEDIATELY with actual count
            var totalCount = ids.length;
            var $countElement = $('#dw_album_images_count');
            if ($countElement.length) {
                var maxCount = 16;
                var countText = '현재 ' + totalCount + '개 / 최대 ' + maxCount + '개 이미지';
                
                if (totalCount > maxCount) {
                    countText += ' <span style="color:#dc3545;font-weight:bold;">(경고: ' + totalCount + '개 이미지가 선택되어 있습니다. 저장 시 16개 이하로 줄여주세요)</span>';
                    if (!$('#dw_album_images_error').length) {
                        $countElement.after('<p class="description" style="color:#dc3545;font-weight:bold;" id="dw_album_images_error">앨범 이미지는 최대 16개까지 저장할 수 있습니다. 이미지를 제거하여 16개 이하로 줄여주세요.</p>');
                    }
                } else if (totalCount >= maxCount) {
                    countText += ' <span style="color:#dc3545;">(최대 개수에 도달했습니다)</span>';
                    $('#dw_album_images_error').remove();
                } else {
                    $('#dw_album_images_error').remove();
                }
                
                $countElement.html(countText);
                
                // Show/hide "no images" message
                var $emptyMessage = $('#dw_album_images_empty, #dasom_album_images_empty');
                if (totalCount > 0) {
                    $emptyMessage.hide();
                } else {
                    $emptyMessage.show();
                }
            }
            
            // Also call updateAlbumImageCount as backup
            setTimeout(function() {
                self.updateAlbumImageCount();
            }, 50);
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
     * Update album image count display
     */
    updateAlbumImageCount: function() {
        var ids = [];
        
        // First, try reading from DOM preview elements
        $('#dw_album_images_preview li, #dasom_album_images_preview li').each(function() {
            var id = $(this).data('id');
            if (id) {
                ids.push(String(id)); // Convert to string for consistency
            }
        });
        
        // Also read from hidden input field (always check this as backup)
        var hiddenValue = $('#dw_album_images, #dasom_album_images').val();
        if (hiddenValue) {
            try {
                var parsed = JSON.parse(hiddenValue);
                if (Array.isArray(parsed)) {
                    // Merge with DOM data, avoiding duplicates
                    var hiddenIds = parsed.filter(function(id) { return id; }).map(String);
                    hiddenIds.forEach(function(id) {
                        if (ids.indexOf(id) === -1) {
                            ids.push(id);
                        }
                    });
                }
            } catch(e) {
                console.error('Error parsing album images:', e);
            }
        }
        
        // Remove duplicates and ensure we have valid IDs
        ids = ids.filter(function(id, index) {
            return id && ids.indexOf(id) === index;
        });
        
        var count = ids.length;
        var maxCount = 16;
        var countText = '현재 ' + count + '개 / 최대 ' + maxCount + '개 이미지';
        
        // Update count display
        var $countElement = $('#dw_album_images_count');
        if ($countElement.length) {
            var $warningSpan = $countElement.find('span[style*="color:#dc3545"]');
            
            if (count > maxCount) {
                // Show error message
                if (!$('#dw_album_images_error').length) {
                    $countElement.after('<p class="description" style="color:#dc3545;font-weight:bold;" id="dw_album_images_error">앨범 이미지는 최대 16개까지 저장할 수 있습니다. 이미지를 제거하여 16개 이하로 줄여주세요.</p>');
                }
                countText += ' <span style="color:#dc3545;font-weight:bold;">(경고: ' + count + '개 이미지가 선택되어 있습니다. 저장 시 16개 이하로 줄여주세요)</span>';
            } else if (count >= maxCount) {
                // At maximum
                if ($warningSpan.length) {
                    $warningSpan.text('(최대 개수에 도달했습니다)');
                } else {
                    countText += ' <span style="color:#dc3545;">(최대 개수에 도달했습니다)</span>';
                }
                $('#dw_album_images_error').remove();
            } else {
                // Under maximum
                if ($warningSpan.length && $warningSpan.text().indexOf('경고') >= 0) {
                    $warningSpan.remove();
                }
                $('#dw_album_images_error').remove();
            }
            
            // Hide/show "no images" message based on count
            var $emptyMessage = $('#dw_album_images_empty, #dasom_album_images_empty');
            if (count > 0) {
                $emptyMessage.hide();
            } else {
                $emptyMessage.show();
            }
            
            $countElement.html(countText);
        }
    },
    
    /**
     * Initialize form validation
     */
    initFormValidation: function() {
        var self = this;
        
        // Validate album post form before submit
        $('#post, #post-new').on('submit', function(e) {
            // Check if this is an album post
            var postType = $('#post_type').val();
            if (postType !== 'album') {
                return; // Not an album post, use default validation
            }
            
            // Check album image count
            var ids = [];
            $('#dw_album_images_preview li, #dasom_album_images_preview li').each(function() {
                ids.push($(this).data('id'));
            });
            
            if (ids.length > 16) {
                e.preventDefault();
                alert('앨범 이미지는 최대 16개까지 저장할 수 있습니다. 현재 ' + ids.length + '개의 이미지가 선택되어 있습니다. 이미지를 제거하여 16개 이하로 줄여주세요.\n\n(Album images are limited to 16. Currently ' + ids.length + ' images are selected. Please remove images to reduce to 16 or less.)');
                
                // Scroll to image section
                $('html, body').animate({
                    scrollTop: $('#dw_album_images_preview, #dasom_album_images_preview').offset().top - 100
                }, 500);
                
                return false;
            }
        });
        
        $('form').on('submit', function(e) {
            var form = $(this);
            var isValid = true;
            
            // Skip if we already handled album validation
            if (form.is('#post, #post-new')) {
                return;
            }
            
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
};

})(jQuery);
