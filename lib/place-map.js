/* 장소 페이지 임베디드 지도 — MapLibre GL + OpenFreeMap (thailivenow 스타일) */
(function () {
  var els = document.querySelectorAll('.place-map[data-lat]');
  if (!els.length) return;
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
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
        map.on('error', function () {});
        var done = false;
        function setup() {
          if (done) return;
          done = true;
          try {
            map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
            map.addControl(new maplibregl.AttributionControl({
              compact: true,
              customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
            }), 'bottom-right');
            var pin = document.createElement('button');
            pin.type = 'button';
            pin.className = 'pm-pin';
            pin.textContent = label || '📍';
            pin.setAttribute('aria-label', label || '위치');
            var popup = new maplibregl.Popup({ offset: 18, closeButton: false })
              .setHTML('<div style="font-size:13px;line-height:1.5"><b>' + esc(label || '위치') + '</b><br>' +
                (approx ? '<span style="color:#888;font-size:11px">도시 중심 기준 위치 · 정확한 좌표 미확보</span><br>' : '') +
                '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon + '" target="_blank" rel="noopener">길찾기 ↗</a></div>');
            new maplibregl.Marker({ element: pin })
              .setLngLat([lon, lat])
              .setPopup(popup)
              .addTo(map);
            pin.addEventListener('click', function () { popup.addTo(map); });
          } catch (e2) {
            done = false;
            el.insertAdjacentHTML('beforeend', '<p style="padding:10px;color:#888;font-size:12px">핀 표시 실패 (' + String(e2 && e2.message || e2).replace(/</g, '&lt;') + ') — 지도를 확대해 확인하세요.</p>');
          }
        }
        map.on('styledata', setup);
        map.on('load', setup);
        map.on('idle', setup);
        setTimeout(setup, 4000);
      } catch (e) {
        el.innerHTML = '<p style="padding:16px;color:#888;font-size:13px">지도를 표시하지 못했습니다. 아래 지도 링크를 이용하세요.</p>';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
