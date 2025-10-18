/**
 * DW Gallery Gutenberg Block
 *
 * @package Dasom_Church
 * @since 1.9.0
 */

(function (blocks, element, components, editor, i18n) {
    var el = element.createElement;
    var registerBlockType = blocks.registerBlockType;
    var InspectorControls = editor.InspectorControls;
    var PanelBody = components.PanelBody;
    var TextControl = components.TextControl;
    var SelectControl = components.SelectControl;
    var RangeControl = components.RangeControl;
    var __ = i18n.__;

    registerBlockType('dasom-church/gallery', {
        title: __('DW Gallery', 'dasom-church'),
        description: __('Display church album images in a beautiful gallery layout', 'dasom-church'),
        icon: 'format-gallery',
        category: 'media',
        keywords: [__('gallery', 'dasom-church'), __('album', 'dasom-church'), __('images', 'dasom-church'), __('church', 'dasom-church')],
        
        attributes: {
            metaKey: {
                type: 'string',
                default: 'dw_album_images'
            },
            imageSize: {
                type: 'string',
                default: 'medium'
            },
            layoutType: {
                type: 'string',
                default: 'grid'
            },
            columns: {
                type: 'number',
                default: 3
            },
            gap: {
                type: 'number',
                default: 10
            }
        },

        edit: function (props) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;

            function onChangeMetaKey(newValue) {
                setAttributes({ metaKey: newValue });
            }

            function onChangeImageSize(newValue) {
                setAttributes({ imageSize: newValue });
            }

            function onChangeLayoutType(newValue) {
                setAttributes({ layoutType: newValue });
            }

            function onChangeColumns(newValue) {
                setAttributes({ columns: parseInt(newValue) || 3 });
            }

            function onChangeGap(newValue) {
                setAttributes({ gap: parseInt(newValue) || 10 });
            }

            return [
                el(
                    InspectorControls,
                    { key: 'inspector' },
                    el(
                        PanelBody,
                        {
                            title: __('Gallery Settings', 'dasom-church'),
                            initialOpen: true
                        },
                        el(TextControl, {
                            label: __('Meta Field Key', 'dasom-church'),
                            value: attributes.metaKey,
                            onChange: onChangeMetaKey,
                            help: __('Enter the meta key containing comma-separated image IDs. Default: dw_album_images', 'dasom-church')
                        }),
                        el(SelectControl, {
                            label: __('Image Size', 'dasom-church'),
                            value: attributes.imageSize,
                            onChange: onChangeImageSize,
                            options: [
                                { label: __('Thumbnail (150x150)', 'dasom-church'), value: 'thumbnail' },
                                { label: __('Medium (300x300)', 'dasom-church'), value: 'medium' },
                                { label: __('Medium Large (768x768)', 'dasom-church'), value: 'medium_large' },
                                { label: __('Large (1024x1024)', 'dasom-church'), value: 'large' },
                                { label: __('Full (Original)', 'dasom-church'), value: 'full' }
                            ]
                        }),
                        el(SelectControl, {
                            label: __('Layout Type', 'dasom-church'),
                            value: attributes.layoutType,
                            onChange: onChangeLayoutType,
                            options: [
                                { label: __('Grid (Equal Heights)', 'dasom-church'), value: 'grid' },
                                { label: __('Masonry (Pinterest Style)', 'dasom-church'), value: 'masonry' }
                            ]
                        }),
                        el(RangeControl, {
                            label: __('Columns', 'dasom-church'),
                            value: attributes.columns,
                            onChange: onChangeColumns,
                            min: 1,
                            max: 6,
                            help: __('Number of columns per row', 'dasom-church')
                        }),
                        el(RangeControl, {
                            label: __('Gap (px)', 'dasom-church'),
                            value: attributes.gap,
                            onChange: onChangeGap,
                            min: 0,
                            max: 50,
                            help: __('Space between images', 'dasom-church')
                        })
                    )
                ),
                el(
                    'div',
                    {
                        key: 'editor-preview',
                        className: 'dw-gallery-block-editor',
                        style: {
                            padding: '40px',
                            background: '#f5f5f5',
                            textAlign: 'center',
                            border: '2px dashed #ccc',
                            borderRadius: '8px'
                        }
                    },
                    el(
                        'div',
                        {
                            style: {
                                fontSize: '48px',
                                marginBottom: '15px',
                                color: '#888'
                            }
                        },
                        '🖼️'
                    ),
                    el('h3', { style: { margin: '0 0 10px 0' } }, __('DW Gallery', 'dasom-church')),
                    el(
                        'p',
                        { style: { margin: '0 0 15px 0', color: '#666' } },
                        __('Album images will be displayed here', 'dasom-church')
                    ),
                    el(
                        'div',
                        { style: { fontSize: '13px', color: '#888' } },
                        el('strong', {}, __('Settings:', 'dasom-church')),
                        el('br'),
                        __('Meta Key: ', 'dasom-church') + attributes.metaKey,
                        el('br'),
                        __('Layout: ', 'dasom-church') + (attributes.layoutType === 'grid' ? __('Grid', 'dasom-church') : __('Masonry', 'dasom-church')),
                        el('br'),
                        __('Columns: ', 'dasom-church') + attributes.columns + ', ' + __('Gap: ', 'dasom-church') + attributes.gap + 'px'
                    )
                )
            ];
        },

        save: function () {
            // Dynamic block - render via PHP
            return null;
        }
    });

})(
    window.wp.blocks,
    window.wp.element,
    window.wp.components,
    window.wp.blockEditor || window.wp.editor,
    window.wp.i18n
);

