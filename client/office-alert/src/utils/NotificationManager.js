// ============================================
// Notification Manager
// Single entry point for ALL notifications.
// ============================================

const pendingCounts = {}; // sender -> unread count
let groupTimers = {};     // sender -> debounce timer

/**
 * notify({ type, sender, body })
 *
 * type   : "message" | "bell"
 * sender : username of the person who triggered the event
 * body   : text to display (message content or call text)
 */
export function notify({ type, sender, body }) {
  console.log("🔔 NotificationManager.notify() called:", { type, sender, body });

  // ── Guard: permission ──
  if (!("Notification" in window)) { console.log("❌ Notification API not supported"); return; }
  if (Notification.permission !== "granted") { console.log("❌ Permission not granted:", Notification.permission); return; }

  // ── Guard: app is focused → no Windows notification ──
  console.log("👁 document.hidden:", document.hidden);
  if (!document.hidden) { console.log("⏭ App is focused, skipping notification"); return; }

  // ── Bell notifications: show immediately, no grouping ──
  if (type === "bell") {
    showWindowsNotification({
      title: "🔔 Office Alert",
      body: `${sender} is calling you.`,
      tag: `bell-${sender}`,
      sender,
    });
    return;
  }

  // ── Message notifications: group spam ──
  if (!pendingCounts[sender]) {
    pendingCounts[sender] = 0;
  }
  pendingCounts[sender]++;

  // Debounce: wait 300ms for rapid messages before showing
  clearTimeout(groupTimers[sender]);
  groupTimers[sender] = setTimeout(() => {
    const count = pendingCounts[sender];

    const title = `💬 ${sender}`;
    const displayBody =
      count > 1 ? `${count} new messages` : body;

    showWindowsNotification({
      title,
      body: displayBody,
      tag: `msg-${sender}`, // reuses same tag → replaces previous
      sender,
    });

    // Reset count after showing
    pendingCounts[sender] = 0;
  }, 300);
}

/**
 * Reset counts when user opens a chat
 * Call this from ChatWindow when a conversation is opened.
 */
export function clearNotificationCount(sender) {
  if (sender) {
    pendingCounts[sender] = 0;
    clearTimeout(groupTimers[sender]);
  }
}

// ── Internal: create the actual Windows notification ──
function showWindowsNotification({ title, body, tag, sender }) {
  console.log("✅ Creating Windows notification:", { title, body, tag });

  const notification = new Notification(title, {
    body,
    tag, // same tag = replaces existing notification
  });

  notification.onshow = () => console.log("✅ Notification shown!");
  notification.onerror = (e) => console.log("❌ Notification error:", e);

  notification.onclick = () => {
    window.focus();

    window.dispatchEvent(
      new CustomEvent("open-chat", {
        detail: sender,
      })
    );

    notification.close();
  };
}
