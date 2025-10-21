<?php
/**
 * Class Test_Meta_Boxes
 *
 * @package Dasom_Church
 */

/**
 * Test meta box functionality
 */
class Test_Meta_Boxes extends WP_UnitTestCase {

    /**
     * Test bulletin meta save and retrieve
     */
    public function test_bulletin_meta_save() {
        $post_id = $this->factory->post->create([
            'post_type' => 'bulletin',
            'post_title' => 'Test Bulletin',
        ]);

        // Save meta
        update_post_meta($post_id, 'dw_bulletin_date', '2025-10-20');
        update_post_meta($post_id, 'dw_bulletin_attachment', '123');

        // Retrieve meta
        $date = get_post_meta($post_id, 'dw_bulletin_date', true);
        $attachment = get_post_meta($post_id, 'dw_bulletin_attachment', true);

        $this->assertEquals('2025-10-20', $date);
        $this->assertEquals('123', $attachment);

        // Clean up
        wp_delete_post($post_id, true);
    }

    /**
     * Test sermon meta save and retrieve
     */
    public function test_sermon_meta_save() {
        $post_id = $this->factory->post->create([
            'post_type' => 'sermon',
            'post_title' => 'Test Sermon',
        ]);

        // Save meta
        update_post_meta($post_id, 'dw_sermon_date', '2025-10-20');
        update_post_meta($post_id, 'dw_sermon_title', 'Test Sermon Title');
        update_post_meta($post_id, 'dw_sermon_scripture', 'John 3:16');

        // Retrieve meta
        $date = get_post_meta($post_id, 'dw_sermon_date', true);
        $title = get_post_meta($post_id, 'dw_sermon_title', true);
        $scripture = get_post_meta($post_id, 'dw_sermon_scripture', true);

        $this->assertEquals('2025-10-20', $date);
        $this->assertEquals('Test Sermon Title', $title);
        $this->assertEquals('John 3:16', $scripture);

        // Clean up
        wp_delete_post($post_id, true);
    }

    /**
     * Test event meta save and retrieve
     */
    public function test_event_meta_save() {
        $post_id = $this->factory->post->create([
            'post_type' => 'event',
            'post_title' => 'Test Event',
        ]);

        // Save meta
        update_post_meta($post_id, 'dw_event_department', '청년부');
        update_post_meta($post_id, 'dw_event_datetime', '2025년 10월 20일 오후 3시');
        update_post_meta($post_id, 'dw_event_url', 'https://example.com');

        // Retrieve meta
        $department = get_post_meta($post_id, 'dw_event_department', true);
        $datetime = get_post_meta($post_id, 'dw_event_datetime', true);
        $url = get_post_meta($post_id, 'dw_event_url', true);

        $this->assertEquals('청년부', $department);
        $this->assertEquals('2025년 10월 20일 오후 3시', $datetime);
        $this->assertEquals('https://example.com', $url);

        // Clean up
        wp_delete_post($post_id, true);
    }

    /**
     * Test banner meta save and retrieve
     */
    public function test_banner_meta_save() {
        $post_id = $this->factory->post->create([
            'post_type' => 'banner',
            'post_title' => 'Test Banner',
        ]);

        // Save meta
        update_post_meta($post_id, 'dw_banner_pc_image', '456');
        update_post_meta($post_id, 'dw_banner_mobile_image', '789');
        update_post_meta($post_id, 'dw_banner_url', 'https://example.com');

        // Retrieve meta
        $pc_image = get_post_meta($post_id, 'dw_banner_pc_image', true);
        $mobile_image = get_post_meta($post_id, 'dw_banner_mobile_image', true);
        $url = get_post_meta($post_id, 'dw_banner_url', true);

        $this->assertEquals('456', $pc_image);
        $this->assertEquals('789', $mobile_image);
        $this->assertEquals('https://example.com', $url);

        // Clean up
        wp_delete_post($post_id, true);
    }
}

