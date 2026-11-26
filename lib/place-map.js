/* 장소 페이지 임베디드 지도 — MapLibre GL + OpenFreeMap (thailivenow 스타일) */
(function () {
  var els = document.querySelectorAll('.place-map[data-lat]');
  if (!els.length) return;
  function init() {
    if (typeof maplibregl === 'undefined') { setTimeout(init, 300); return; }
    els.forEach(function (el) {
      if (el.dataset.pmInit) return;
      el.dataset.pmInit = '1';
      var lat = parseFloat(el.dataset.lat), lon = parseFloat(el.dataset.lon);
      if (!isFinite(lat) || !isFinite(lon)) return;
      var label = el.dataset.label || '';
      var approx = el.classList.contains('place-map-approx');
      try {
        var map = new maplibregl.Map({
          container: el,
          style: 'https://tiles.openfreemap.org/styles/liberty',
          center: [lon, lat],
          zoom: approx ? 12.5 : 15.5,
          scrollZoom: false,
          attributionControl: false
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'topright');
        map.addControl(new maplibregl.AttributionControl({
          compact: true,
          customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        }), 'bottomright');
        var pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'pm-pin';
        pin.textContent = label || '📍';
        pin.setAttribute('aria-label', label || '위치');
        var popup = new maplibregl.Popup({ offset: 18, closeButton: false })
          .setHTML('<div style="font-size:13px;line-height:1.5"><b>' +
            (label || '위치').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</b><br>' +
            (approx ? '<span style="color:#888;font-size:11px">도시 중심 기준 위치 · 정확한 좌표 미확보</span><br>' : '') +
            '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon + '" target="_blank" rel="noopener">길찾기 ↗</a></div>');
        new maplibregl.Marker({ element: pin })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map);
        pin.addEventListener('click', function () { popup.addTo(map); });
      } catch (e) {
        el.innerHTML = '<p style="padding:16px;color:#888;font-size:13px">지도를 표시하지 못했습니다. 아래 지도 링크를 이용하세요.</p>';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
