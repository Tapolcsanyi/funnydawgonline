(function () {
  const TOTAL_LOGS = 12;
  const READABLE = new Set([1, 4, 9, 12]);

  const LOG_BODY = {
    1: "Investigators have documented the first signs of a potentially redacted system behavior. The interior volume of the vacuum vessel began exhibiting redacted redacted redacted not predicted by any containment model. Laser ranging equipment was used to measure path lengths through the chamber that varied by fractions of a percent depending on direction, despite no physical deformation of the vessel. more concerning were the intermittent phase inversions observed in diagnostic signals entering the active test volume. Data packets transmitted through the central plasma region occasionally returned with time signatures suggesting propagation delays below theoretical limits. the circuit redacted redacted redacted and a recommendation was issued to cease testing for the time being. The recommendation was overruled by the Project Manager, who, to no single person's surprise, is set on running it her way. Money can only by so much....",
    4: "The circuit remained active for days. After 73 consecutive hours of emitting the blanket, the standing wave structure intensified and condensed into a highly ordered lattice pattern distributed evenly throughout the volume of the vessel. As power began to exponentially increase, the blanket began to reconfigure itself in response to the stronger feedback signals, redacted redacted outside of the volume.Internal mapped regions of fluctuating energy inside the vacuum vessel that appeared to rotate throughout the chamber, independent of plasma motion. Seconds before loss of telemetry, multiple instruments detected redacted occupying the same physical coordinates inside of the vacuum vessel. Video records were lost, but the researchers present at the time described seeing a rapidly expanding distortion forming at the center of the lattice, followed by a complete collapse in measurement consistency across all monitoring and observational systems. Reliable data had ceased to be collected. This was the start of redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted. redacted.",
    9: "I must have been furthest from the vessel. Everyone around me turned and winced as if being punched in the gut, all at once. Readings indicated dangerous levels of escaped carbon dioxide from the vessel. A high pressure stream of putrid air hit me like I was standing behind a jet engine made from rotting corpses and bile. I don't remember what happened after the flash, besides being abhorrently sick to my stomach. I remember they wouldn't let me leave for dats until they released the official statement. They told the public and the court that everyone had inexplicably disappeared voluntarily. The load of money that the board provided did a good job at convincing the judge. Nothing ever came to light.",
    12: "The truth is still elusive to me. The information publicized by Vantex contradicts the tapes that I had recorded. I left them where I made them. Site 09. Whatever happened there that day has changed me. I need to know what happened to everyone. To Reyes. I know she's out there.",
  };

  const listEl = document.getElementById("results-log-list");
  const titleEl = document.getElementById("results-viewer-title");
  const bodyEl = document.getElementById("results-viewer-body");
  const headEl = document.getElementById("results-viewer-head");
  const statusEl = document.getElementById("results-status");

  if (!listEl || !titleEl || !bodyEl) return;

  let activeId = null;

  function logLabel(n) {
    return `LOG ${String(n).padStart(2, "0")}`;
  }

  function bodyFor(id) {
    if (READABLE.has(id)) return LOG_BODY[id] ?? "filler.";
    return "redacted.";
  }

  function renderList() {
    listEl.replaceChildren();
    for (let i = 1; i <= TOTAL_LOGS; i++) {
      const li = document.createElement("li");
      li.className = "results-log-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "results-log-btn";
      if (!READABLE.has(i)) btn.classList.add("results-log-btn--redacted");
      btn.dataset.logId = String(i);
      const span = document.createElement("span");
      span.textContent = logLabel(i);
      btn.appendChild(span);
      const tag = document.createElement("span");
      tag.className = "results-log-tag";
      tag.textContent = READABLE.has(i) ? "=>" : "==";
      btn.appendChild(tag);
      btn.addEventListener("click", () => selectLog(i));
      li.appendChild(btn);
      listEl.appendChild(li);
    }
  }

  function updateActiveButtons() {
    listEl.querySelectorAll(".results-log-btn").forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.logId) === activeId);
    });
  }

  function selectLog(id) {
    activeId = id;
    updateActiveButtons();
    const readable = READABLE.has(id);
    titleEl.textContent = logLabel(id);
    bodyEl.textContent = bodyFor(id);
    bodyEl.classList.toggle("results-viewer-body--idle", false);
    if (headEl) {
      headEl.textContent = readable
        ? `vantex-admin@archive:~/engineer/logs/${String(id).padStart(2, "0")}.txt$ cat`
        : `vantex-admin@archive:~/engineer/logs/${String(id).padStart(2, "0")}.txt$ [access denied — scrubbed]`;
    }
    if (statusEl) {
      statusEl.textContent = readable
        ? "stream: decrypted fragment · researcher channel"
        : "stream: ████████ · automatic redaction layer";
    }
  }

  function showIdle() {
    titleEl.textContent = "—";
    bodyEl.textContent = "select a log file from the index ←";
    bodyEl.classList.add("results-viewer-body--idle");
    if (headEl) headEl.textContent = "vantex-admin@archive:~/engineer/logs$ ls";
    if (statusEl) statusEl.textContent = "12 entries · 4 partial restores · remainder redacted.";
  }

  renderList();
  showIdle();
})();