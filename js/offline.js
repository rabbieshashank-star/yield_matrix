if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Yield Matrix service worker registered:', registration.scope);
            })
            .catch(error => {
                console.warn('Service worker registration failed:', error);
            });
    });
}

window.addEventListener('online', () => {
    console.log('You are online.');
});

window.addEventListener('offline', () => {
    console.log('You are offline.');
});
