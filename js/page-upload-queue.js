/**
 * Ordered page queue for comic uploads/edits. Each item has a stable queue id for reordering.
 */
const PageUploadQueue = (function () {
  function create(mountEl, options = {}) {
    const onChange = options.onChange ?? (() => {});
    const items = [];
    let nextId = 1;

    function displayName(item) {
      return item.label || item.file?.name || "Page";
    }

    function render() {
      if (!mountEl) return;
      mountEl.replaceChildren();

      if (items.length === 0) {
        const empty = document.createElement("p");
        empty.className = "catalog-meta";
        empty.textContent = options.emptyText ?? "No pages yet. Add images below.";
        mountEl.appendChild(empty);
        onChange(items);
        return;
      }

      const list = document.createElement("ol");
      list.className = "page-queue-list";
      list.setAttribute("aria-label", "Page order");

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const li = document.createElement("li");
        li.className = "page-queue-item";
        li.dataset.queueId = String(item.id);

        const badge = document.createElement("span");
        badge.className = "page-queue-order";
        badge.textContent = String(index + 1);

        const preview = document.createElement("img");
        preview.className = "page-queue-preview";
        preview.src = item.previewUrl;
        preview.alt = displayName(item);

        const meta = document.createElement("span");
        meta.className = "page-queue-name";
        meta.textContent = displayName(item);

        const idLabel = document.createElement("span");
        idLabel.className = "page-queue-id catalog-meta";
        idLabel.textContent =
          item.kind === "existing" ? `saved · ${item.pageId}` : `new · queue ${item.id}`;

        const controls = document.createElement("div");
        controls.className = "page-queue-controls";

        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "category-btn";
        upBtn.textContent = "↑";
        upBtn.disabled = index === 0;
        upBtn.addEventListener("click", () => move(item.id, -1));

        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "category-btn";
        downBtn.textContent = "↓";
        downBtn.disabled = index === items.length - 1;
        downBtn.addEventListener("click", () => move(item.id, 1));

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "category-btn";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => remove(item.id));

        controls.append(upBtn, downBtn, removeBtn);
        li.append(badge, preview, meta, idLabel, controls);
        list.appendChild(li);
      }

      mountEl.appendChild(list);
      onChange(items);
    }

    function addFiles(fileList) {
      for (const file of fileList) {
        if (!file.type.startsWith("image/")) continue;
        const id = nextId;
        nextId += 1;
        items.push({
          id,
          kind: "new",
          file,
          label: file.name,
          previewUrl: URL.createObjectURL(file),
          revokeOnRemove: true,
        });
      }
      render();
    }

    function addExisting(existingPages) {
      for (const page of existingPages) {
        const id = nextId;
        nextId += 1;
        items.push({
          id,
          kind: "existing",
          pageId: page.pageId,
          storagePath: page.storagePath,
          label: page.label ?? page.alt ?? "Page",
          previewUrl: page.previewUrl,
          revokeOnRemove: false,
        });
      }
      render();
    }

    function move(id, delta) {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return;
      const target = index + delta;
      if (target < 0 || target >= items.length) return;
      const [row] = items.splice(index, 1);
      items.splice(target, 0, row);
      render();
    }

    function remove(id) {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return;
      const [row] = items.splice(index, 1);
      if (row.revokeOnRemove) URL.revokeObjectURL(row.previewUrl);
      render();
    }

    function getOrderedFiles() {
      return items.filter((item) => item.kind === "new" && item.file).map((item) => item.file);
    }

    function getOrderedItems() {
      return items.map((item) => ({
        kind: item.kind,
        pageId: item.pageId,
        storagePath: item.storagePath,
        file: item.file,
        label: displayName(item),
      }));
    }

    function clear() {
      for (const item of items) {
        if (item.revokeOnRemove) URL.revokeObjectURL(item.previewUrl);
      }
      items.length = 0;
      render();
    }

    render();
    return {
      addFiles,
      addExisting,
      move,
      remove,
      getOrderedFiles,
      getOrderedItems,
      clear,
      getItems: () => [...items],
    };
  }

  return { create };
})();
