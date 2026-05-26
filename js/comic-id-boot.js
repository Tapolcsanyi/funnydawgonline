(function () {
  function applySeriesVolume(seriesId, volumeId) {
    document.body.setAttribute("data-series-id", seriesId);
    document.body.setAttribute("data-volume-id", volumeId);
  }

  function applySeries(seriesId) {
    document.body.setAttribute("data-series-id", seriesId);
  }

  const volumeMatch = window.location.pathname.match(
    /[/\\]comics[/\\]series[/\\](\d+)[/\\]volume[/\\](\d+)[/\\]?/i
  );
  if (volumeMatch) {
    const apply = () => applySeriesVolume(volumeMatch[1], volumeMatch[2]);
    if (document.body) apply();
    else document.addEventListener("DOMContentLoaded", apply);
    return;
  }

  const seriesMatch = window.location.pathname.match(
    /[/\\]comics[/\\]series[/\\](\d+)[/\\]?/i
  );
  if (seriesMatch && !/\/volume\//i.test(window.location.pathname)) {
    const apply = () => applySeries(seriesMatch[1]);
    if (document.body) apply();
    else document.addEventListener("DOMContentLoaded", apply);
  }
})();
