/** Sets back link on universal comic reader from ?series= slug */
document.addEventListener("DOMContentLoaded", () => {
  const back = document.getElementById("comic-back-link");
  if (!back) return;

  const seriesSlug = new URLSearchParams(window.location.search).get("series");
  if (seriesSlug) {
    back.innerHTML = `
      <a class="nav-btn" href="../series-view/?series=${encodeURIComponent(seriesSlug)}">← Back to volumes</a>
      <a class="nav-btn" href="../">← Back to comics</a>
    `;
  } else {
    back.innerHTML = `<a class="nav-btn" href="../">← Back to comics</a>`;
  }
});
