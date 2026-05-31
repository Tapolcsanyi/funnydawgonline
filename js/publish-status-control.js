/**
 * Draft / published toggle with a clear status banner.
 */
const PublishStatusControl = (function () {
  function create(mountEl, options = {}) {
    const label = options.label ?? "item";
    const onChange = options.onChange ?? (async () => {});

    mountEl.className = "publish-status-control";
    mountEl.replaceChildren();

    const row = document.createElement("div");
    row.className = "publish-status-row";

    const labelEl = document.createElement("span");
    labelEl.className = "publish-status-label";
    labelEl.textContent = `${label} visibility`;

    const switchLabel = document.createElement("label");
    switchLabel.className = "publish-status-switch";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("role", "switch");

    const track = document.createElement("span");
    track.className = "publish-status-track";
    const thumb = document.createElement("span");
    thumb.className = "publish-status-thumb";
    track.appendChild(thumb);

    const switchText = document.createElement("span");
    switchText.className = "publish-status-switch-text";

    switchLabel.append(checkbox, track, switchText);
    row.append(labelEl, switchLabel);

    const banner = document.createElement("p");
    banner.className = "publish-status-banner";

    mountEl.append(row, banner);

    function render(status) {
      const published = ComicModels.isPublished(status);
      checkbox.checked = published;
      switchText.textContent = published ? "Published" : "Draft";
      banner.className = `publish-status-banner publish-status-banner--${published ? "published" : "draft"}`;
      banner.textContent = published
        ? `This ${label.toLowerCase()} is PUBLISHED`
        : `This ${label.toLowerCase()} is A DRAFT`;
    }

    render(options.initialStatus ?? ComicModels.VOLUME_STATUS.DRAFT);

    checkbox.addEventListener("change", async () => {
      const next = checkbox.checked
        ? ComicModels.VOLUME_STATUS.PUBLISHED
        : ComicModels.VOLUME_STATUS.DRAFT;
      const prev = checkbox.checked
        ? ComicModels.VOLUME_STATUS.DRAFT
        : ComicModels.VOLUME_STATUS.PUBLISHED;
      try {
        await onChange(next);
        render(next);
        options.onStatusChange?.(next);
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        render(prev);
        throw err;
      }
    });

    return { setStatus: render, getStatus: () => (checkbox.checked ? ComicModels.VOLUME_STATUS.PUBLISHED : ComicModels.VOLUME_STATUS.DRAFT) };
  }

  return { create };
})();
