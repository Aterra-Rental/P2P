export const showTopNotification = (
  message,
  type = "info",
  duration = 4000
) => {
  window.dispatchEvent(
    new CustomEvent("show-top-notification", {
      detail: {
        message,
        type,
        duration,
      },
    })
  );
};