export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return false;
    }

    if (Notification.permission === "granted") {
        return "granted";
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return "denied";
};

export const sendNotification = (title, options = {}) => {
    if (!("Notification" in window)) return null;

    // Logic: Browser notification if tab is hidden/unfocused.
    // App notification (handled via callback or returned obj) if focused.
    const isFocused = document.hasFocus();

    if (Notification.permission === "granted" && !isFocused) {
        const notification = new Notification(title, {
            icon: '/logo.svg',
            ...options
        });

        notification.onclick = function (event) {
            event.preventDefault();
            window.focus();
            notification.close();
        };

        return { type: 'browser', notification };
    }

    // If focused or permission denied, we signal to show an In-App notification
    return { type: 'app', title, options };
};
