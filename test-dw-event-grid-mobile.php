<?php
/**
 * DW Event Grid Mobile CSS Test
 * Test file to verify mobile CSS issues
 */

// Simulate mobile viewport
echo "<!DOCTYPE html>
<html>
<head>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>DW Event Grid Mobile Test</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .test-container { max-width: 375px; margin: 0 auto; border: 2px solid #ccc; padding: 10px; }
        .test-title { background: #f0f0f0; padding: 10px; margin-bottom: 20px; }
        .test-footer { background: #333; color: white; padding: 20px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class='test-container'>
        <div class='test-title'>DW Event Grid Mobile Test (375px width)</div>
        
        <div class='dw-event-grid-wrapper'>
            <div class='dw-event-grid'>
                <div class='dw-event-grid-item'>
                    <div class='dw-event-grid-image'>
                        <img src='https://via.placeholder.com/300x200' alt='Test Image'>
                    </div>
                    <div class='dw-event-grid-overlay'></div>
                    <div class='dw-event-grid-text'>
                        <div class='dw-event-grid-text-content'>
                            <h3 class='dw-event-grid-title'>Test Event Title</h3>
                            <div class='dw-event-grid-datetime'>2024-01-01</div>
                            <button class='dw-event-grid-button'>Read More</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class='test-footer'>Footer Content - Should appear below DW Event Grid</div>
    </div>
</body>
</html>";
?>
