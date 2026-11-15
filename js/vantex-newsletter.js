(function () {
  const form = document.getElementById("vantex-newsletter");
  const notice = document.getElementById("vantex-newsletter-notice");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]')?.value?.trim();
    if (!email) return;
    if (notice) {
      notice.textContent = `Thank you. Updates for ${email} will be sent when the list is active.`;
      notice.hidden = false;
    }
    form.reset();
  });
})();