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
        // IMPORTANT: Remove any existing handlers to prevent duplicates
        $('#dw_album_images_button, #dasom_album_images_button').off('click.dw-album-images');
        $('#dw_album_images_button, #dasom_album_images_button').on('click.dw-album-images', function(e) {
            e.preventDefault();
            var maxImages = 16;
            
            // Get current image IDs from hidden input (single source of truth)
            var currentIds = [];
            var hiddenValue = $('#dw_album_images, #dasom_album_images').val();
            if (hiddenValue) {
                try {
                    var parsed = JSON.parse(hiddenValue);
                    if (Array.isArray(parsed)) {
                        currentIds = parsed.filter(function(id) { return id; }).map(String);
                    }
                } catch(e) {
                    console.error('Error parsing current album images:', e);
                }
            }
            
            var remainingSlots = maxImages - currentIds.length;
            
            if (remainingSlots <= 0) {
                alert('최대 16개의 이미지만 업로드할 수 있습니다. (Maximum 16 images allowed)');
                return;
            }
            
            // Create a fresh media frame - never reuse to avoid stale selections
            var mediaFrame = wp.media({
                title: dasomChurchAdmin.strings.uploadAlbumImages || 'Upload Album Images',
                button: { text: dasomChurchAdmin.strings.add || 'Add' },
                library: { type: 'image' },
                multiple: true
            });
            
            // Track selection order for maintaining first 16 selections
            var selectionOrder = []; // Array to track selection order: [{id: '123', timestamp: 123456}]
            var maxAllowedInFrame = remainingSlots; // Maximum images that can be selected in this frame
            
            // Initialize selection to empty state
            mediaFrame.on('open', function() {
                var selection = mediaFrame.state().get('selection');
                selection.reset(); // Clear any existing selections
                selectionOrder = []; // Reset selection order
                maxAllowedInFrame = remainingSlots; // Reset max allowed
                
            });
            
            // Listen to selection changes to track selection order
            // Use setTimeout to ensure DOM is ready after 'open' event
            mediaFrame.on('open', function() {
                setTimeout(function() {
                    var selection = mediaFrame.state().get('selection');
                    
                    // Listen to selection updates (when checkboxes are clicked)
                    selection.off('add.dw-album remove.dw-album reset.dw-album'); // Remove any existing handlers
                    
                    // Prevent adding when limit is reached
                    selection.on('add.dw-album', function(attachment) {
                        // Use requestAnimationFrame to ensure selection.length is accurate after DOM update
                        requestAnimationFrame(function() {
                            setTimeout(function() {
                                var currentCount = selection.length;
                                
                                // If adding this would exceed limit, remove it immediately and show alert
                                if (currentCount > maxAllowedInFrame) {
                                    // Remove the attachment that was just added
                                    selection.remove(attachment);
                                    
                                    // Show alert immediately
                                    alert('최대 ' + maxAllowedInFrame + '개의 이미지만 선택할 수 있습니다. (Maximum ' + maxAllowedInFrame + ' images can be selected)');
                                    
                                    
                                    return; // Don't process this addition
                                }
                                
                                // Track selection order for valid additions
                                try {
                                    var a = attachment.toJSON();
                                    var attachmentId = String(a.id);
                                    
                                    // Track selection order if not already tracked
                                    var exists = selectionOrder.some(function(item) {
                                        return item.id === attachmentId;
                                    });
                                    if (!exists) {
                                        selectionOrder.push({
                                            id: attachmentId,
                                            timestamp: Date.now()
                                        });
                                    }
                                } catch(e) {
                                    console.error('Error processing attachment:', e);
                                }
                            }, 20);
                        });
                    });
                    
                    // Handle remove events
                    selection.on('remove.dw-album', function(attachment) {
                        requestAnimationFrame(function() {
                            setTimeout(function() {
                                try {
                                    var a = attachment.toJSON();
                                    var attachmentId = String(a.id);
                                    
                                    // Remove from selectionOrder
                                    selectionOrder = selectionOrder.filter(function(item) {
                                        return item.id !== attachmentId;
                                    });
                                } catch(e) {
                                    console.error('Error processing removed attachment:', e);
                                }
                            }, 20);
                        });
                    });
                    
                    // Handle reset events
                    selection.on('reset.dw-album', function() {
                        selectionOrder = [];
                    });
                    
                    // Also intercept checkbox clicks directly to prevent selection before it happens
                    setTimeout(function() {
                        var $mediaFrame = $('.media-frame:visible, .media-modal:visible').first();
                        if ($mediaFrame.length) {
                            // Remove existing handlers to prevent duplicates
                            $mediaFrame.off('click.dw-album-checkbox', 'input[type="checkbox"]');
                            
                            // Intercept checkbox clicks before they change the selection
                            $mediaFrame.on('click.dw-album-checkbox', 'input[type="checkbox"]', function(e) {
                                var $checkbox = $(this);
                                var willBeChecked = !$checkbox.is(':checked'); // Will be checked after click
                                
                                // Get current selection count (before the new check/uncheck)
                                var selection = mediaFrame.state().get('selection');
                                var currentCount = selection.length;
                                
                                // If trying to check and already at max, prevent checking
                                if (willBeChecked && currentCount >= maxAllowedInFrame) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    $checkbox.prop('checked', false);
                                    
                                    // Show alert immediately
                                    alert('최대 ' + maxAllowedInFrame + '개의 이미지만 선택할 수 있습니다. (Maximum ' + maxAllowedInFrame + ' images can be selected)');
                                    
                                    return false;
                                }
                                
                            });
                            
                        }
                    }, 500);
                }, 300);
            });
            
            // Flag to prevent duplicate event execution (defense in depth)
            var isProcessing = false;
            
            // Handle 'select' event - this fires when user clicks the "Select" button in media modal
            mediaFrame.on('select', function() {
                // Prevent duplicate execution
                if (isProcessing) {
                    console.log('Album image selection already processing, skipping duplicate event');
                    return;
                }
                isProcessing = true;
                
                try {
                    // CRITICAL: Read current IDs from hidden input at the exact moment of selection
                    // This is the single source of truth - ignore DOM preview which may be stale
                    var actualCurrentIds = [];
                    var currentHiddenValue = $('#dw_album_images, #dasom_album_images').val();
                    if (currentHiddenValue) {
                        try {
                            var currentParsed = JSON.parse(currentHiddenValue);
                            if (Array.isArray(currentParsed)) {
                                actualCurrentIds = currentParsed.filter(function(id) { return id; }).map(String);
                            }
                        } catch(e) {
                            console.error('Error parsing current album images at selection:', e);
                        }
                    }
                    
                    // ALSO read from DOM as fallback to ensure we don't lose existing images
                    // This is a safety measure - hidden input is still the source of truth, but DOM can help
                    var previewContainer = $('#dw_album_images_preview').length ? $('#dw_album_images_preview') : $('#dasom_album_images_preview');
                    var domIds = [];
                    previewContainer.find('li').each(function() {
                        var id = String($(this).data('id'));
                        if (id && domIds.indexOf(id) === -1) {
                            domIds.push(id);
                        }
                    });
                    
                    // Merge actualCurrentIds and domIds to ensure we don't lose any existing images
                    // actualCurrentIds takes precedence (source of truth), but domIds fills in gaps
                    var mergedCurrentIds = actualCurrentIds.slice();
                    domIds.forEach(function(domId) {
                        if (mergedCurrentIds.indexOf(domId) === -1) {
                            mergedCurrentIds.push(domId);
                        }
                    });
                    
                    // Get the selection collection from the media frame state
                    var selection = mediaFrame.state().get('selection');
                    
                    // Get selected count
                    var selectedCount = selection.length;
                    
                    if (selectedCount === 0) {
                        isProcessing = false;
                        return; // Nothing selected, exit early
                    }
                    
                    // Start with merged current IDs (includes both hidden input and DOM)
                    var finalIds = mergedCurrentIds.slice();
                    
                    // Check if already at maximum
                    if (finalIds.length >= maxImages) {
                        isProcessing = false;
                        alert('최대 16개의 이미지만 업로드할 수 있습니다. 이미지를 제거한 후 다시 시도해주세요. (Maximum 16 images allowed. Please remove some images before adding new ones.)');
                        return;
                    }
                    
                    // Collect ONLY new, unique IDs from selection (single pass)
                    var selectedIds = [];
                    var attachmentMap = {}; // Map of ID -> attachment JSON for thumbnail rendering
                    
                    selection.each(function(attachment) {
                        try {
                        var a = attachment.toJSON();
                            var attachmentId = String(a.id);
                            
                            // Store attachment data for later thumbnail rendering
                            attachmentMap[attachmentId] = a;
                            
                            // Only add if not already in current IDs and not already in selectedIds
                            if (finalIds.indexOf(attachmentId) === -1 && selectedIds.indexOf(attachmentId) === -1) {
                                selectedIds.push(attachmentId);
                            }
                        } catch(attError) {
                            console.error('Error processing attachment:', attError);
                        }
                    });
                    
                    // Check if adding selected images would exceed maximum
                    var totalAfterAdd = finalIds.length + selectedIds.length;
                    if (totalAfterAdd > maxImages) {
                        var canAdd = maxImages - finalIds.length;
                        // CRITICAL: Reset processing flag BEFORE showing alert
                        isProcessing = false;
                        
                        // Get selection to keep only first 16 selected images
                        var selection = mediaFrame.state().get('selection');
                        var allSelectedIds = [];
                        var selectionWithOrder = [];
                        
                        // Collect all selected IDs with their order
                        selection.each(function(attachment) {
                            try {
                                var a = attachment.toJSON();
                                var attachmentId = String(a.id);
                                allSelectedIds.push(attachmentId);
                                
                                // Find order from selectionOrder array (compatible with older browsers)
                                var orderItem = null;
                                for (var i = 0; i < selectionOrder.length; i++) {
                                    if (selectionOrder[i].id === attachmentId) {
                                        orderItem = selectionOrder[i];
                                        break;
                                    }
                                }
                                var order = orderItem ? selectionOrder.indexOf(orderItem) : selectionOrder.length;
                                
                                selectionWithOrder.push({
                                    id: attachmentId,
                                    order: order,
                                    attachment: attachment
                                });
                            } catch(e) {
                                console.error('Error processing attachment:', e);
                            }
                        });
                        
                        // Sort by selection order (first selected first)
                        selectionWithOrder.sort(function(a, b) {
                            return a.order - b.order;
                        });
                        
                        // Keep only first 16 selections
                        var idsToKeep = selectionWithOrder
                            .slice(0, maxAllowedInFrame)
                            .map(function(item) { return item.id; });
                        
                        // Uncheck images that are not in the first 16
                        selectionWithOrder.forEach(function(item) {
                            if (idsToKeep.indexOf(item.id) === -1) {
                                selection.remove(item.attachment);
                            }
                        });
                        
                        // Update selectionOrder to match kept selections
                        selectionOrder = selectionOrder.filter(function(item) {
                            return idsToKeep.indexOf(item.id) !== -1;
                        });
                        
                        // Show alert and then reopen media frame
                        if (canAdd > 0) {
                            alert('최대 16개의 이미지를 업로드할 수 있습니다. 현재 ' + finalIds.length + '개의 이미지가 있습니다. ' + canAdd + '개만 추가 가능합니다. 처음 선택한 ' + canAdd + '개만 유지되었습니다. (Maximum 16 images allowed. Currently ' + finalIds.length + ' images. Only ' + canAdd + ' more can be added. First ' + canAdd + ' selections have been kept.)');
                        } else {
                            alert('최대 16개의 이미지를 업로드할 수 있습니다. 이미지를 제거한 후 다시 시도해주세요. (Maximum 16 images allowed. Please remove some images before adding new ones.)');
                        }
                        
                        // Bring media frame to front (focus) since it's already open
                        setTimeout(function() {
                            var $mediaModal = $('.media-modal:visible').first();
                            if ($mediaModal.length) {
                                // Focus on the media modal to bring it to front
                                $mediaModal.focus();
                                // Also try to trigger a click or focus on the frame
                                var $mediaFrame = $mediaModal.find('.media-frame').first();
                                if ($mediaFrame.length) {
                                    $mediaFrame.focus();
                                }
                                // Ensure modal is visible and on top
                                $mediaModal.css({
                                    'z-index': '160000',
                                    'display': 'block'
                                });
                            }
                        }, 100);
                        
                        // CRITICAL: Return immediately to prevent any image addition
                        // This MUST be the last statement - nothing should execute after this
                        return;
                    }
                    
                    // Only proceed if we pass the limit check above
                    // Double-check: ensure we haven't exceeded the limit
                    if (finalIds.length + selectedIds.length > maxImages) {
                        // This should never happen if the check above worked, but defense in depth
                        console.error('Unexpected: totalAfterAdd exceeded maxImages even after check');
                        isProcessing = false;
                        return;
                    }
                    
                    // Merge selected IDs with current IDs
                    selectedIds.forEach(function(newId) {
                        if (finalIds.indexOf(newId) === -1) {
                            finalIds.push(newId);
                        }
                    });
                    
                    // Final duplicate removal (defense in depth)
                    finalIds = finalIds.filter(function(id, index) {
                        return finalIds.indexOf(id) === index;
                    });
                    
                    // Final safety check: never exceed maxImages
                    if (finalIds.length > maxImages) {
                        console.error('Unexpected: finalIds exceeded maxImages');
                        finalIds = finalIds.slice(0, maxImages);
                    }
                    
                    // Update hidden input FIRST (single source of truth)
                    $('#dw_album_images, #dasom_album_images').val(JSON.stringify(finalIds));
                    
                    // Update image count display immediately
                    var totalCount = finalIds.length;
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
                        $('#dw_album_images_empty, #dasom_album_images_empty').hide();
                    }
                    
                    // Update thumbnails: preserve existing ones and add only new ones
                    // This ensures that existing thumbnails don't disappear when adding new images
                    var previewContainer = $('#dw_album_images_preview').length ? $('#dw_album_images_preview') : $('#dasom_album_images_preview');
                    
                    // Remove thumbnails that are no longer in finalIds
                    previewContainer.find('li').each(function() {
                        var $li = $(this);
                        var id = String($li.data('id'));
                        if (id && finalIds.indexOf(id) === -1) {
                            $li.remove();
                        }
                    });
                    
                    // Add only new thumbnails that are not yet displayed
                    finalIds.forEach(function(imageId) {
                        var imageIdStr = String(imageId);
                        var $existingLi = previewContainer.find('li[data-id="' + imageIdStr + '"]');
                        
                        // If thumbnail already exists, preserve it (don't recreate)
                        if ($existingLi.length > 0) {
                            return;
                        }
                        
                        // Try to get attachment data from selection first (for newly selected images)
                        var attachment = attachmentMap[imageIdStr];
                        
                        if (attachment && attachment.id && attachment.url) {
                            // Use data from selection (new image)
                            previewContainer.append('<li data-id="' + attachment.id + '" style="position:relative;"><img src="' + attachment.url + '" style="width:100px;height:100px;object-fit:cover;" /><button type="button" class="button-link remove-image" style="position:absolute;top:-8px;right:-8px;background:#dc3545;color:white;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:all 0.2s ease;">×</button></li>');
                        } else {
                            // Fallback: Try to get attachment model and fetch data safely (for images that were previously selected but not in current selection)
                            var attachmentModel = wp.media.attachment(imageIdStr);
                            
                            if (attachmentModel && typeof attachmentModel.fetch === 'function') {
                                attachmentModel.fetch()
                                    .then(function(att) {
                                        try {
                                            // Check if att has toJSON method
                                            var attData = (att && typeof att.toJSON === 'function') ? att.toJSON() : (att || {});
                                            
                                            // Ensure we have required properties and thumbnail doesn't already exist
                                            if (attData && attData.id && attData.url) {
                                                var $checkLi = previewContainer.find('li[data-id="' + attData.id + '"]');
                                                if ($checkLi.length === 0) {
                                                    previewContainer.append('<li data-id="' + attData.id + '" style="position:relative;"><img src="' + attData.url + '" style="width:100px;height:100px;object-fit:cover;" /><button type="button" class="button-link remove-image" style="position:absolute;top:-8px;right:-8px;background:#dc3545;color:white;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:all 0.2s ease;">×</button></li>');
                                                }
                                            }
                                        } catch(e) {
                                            console.error('Error processing fetched attachment:', e);
                                        }
                                    })
                                    .catch(function(error) {
                                        console.error('Error fetching attachment for ID ' + imageIdStr + ':', error);
                                    });
                            }
                        }
                    });
                    
                    // Reset processing flag
                    isProcessing = false;
                    
                    // Final count update
                    setTimeout(function() {
                        self.updateAlbumImageCount();
                    }, 100);
                } catch(e) {
                    isProcessing = false;
                    console.error('Error in album image selection:', e);
                    // Fallback: try to update from hidden input value
                    try {
                        var hiddenValue = $('#dw_album_images, #dasom_album_images').val();
                        if (hiddenValue) {
                            var parsed = JSON.parse(hiddenValue);
                            if (Array.isArray(parsed)) {
                                var fallbackCount = parsed.length;
                                var $countElement = $('#dw_album_images_count');
                                if ($countElement.length) {
                                    $countElement.html('현재 ' + fallbackCount + '개 / 최대 16개 이미지');
                                }
                            }
                        }
                    } catch(parseError) {
                        console.error('Error parsing fallback value:', parseError);
                    }
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
     * Update selection count display in media frame
     */
    updateSelectionCountInFrame: function(mediaFrame, currentCount, maxCount) {
        try {
            // Find or create selection count element
            var $frameContent = $(mediaFrame.el || mediaFrame.$el || '.media-frame');
            if (!$frameContent.length) {
                // Try to find media frame in DOM
                $frameContent = $('.media-frame:visible');
            }
            
            // Try multiple selectors to find the media frame
            var $frame = $frameContent.first();
            if (!$frame.length) {
                // Fallback: try to find by looking for media modal
                $frame = $('.media-modal:visible').first();
            }
            
            if (!$frame.length) {
                return; // Media frame not found
            }
            
            // Find or create count display element
            var $countDisplay = $frame.find('.dw-media-selection-count');
            if (!$countDisplay.length) {
                // Create count display element - add it to the toolbar
                var $toolbar = $frame.find('.media-toolbar, .media-frame-toolbar').first();
                if ($toolbar.length) {
                    $countDisplay = $('<div class="dw-media-selection-count" style="padding: 10px; text-align: center; background: #f5f5f5; border-bottom: 1px solid #ddd; font-weight: bold; color: #333;"></div>');
                    $toolbar.prepend($countDisplay);
                } else {
                    // Fallback: add to frame title area
                    var $title = $frame.find('.media-frame-title, .media-frame-title-bar').first();
                    if ($title.length) {
                        $countDisplay = $('<div class="dw-media-selection-count" style="padding: 8px 15px; background: #f5f5f5; border-bottom: 1px solid #ddd; font-weight: bold; color: #333; font-size: 13px;"></div>');
                        $title.after($countDisplay);
                    }
                }
            }
            
            if ($countDisplay.length) {
                var countText = '선택한 이미지: ' + currentCount + '개';
                if (maxCount) {
                    countText += ' / 최대 ' + maxCount + '개';
                }
                
                // Add warning style if approaching or exceeding limit
                if (maxCount && currentCount >= maxCount) {
                    $countDisplay.css({
                        'background': '#fff3cd',
                        'color': '#856404',
                        'border-bottom-color': '#ffc107'
                    });
                    if (currentCount > maxCount) {
                        countText += ' (초과)';
                        $countDisplay.css({
                            'background': '#f8d7da',
                            'color': '#721c24',
                            'border-bottom-color': '#dc3545'
                        });
                    }
                } else if (maxCount && currentCount >= maxCount - 2) {
                    $countDisplay.css({
                        'background': '#fff3cd',
                        'color': '#856404',
                        'border-bottom-color': '#ffc107'
                    });
                } else {
                    $countDisplay.css({
                        'background': '#f5f5f5',
                        'color': '#333',
                        'border-bottom-color': '#ddd'
                    });
                }
                
                $countDisplay.text(countText);
            }
        } catch(e) {
            console.error('Error updating selection count in frame:', e);
        }
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
        try {
            var ids = [];
            
            // First, try reading from DOM preview elements
            $('#dw_album_images_preview li, #dasom_album_images_preview li').each(function() {
                try {
                    var id = $(this).data('id');
                    if (id) {
                        ids.push(String(id)); // Convert to string for consistency
                    }
                } catch(e) {
                    // Ignore errors from individual elements
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
        } catch(e) {
            console.error('Error updating album image count:', e);
            // Try to show at least something if there's an error
            try {
                var hiddenValue = $('#dw_album_images, #dasom_album_images').val();
                if (hiddenValue) {
                    var parsed = JSON.parse(hiddenValue);
                    if (Array.isArray(parsed)) {
                        var errorCount = parsed.length;
                        var $countElement = $('#dw_album_images_count');
                        if ($countElement.length) {
                            $countElement.html('현재 ' + errorCount + '개 / 최대 16개 이미지');
                        }
                    }
                }
            } catch(parseError) {
                console.error('Error in fallback count update:', parseError);
            }
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
