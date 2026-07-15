export function showNotification(title, body, sender) {
  if (Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body,
    tag: sender,
  });

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
