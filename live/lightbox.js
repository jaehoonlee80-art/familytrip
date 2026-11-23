// CCTV/라이브 화면 클릭 시 확대 라이트박스 — 모든 페이지 공통
// 대상: .cam-card video, 스냅샷 이미지(.cam-img/.sn-img/.yj-img/.port-img), 라이브 iframe(.live-embed/.knps-card/.portal-frame)
(function(){
if(window.__lbInit)return;window.__lbInit=true;
var overlay=null,moved=null,movedParent=null,movedNext=null;
function ensure(){
 if(overlay)return overlay;
 overlay=document.createElement('div');
 overlay.id='cctv-lb';
 overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;display:none;align-items:center;justify-content:center;cursor:zoom-out';
 if(window.__lbCss)return;window.__lbCss=true;
 var st=document.createElement('style');st.textContent='.live-grid video,.live-grid img,.live-grid iframe,.knps-ph{cursor:zoom-in}';document.head.appendChild(st);
 overlay.innerHTML='<div style="position:relative;max-width:96vw;max-height:92vh;width:100%;display:flex;flex-direction:column;align-items:center">'
  +'<div id="clb-bar" style="color:#fff;font-size:14px;margin-bottom:8px;display:flex;gap:10px;align-items:center"><span id="clb-t"></span><button id="clb-mute" style="display:none;background:#fff;border:0;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer">🔇 소리 켜기</button><button id="clb-x" style="background:#fff;border:0;border-radius:8px;padding:4px 12px;font-size:14px;cursor:pointer">✕ 닫기</button></div>'
  +'<div id="clb-body" style="width:100%;display:flex;align-items:center;justify-content:center"></div></div>';
 document.body.appendChild(overlay);
 overlay.addEventListener('click',function(e){if(e.target===overlay||e.target.id==='clb-body'||e.target.id==='clb-x')close();});
 document.getElementById('clb-x').addEventListener('click',close);
 document.getElementById('clb-mute').addEventListener('click',function(){
  var v=document.querySelector('#clb-body video');if(!v)return;
  v.muted=!v.muted;this.textContent=v.muted?'🔇 소리 켜기':'🔊 소리 끄기';
 });
 document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
 return overlay;
}
function openVideo(v,label){
 ensure().style.display='flex';
 moved=v;movedParent=v.parentNode;movedNext=v.nextSibling;
 var body=document.getElementById('clb-body');
 v.style.cssText='width:100%;max-height:78vh;object-fit:contain;background:#000;border-radius:10px';
 v.controls=true;
 body.appendChild(v);
 document.getElementById('clb-t').textContent=label||'실시간 CCTV';
 var mb=document.getElementById('clb-mute');mb.style.display='';mb.textContent=v.muted?'🔇 소리 켜기':'🔊 소리 끄기';
}
function openFrame(f,label){
 ensure().style.display='flex';
 moved=f;movedParent=f.parentNode;movedNext=f.nextSibling;
 var body=document.getElementById('clb-body');
 f.style.cssText='width:100%;max-height:78vh;aspect-ratio:16/9;border:0;border-radius:10px;background:#000';
 body.appendChild(f);
 document.getElementById('clb-t').textContent=label||'실시간 영상';
 document.getElementById('clb-mute').style.display='none';
}
function openImg(img,label){
 ensure().style.display='flex';
 var body=document.getElementById('clb-body');
 var im=document.createElement('img');
 im.src=img.currentSrc||img.src;im.alt=img.alt||'';
 im.style.cssText='max-width:96vw;max-height:80vh;object-fit:contain;border-radius:8px';
 body.appendChild(im);
 document.getElementById('clb-t').textContent=label||img.alt||'실시간 캡처';
 document.getElementById('clb-mute').style.display='none';
 moved=im;movedParent=null;
}
function close(){
 if(!overlay)return;
 overlay.style.display='none';
 var body=document.getElementById('clb-body');
 while(body.firstChild)body.removeChild(body.firstChild);
 if(moved&&movedParent){
  if(movedNext&&movedNext.parentNode===movedParent)movedParent.insertBefore(moved,movedNext);
  else movedParent.appendChild(moved);
  if(moved.tagName==='VIDEO'){moved.controls=false;moved.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover';}
  if(moved.tagName==='IFRAME')moved.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0';
 }
 moved=null;movedParent=null;movedNext=null;
}
document.addEventListener('click',function(e){
 var t=e.target;
 // jeju cam-img는 <a> 안에 있음 — 링크 이동 대신 확대
 if(t.closest&&t.closest('a')&&t.tagName==='IMG'&&(t.classList.contains('cam-img')||t.classList.contains('sn-img')||t.classList.contains('yj-img')||t.classList.contains('port-img'))){
  e.preventDefault();e.stopPropagation();
  var card=t.closest('.card')||t.parentElement;
  var nm=(card&&card.querySelector('span'))?card.querySelector('span').textContent:'';
  openImg(t,nm);return;
 }
 // 스냅샷 이미지 (cam 카드 그리드 내부 이미지는 클래스 무관하게 처리)
 if(t.tagName==='IMG'&&(t.classList.contains('cam-img')||t.classList.contains('sn-img')||t.classList.contains('yj-img')||t.classList.contains('port-img')||t.closest('.live-grid'))){
  var card2=t.closest('.card')||t.closest('div[style*="padding-top"]')||t.parentElement;
  var nm2=(card2&&card2.querySelector('span'))?card2.querySelector('span').textContent:(t.alt||'실시간 캡처');
  openImg(t,nm2);return;
 }
 // HLS 비디오 카드
 if(t.tagName==='VIDEO'&&(t.closest('.cam-card')||t.closest('.kbs-card')||t.closest('[data-api]')||t.closest('.live-grid'))){
  var c=t.closest('.cam-card')||t.closest('.kbs-card')||t.closest('[data-api]')||t.closest('.live-grid');
  var nm3=(c.querySelector('span'))?c.querySelector('span').textContent:'실시간 CCTV';
  openVideo(t,nm3);return;
 }
 // 라이브 iframe
 if(t.tagName==='IFRAME'&&(t.closest('.live-embed')||t.closest('.knps-card')||t.closest('.portal-frame')||t.closest('.knps-ph')||t.closest('.live-grid'))){
  openFrame(t,'실시간 라이브');return;
 }
 // KNPS 등 플레이스홀더 클릭 → 내부 iframe 확대
 if(t.closest&&t.closest('.knps-ph')&&t.closest('.knps-ph').querySelector('iframe')){
  openFrame(t.closest('.knps-ph').querySelector('iframe'),'실시간 라이브');return;
 }
},true);
})();
