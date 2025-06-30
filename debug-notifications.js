// Debug script to check notification status
console.log('=== NOTIFICATION DEBUG INFO ===');

// Check if Notification API is supported
console.log('1. Notification API Support:', 'Notification' in window);

// Check current permission
if ('Notification' in window) {
    console.log('2. Current Permission:', Notification.permission);
} else {
    console.log('2. Notification API not supported');
}

// Check Service Worker support
console.log('3. Service Worker Support:', 'serviceWorker' in navigator);

// Check Push Manager support
console.log('4. Push Manager Support:', 'PushManager' in window);

// Check if service worker is registered
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(registration => {
        console.log('5. Service Worker Registration:', registration ? 'Found' : 'Not found');
        if (registration) {
            console.log('   - Scope:', registration.scope);
            console.log('   - State:', registration.active ? registration.active.state : 'inactive');
        }
    });
} else {
    console.log('5. Service Worker not supported');
}

// Test basic notification
window.testBasicNotification = async function() {
    console.log('Testing basic notification...');
    
    if (!('Notification' in window)) {
        console.error('Notifications not supported');
        return;
    }
    
    if (Notification.permission === 'default') {
        console.log('Requesting permission...');
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
    }
    
    if (Notification.permission === 'granted') {
        console.log('Creating notification...');
        const notification = new Notification('Test Notification', {
            body: 'This is a test notification',
            icon: './icon-192x192.png'
        });
        
        notification.onclick = function() {
            console.log('Notification clicked!');
            this.close();
        };
        
        console.log('Notification created');
    } else {
        console.error('Permission not granted');
    }
};

// Test service worker notification
window.testServiceWorkerNotification = async function() {
    console.log('Testing service worker notification...');
    
    if (!('serviceWorker' in navigator)) {
        console.error('Service Worker not supported');
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        console.log('Service worker ready');
        
        await registration.showNotification('SW Test Notification', {
            body: 'This is a service worker notification test',
            icon: './icon-192x192.png',
            badge: './icon-72x72.png'
        });
        
        console.log('Service worker notification sent');
    } catch (error) {
        console.error('Service worker notification failed:', error);
    }
};

console.log('=== DEBUG FUNCTIONS AVAILABLE ===');
console.log('Use testBasicNotification() to test basic notifications');
console.log('Use testServiceWorkerNotification() to test SW notifications');
console.log('===================================');
