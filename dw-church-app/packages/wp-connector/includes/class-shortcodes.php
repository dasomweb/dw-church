<?php
/**
 * DW Church Shortcodes
 *
 * Registers shortcodes that fetch data from the DW Church SaaS API
 * and render server-side HTML with BEM-style CSS classes.
 *
 * @package DW_Church_Connector
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class DW_Church_Shortcodes
 */
class DW_Church_Shortcodes {

	/**
	 * API client instance.
	 *
	 * @var DW_Church_API_Client
	 */
	private $client;

	/**
	 * Constructor. Registers all shortcodes.
	 */
	public function __construct() {
		$this->client = DW_Church_API_Client::instance();

		add_shortcode( 'dw_church_sermons', array( $this, 'render_sermons' ) );
		add_shortcode( 'dw_church_bulletins', array( $this, 'render_bulletins' ) );
		add_shortcode( 'dw_church_albums', array( $this, 'render_albums' ) );
		add_shortcode( 'dw_church_staff', array( $this, 'render_staff' ) );
		add_shortcode( 'dw_church_history', array( $this, 'render_history' ) );
		add_shortcode( 'dw_church_events', array( $this, 'render_events' ) );
		add_shortcode( 'dw_church_banners', array( $this, 'render_banners' ) );
	}

	/**
	 * Build wrapper CSS classes with optional extra class.
	 *
	 * @param string $base  Base BEM class.
	 * @param array  $atts  Shortcode attributes.
	 * @return string CSS class string.
	 */
	private function build_class( $base, $atts ) {
		$classes = $base;
		if ( ! empty( $atts['class'] ) ) {
			$classes .= ' ' . sanitize_html_class( $atts['class'] );
		}
		return $classes;
	}

	/**
	 * Render an error message for display.
	 *
	 * @param WP_Error $error The error object.
	 * @return string HTML error output.
	 */
	private function render_error( $error ) {
		if ( current_user_can( 'manage_options' ) ) {
			return '<div class="dwc-error">' . esc_html( $error->get_error_message() ) . '</div>';
		}
		return '';
	}

	/**
	 * Format a date string for display.
	 *
	 * @param string $date_string ISO date string.
	 * @return string Formatted date.
	 */
	private function format_date( $date_string ) {
		if ( empty( $date_string ) ) {
			return '';
		}
		$timestamp = strtotime( $date_string );
		if ( false === $timestamp ) {
			return esc_html( $date_string );
		}
		return date_i18n( get_option( 'date_format' ), $timestamp );
	}

	// ─── Sermons ────────────────────────────────────────────────

	/**
	 * Render sermons shortcode.
	 *
	 * Usage: [dw_church_sermons limit="6" category="sunday" class="my-class"]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string HTML output.
	 */
	public function render_sermons( $atts ) {
		$atts = shortcode_atts(
			array(
				'limit'    => 6,
				'category' => '',
				'class'    => '',
			),
			$atts,
			'dw_church_sermons'
		);

		$params = array(
			'per_page' => (int) $atts['limit'],
			'status'   => 'published',
		);
		if ( ! empty( $atts['category'] ) ) {
			$params['category'] = sanitize_text_field( $atts['category'] );
		}

		$result = $this->client->get_cached( '/api/v1/sermons', $params );

		if ( is_wp_error( $result ) ) {
			return $this->render_error( $result );
		}

		$sermons = isset( $result['data'] ) ? $result['data'] : $result;
		if ( empty( $sermons ) || ! is_array( $sermons ) ) {
			return '<div class="dwc-empty">' . esc_html__( 'No sermons found.', 'dw-church-connector' ) . '</div>';
		}

		$classes = $this->build_class( 'dwc-sermons', $atts );

		$html = '<div class="' . esc_attr( $classes ) . '">';
		foreach ( $sermons as $sermon ) {
			$html .= '<div class="dwc-sermon-card">';

			if ( ! empty( $sermon['thumbnailUrl'] ) ) {
				$html .= '<img class="dwc-sermon-card__thumbnail" src="' . esc_url( $sermon['thumbnailUrl'] ) . '" alt="' . esc_attr( $sermon['title'] ) . '" loading="lazy" />';
			}

			$html .= '<div class="dwc-sermon-card__content">';
			$html .= '<h3 class="dwc-sermon-card__title">' . esc_html( $sermon['title'] ) . '</h3>';

			if ( ! empty( $sermon['preacher'] ) ) {
				$html .= '<p class="dwc-sermon-card__preacher">' . esc_html( $sermon['preacher'] ) . '</p>';
			}

			if ( ! empty( $sermon['scripture'] ) ) {
				$html .= '<p class="dwc-sermon-card__scripture">' . esc_html( $sermon['scripture'] ) . '</p>';
			}

			if ( ! empty( $sermon['date'] ) ) {
				$html .= '<span class="dwc-sermon-card__date">' . esc_html( $this->format_date( $sermon['date'] ) ) . '</span>';
			}

			$html .= '</div>'; // __content
			$html .= '</div>'; // sermon-card
		}
		$html .= '</div>';

		return $html;
	}

	// ─── Bulletins ──────────────────────────────────────────────

	/**
	 * Render bulletins shortcode.
	 *
	 * Usage: [dw_church_bulletins limit="3" class="my-class"]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string HTML output.
	 */
	public function render_bulletins( $atts ) {
		$atts = shortcode_atts(
			array(
				'limit' => 3,
				'class' => '',
			),
			$atts,
			'dw_church_bulletins'
		);

		$params = array(
			'per_page' => (int) $atts['limit'],
			'status'   => 'published',
		);

		$result = $this->client->get_cached( '/api/v1/bulletins', $params );

		if ( is_wp_error( $result ) ) {
			return $this->render_error( $result );
		}

		$bulletins = isset( $result['data'] ) ? $result['data'] : $result;
		if ( empty( $bulletins ) || ! is_array( $bulletins ) ) {
			return '<div class="dwc-empty">' . esc_html__( 'No bulletins found.', 'dw-church-connector' ) . '</div>';
		}

		$classes = $this->build_class( 'dwc-bulletins', $atts );

		$html = '<div class="' . esc_attr( $classes ) . '">';
		foreach ( $bulletins as $bulletin ) {
			$html .= '<div class="dwc-bulletin-card">';

			if ( ! empty( $bulletin['thumbnailUrl'] ) ) {
				$html .= '<img class="dwc-bulletin-card__thumbnail" src="' . esc_url( $bulletin['thumbnailUrl'] ) . '" alt="' . esc_attr( $bulletin['title'] ) . '" loading="lazy" />';
			}

			$html .= '<div class="dwc-bulletin-card__content">';
			$html .= '<h3 class="dwc-bulletin-card__title">' . esc_html( $bulletin['title'] ) . '</h3>';

			if ( ! empty( $bulletin['date'] ) ) {
				$html .= '<span class="dwc-bulletin-card__date">' . esc_html( $this->format_date( $bulletin['date'] ) ) . '</span>';
			}

			if ( ! empty( $bulletin['pdfUrl'] ) ) {
				$html .= '<a class="dwc-bulletin-card__link" href="' . esc_url( $bulletin['pdfUrl'] ) . '" target="_blank" rel="noopener noreferrer">';
				$html .= esc_html__( 'View PDF', 'dw-church-connector' );
				$html .= '</a>';
			}

			$html .= '</div>'; // __content
			$html .= '</div>'; // bulletin-card
		}
		$html .= '</div>';

		return $html;
	}

	// ─── Albums ─────────────────────────────────────────────────

	/**
	 * Render albums shortcode.
	 *
	 * Usage: [dw_church_albums limit="8" category="" class="my-class"]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string HTML output.
	 */
	public function render_albums( $atts ) {
		$atts = shortcode_atts(
			array(
				'limit'    => 8,
				'category' => '',
				'class'    => '',
			),
			$atts,
			'dw_church_albums'
		);

		$params = array(
			'per_page' => (int) $atts['limit'],
			'status'   => 'published',
		);
		if ( ! empty( $atts['category'] ) ) {
			$params['category'] = sanitize_text_field( $atts['category'] );
		}

		$result = $this->client->get_cached( '/api/v1/albums', $params );

		if ( is_wp_error( $result ) ) {
			return $this->render_error( $result );
		}

		$albums = isset( $result['data'] ) ? $result['data'] : $result;
		if ( empty( $albums ) || ! is_array( $albums ) ) {
			return '<div class="dwc-empty">' . esc_html__( 'No albums found.', 'dw-church-connector' ) . '</div>';
		}

		$classes = $this->build_class( 'dwc-albums', $atts );

		$html = '<div class="' . esc_attr( $classes ) . '">';
		foreach ( $albums as $album ) {
			$html .= '<div class="dwc-album-card" data-album-id="' . esc_attr( $album['id'] ) . '">';

			$thumbnail = ! empty( $album['thumbnailUrl'] ) ? $album['thumbnailUrl'] : '';
			if ( empty( $thumbnail ) && ! empty( $album['images'] ) && is_array( $album['images'] ) ) {
				$thumbnail = $album['images'][0];
			}

			if ( ! empty( $thumbnail ) ) {
				$html .= '<div class="dwc-album-card__image-wrapper">';
				$html .= '<img class="dwc-album-card__thumbnail" src="' . esc_url( $thumbnail ) . '" alt="' . esc_attr( $album['title'] ) . '" loading="lazy" />';

				if ( ! empty( $album['images'] ) && is_array( $album['images'] ) && count( $album['images'] ) > 1 ) {
					$html .= '<span class="dwc-album-card__count">' . count( $album['images'] ) . '</span>';
				}

				$html .= '</div>';
			}

			$html .= '<div class="dwc-album-card__content">';
			$html .= '<h3 class="dwc-album-card__title">' . esc_html( $album['title'] ) . '</h3>';
			$html .= '</div>';

			// Hidden gallery images for lightbox.
			if ( ! empty( $album['images'] ) && is_array( $album['images'] ) ) {
				$html .= '<div class="dwc-album-card__gallery" style="display:none;" aria-hidden="true">';
				foreach ( $album['images'] as $image_url ) {
					$html .= '<img src="' . esc_url( $image_url ) . '" alt="" />';
				}
				$html .= '</div>';
			}

			$html .= '</div>'; // album-card
		}
		$html .= '</div>';

		return $html;
	}

	// ─── Staff ──────────────────────────────────────────────────

	/**
	 * Render staff shortcode.
	 *
	 * Usage: [dw_church_staff department="all" class="my-class"]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string HTML output.
	 */
	public function render_staff( $atts ) {
		$atts = shortcode_atts(
			array(
				'department' => 'all',
				'class'      => '',
			),
			$atts,
			'dw_church_staff'
		);

		$params = array();
		if ( 'all' !== $atts['department'] && ! empty( $atts['department'] ) ) {
			$params['department'] = sanitize_text_field( $atts['department'] );
		}

		$result = $this->client->get_cached( '/api/v1/staff', $params );

		if ( is_wp_error( $result ) ) {
			return $this->render_error( $result );
		}

		$staff_list = is_array( $result ) ? $result : array();
		// Handle paginated response.
		if ( isset( $result['data'] ) && is_array( $result['data'] ) ) {
			$staff_list = $result['data'];
		}

		if ( empty( $staff_list ) ) {
			return '<div class="dwc-empty">' . esc_html__( 'No staff found.', 'dw-church-connector' ) . '</div>';
		}

		$classes = $this->build_class( 'dwc-staff', $atts );

		$html = '<div class="' . esc_attr( $classes ) . '">';
		foreach ( $staff_list as $member ) {
			$html .= '<div class="dwc-staff-card">';

			if ( ! empty( $member['photoUrl'] ) ) {
				$html .= '<img class="dwc-staff-card__photo" src="' . esc_url( $member['photoUrl'] ) . '" alt="' . esc_attr( $member['name'] ) . '" loading="lazy" />';
			} else {
				$html .= '<div class="dwc-staff-card__photo dwc-staff-card__photo--placeholder"></div>';
			}

			$html .= '<div class="dwc-staff-card__content">';
			$html .= '<h3 class="dwc-staff-card__name">' . esc_html( $member['name'] ) . '</h3>';

			if ( ! empty( $member['role'] ) ) {
				$html .= '<p class="dwc-staff-card__role">' . esc_html( $member['role'] ) . '</p>';
			}

			if ( ! empty( $member['department'] ) ) {
				$html .= '<p class="dwc-staff-card__department">' . esc_html( $member['department'] ) . '</p>';
			}

			if ( ! empty( $member['bio'] ) ) {
				$html .= '<p class="dwc-staff-card__bio">' . esc_html( $member['bio'] ) . '</p>';
			}

			// SNS links.
			if ( ! empty( $member['snsLinks'] ) && is_array( $member['snsLinks'] ) ) {
				$sns = $member['snsLinks'];
				$has_links = ! empty( $sns['facebook'] ) || ! empty( $sns['instagram'] ) || ! empty( $sns['youtube'] );
				if ( $has_links ) {
					$html .= '<div class="dwc-staff-card__sns">';
					if ( ! empty( $sns['facebook'] ) ) {
						$html .= '<a class="dwc-staff-card__sns-link" href="' . esc_url( $sns['facebook'] ) . '" target="_blank" rel="noopener noreferrer" aria-label="Facebook">FB</a>';
					}
					if ( ! empty( $sns['instagram'] ) ) {
						$html .= '<a class="dwc-staff-card__sns-link" href="' . esc_url( $sns['instagram'] ) . '" target="_blank" rel="noopener noreferrer" aria-label="Instagram">IG</a>';
					}
					if ( ! empty( $sns['youtube'] ) ) {
						$html .= '<a class="dwc-staff-card__sns-link" href="' . esc_url( $sns['youtube'] ) . '" target="_blank" rel="noopener noreferrer" aria-label="YouTube">YT</a>';
					}
					$html .= '</div>';
				}
			}

			$html .= '</div>'; // __content
			$html .= '</div>'; // staff-card
		}
		$html .= '</div>';

		return $html;
	}

	// ─── History ────────────────────────────────────────────────

	/**
	 * Render history shortcode.
	 *
	 * Usage: [dw_church_history class="my-class"]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string HTML output.
	 */
	public function render_history( $atts ) {
		$atts = shortcode_atts(
			array(
				'class' => '',
			),
			$atts,
			'dw_church_history'
		);

		$result = $this->client->get_cached( '/api/v1/history' );

		if ( is_wp_error( $result ) ) {
			return $this->render_error( $result );
		}

		$history_list = is_array( $result ) ? $result : array();
		if ( isset( $result['data'] ) && is_array( $result['data'] ) ) {
			$history_list = $result['data'];
		}

		if ( empty( $history_list ) ) {
			return '<div class="dwc-empty">' . esc_html__( 'No history entries found.', 'dw-church-connector' ) . '</div>';
		}

		$classes = $this->build_class( 'dwc-history', $atts );

		$html = '<div class="' . esc_attr( $classes ) . '">';
		foreach ( $history_list as $year_group ) {
			$html .= '<div class="dwc-history__year-group">';
			$html .= '<h3 class="dwc-history__year">' . esc_html( $year_group['year'] ) . '</h3>';

			if ( ! empty( $year_group['items'] ) && is_array( $year_group['items'] ) ) {
				$html .= '<ul class="dwc-history__items">';
				foreach ( $year_group['items'] as $item ) {
					$html .= '<li class="dwc-history__item">';
					$html .= '<span class="dwc-history__item-date">';

					if ( ! empty( $item['month'] ) ) {
						$html .= esc_html( $item['month'] );
						if ( ! empty( $item['day'] ) ) {
							$html .= '/' . esc_html( $item['day'] );
						}
					}

					$html .= '</span>';
					$html .= '<span class="dwc-history__item-content">' . esc_html( $item['content'] ) . '</span>';

					if ( ! empty( $item['photoUrl'] ) ) {
						$html .= '<img class="dwc-history__item-photo" src="' . esc_url( $item['photoUrl'] ) . '" alt="" loading="lazy" />';
					}

					$html .= '</li>';
				}
				$html .= '</ul>';
			}

			$html .= '</div>'; // year-group
		}
		$html .= '</div>';

		return $html;
	}

	// ─── Events ─────────────────────────────────────────────────

	/**
	 * Render events shortcode.
	 *
	 * Usage: [dw_church_events limit="4" class="my-class"]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string HTML output.
	 */
	public function render_events( $atts ) {
		$atts = shortcode_atts(
			array(
				'limit' => 4,
				'class' => '',
			),
			$atts,
			'dw_church_events'
		);

		$params = array(
			'per_page' => (int) $atts['limit'],
			'status'   => 'published',
		);

		$result = $this->client->get_cached( '/api/v1/events', $params );

		if ( is_wp_error( $result ) ) {
			return $this->render_error( $result );
		}

		$events = isset( $result['data'] ) ? $result['data'] : $result;
		if ( empty( $events ) || ! is_array( $events ) ) {
			return '<div class="dwc-empty">' . esc_html__( 'No events found.', 'dw-church-connector' ) . '</div>';
		}

		$classes = $this->build_class( 'dwc-events', $atts );

		$html = '<div class="' . esc_attr( $classes ) . '">';
		foreach ( $events as $event ) {
			$html .= '<div class="dwc-event-card">';

			$bg_image = ! empty( $event['backgroundImageUrl'] ) ? $event['backgroundImageUrl'] : '';
			if ( empty( $bg_image ) && ! empty( $event['thumbnailUrl'] ) ) {
				$bg_image = $event['thumbnailUrl'];
			}

			if ( ! empty( $bg_image ) ) {
				$html .= '<img class="dwc-event-card__image" src="' . esc_url( $bg_image ) . '" alt="' . esc_attr( $event['title'] ) . '" loading="lazy" />';
			}

			$html .= '<div class="dwc-event-card__content">';
			$html .= '<h3 class="dwc-event-card__title">' . esc_html( $event['title'] ) . '</h3>';

			if ( ! empty( $event['eventDate'] ) ) {
				$html .= '<span class="dwc-event-card__date">' . esc_html( $this->format_date( $event['eventDate'] ) ) . '</span>';
			}

			if ( ! empty( $event['location'] ) ) {
				$html .= '<span class="dwc-event-card__location">' . esc_html( $event['location'] ) . '</span>';
			}

			if ( ! empty( $event['department'] ) ) {
				$html .= '<span class="dwc-event-card__department">' . esc_html( $event['department'] ) . '</span>';
			}

			if ( ! empty( $event['description'] ) ) {
				$html .= '<p class="dwc-event-card__description">' . esc_html( wp_trim_words( $event['description'], 30, '...' ) ) . '</p>';
			}

			if ( ! empty( $event['linkUrl'] ) ) {
				$html .= '<a class="dwc-event-card__link" href="' . esc_url( $event['linkUrl'] ) . '" target="_blank" rel="noopener noreferrer">';
				$html .= esc_html__( 'Learn More', 'dw-church-connector' );
				$html .= '</a>';
			}

			$html .= '</div>'; // __content
			$html .= '</div>'; // event-card
		}
		$html .= '</div>';

		return $html;
	}

	// ─── Banners ────────────────────────────────────────────────

	/**
	 * Render banners shortcode.
	 *
	 * Usage: [dw_church_banners category="main" class="my-class"]
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string HTML output.
	 */
	public function render_banners( $atts ) {
		$atts = shortcode_atts(
			array(
				'category' => 'main',
				'class'    => '',
			),
			$atts,
			'dw_church_banners'
		);

		$params = array(
			'category' => sanitize_text_field( $atts['category'] ),
			'active'   => 'true',
			'status'   => 'published',
		);

		$result = $this->client->get_cached( '/api/v1/banners', $params );

		if ( is_wp_error( $result ) ) {
			return $this->render_error( $result );
		}

		$banners = isset( $result['data'] ) ? $result['data'] : $result;
		if ( empty( $banners ) || ! is_array( $banners ) ) {
			return '';
		}

		$classes   = $this->build_class( 'dwc-banners', $atts );
		$slider_id = 'dwc-banner-slider-' . wp_unique_id();

		$html = '<div class="' . esc_attr( $classes ) . '" id="' . esc_attr( $slider_id ) . '" data-dwc-banner-slider>';
		$html .= '<div class="dwc-banners__track">';

		foreach ( $banners as $index => $banner ) {
			$active_class = 0 === $index ? ' dwc-banner-slide--active' : '';
			$html .= '<div class="dwc-banner-slide' . $active_class . '">';

			// Responsive images: mobile and desktop.
			$pc_image     = ! empty( $banner['pcImageUrl'] ) ? $banner['pcImageUrl'] : '';
			$mobile_image = ! empty( $banner['mobileImageUrl'] ) ? $banner['mobileImageUrl'] : $pc_image;

			if ( ! empty( $pc_image ) ) {
				$html .= '<picture class="dwc-banner-slide__picture">';
				if ( $mobile_image !== $pc_image ) {
					$html .= '<source media="(max-width: 768px)" srcset="' . esc_url( $mobile_image ) . '" />';
				}
				$html .= '<img class="dwc-banner-slide__image" src="' . esc_url( $pc_image ) . '" alt="' . esc_attr( $banner['title'] ) . '" loading="lazy" />';
				$html .= '</picture>';
			}

			// Text overlay.
			if ( ! empty( $banner['textOverlay'] ) ) {
				$overlay  = $banner['textOverlay'];
				$position = ! empty( $overlay['position'] ) ? $overlay['position'] : 'center-center';
				$align    = ! empty( $overlay['align'] ) ? $overlay['align'] : 'center';

				$html .= '<div class="dwc-banner-slide__overlay dwc-banner-slide__overlay--' . esc_attr( $position ) . ' dwc-banner-slide__overlay--align-' . esc_attr( $align ) . '">';

				if ( ! empty( $overlay['heading'] ) ) {
					$html .= '<h2 class="dwc-banner-slide__heading">' . esc_html( $overlay['heading'] ) . '</h2>';
				}
				if ( ! empty( $overlay['subheading'] ) ) {
					$html .= '<p class="dwc-banner-slide__subheading">' . esc_html( $overlay['subheading'] ) . '</p>';
				}
				if ( ! empty( $overlay['description'] ) ) {
					$html .= '<p class="dwc-banner-slide__description">' . esc_html( $overlay['description'] ) . '</p>';
				}

				$html .= '</div>';
			}

			// Link wrapper.
			if ( ! empty( $banner['linkUrl'] ) ) {
				$target = ! empty( $banner['linkTarget'] ) ? $banner['linkTarget'] : '_self';
				$html .= '<a class="dwc-banner-slide__link" href="' . esc_url( $banner['linkUrl'] ) . '" target="' . esc_attr( $target ) . '" rel="noopener noreferrer" aria-label="' . esc_attr( $banner['title'] ) . '"></a>';
			}

			$html .= '</div>'; // banner-slide
		}

		$html .= '</div>'; // __track

		// Navigation dots.
		if ( count( $banners ) > 1 ) {
			$html .= '<div class="dwc-banners__dots">';
			foreach ( $banners as $index => $banner ) {
				$dot_active = 0 === $index ? ' dwc-banners__dot--active' : '';
				$html .= '<button class="dwc-banners__dot' . $dot_active . '" data-slide="' . (int) $index . '" aria-label="' . sprintf(
					/* translators: %d: slide number */
					esc_attr__( 'Slide %d', 'dw-church-connector' ),
					$index + 1
				) . '"></button>';
			}
			$html .= '</div>';

			// Previous/Next buttons.
			$html .= '<button class="dwc-banners__prev" data-dwc-prev aria-label="' . esc_attr__( 'Previous slide', 'dw-church-connector' ) . '">&lsaquo;</button>';
			$html .= '<button class="dwc-banners__next" data-dwc-next aria-label="' . esc_attr__( 'Next slide', 'dw-church-connector' ) . '">&rsaquo;</button>';
		}

		$html .= '</div>';

		return $html;
	}
}
