function initCategoryBar() {
  const mount = document.getElementById("category-bar");
  if (!mount) return;

  const raw = mount.dataset.categories || "All";
  const labels = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (labels.length === 0) labels.push("All");

  const bar = document.createElement("div");
  bar.className = "category-bar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Categories");

  labels.forEach((label, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-btn";
    btn.textContent = label;
    if (index === 0) btn.classList.add("is-active");

    btn.addEventListener("click", () => {
      bar.querySelectorAll(".category-btn").forEach((b) => {
        b.classList.remove("is-active");
      });
      btn.classList.add("is-active");
    });

    bar.appendChild(btn);
  });

  mount.replaceChildren(bar);
}

initCategoryBar();
