<?php
/**
 * Class Test_Custom_Post_Types
 *
 * @package DW_Church
 */

/**
 * Test custom post types registration
 */
class Test_Custom_Post_Types extends WP_UnitTestCase {

    /**
     * Test bulletin post type is registered
     */
    public function test_bulletin_post_type_exists() {
        $this->assertTrue(post_type_exists('bulletin'));
    }

    /**
     * Test sermon post type is registered
     */
    public function test_sermon_post_type_exists() {
        $this->assertTrue(post_type_exists('sermon'));
    }

    /**
     * Test column post type is registered
     */
    public function test_column_post_type_exists() {
        $this->assertTrue(post_type_exists('column'));
    }

    /**
     * Test album post type is registered
     */
    public function test_album_post_type_exists() {
        $this->assertTrue(post_type_exists('album'));
    }

    /**
     * Test banner post type is registered
     */
    public function test_banner_post_type_exists() {
        $this->assertTrue(post_type_exists('banner'));
    }

    /**
     * Test event post type is registered
     */
    public function test_event_post_type_exists() {
        $this->assertTrue(post_type_exists('event'));
    }

    /**
     * Test bulletin post type capabilities
     */
    public function test_bulletin_post_type_capabilities() {
        $post_type = get_post_type_object('bulletin');
        $this->assertTrue($post_type->public);
        $this->assertTrue($post_type->has_archive);
        $this->assertTrue($post_type->show_ui);
    }

    /**
     * Test sermon post type supports
     */
    public function test_sermon_post_type_supports() {
        $this->assertTrue(post_type_supports('sermon', 'title'));
    }
}

