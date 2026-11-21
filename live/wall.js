// 공통 라이브 CCTV 월 렌더러 — hls.js CDN 필요
// initHlsWall(elId, jsonUrl, mode): mode 'url'=cams[].url 직접, 'gits'=worker /gits?hls=id
const CCTV_PROXY='https://jeju-cctv-proxy.jaehoonlee80.workers.dev';
function cctvCard(c){
 return '<div class="cam-card" data-id="'+c.id+'"'+(c.url?' data-url="'+c.url+'"':' data-gits="'+c.id+'"')+' style="position:relative;background:#000;border-radius:10px;overflow:hidden">'
 +'<div style="position:relative;padding-top:56.25%"><video muted playsinline autoplay style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>'
 +'<div class="cam-off" style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);color:#fff;font-size:12px;text-align:center;padding:8px">송출 준비 중…</div>'
 +'<span style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.7);color:#fff;font-size:12px;padding:3px 8px;border-radius:6px">'+(c.area?c.area+' · ':'')+c.name+'</span></div></div>';
}
async function resolveStream(card){
 if(card.dataset.url)return card.dataset.url;
 const r=await fetch(CCTV_PROXY+'/gits?hls='+card.dataset.gits);
 const j=await r.json();
 if(!j.url)throw new Error('no stream');
 return j.url;
}
function playHls(video,url){
 if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=url;return null;}
 if(window.Hls&&Hls.isSupported()){
  const h=new Hls({maxBufferLength:8});h.loadSource(url);h.attachMedia(video);
  h.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal)video.parentElement.querySelector('.cam-off').style.display='flex';});
  return h;
 }
 video.parentElement.querySelector('.cam-off').style.display='flex';
 return null;
}
function renderHlsWall(elId,cams){
 const wall=document.getElementById(elId);if(!wall)return;
 if(!Array.isArray(cams)||!cams.length){wall.innerHTML='<p style="color:#999">표시할 카메라가 없습니다.</p>';return;}
 wall.innerHTML=cams.map(cctvCard).join('');
 const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){startCam(e.target);io.unobserve(e.target);}})},{rootMargin:'300px'});
 document.querySelectorAll('#'+elId+' .cam-card').forEach(d=>io.observe(d));
 async function startCam(card){
  const v=card.querySelector('video'),off=card.querySelector('.cam-off');
  card.querySelector('div').addEventListener('click',()=>{v.muted=!v.muted;},{once:false});
  try{
   const url=await resolveStream(card);
   const h=playHls(v,url);
   card._hls=h;
   // 서명 URL은 2시간 유효 — 100분 후 새로 발급
   if(card.dataset.gits)clearTimeout(card._rt),card._rt=setTimeout(async()=>{try{if(card._hls)card._hls.destroy();const u2=await resolveStream(card);playHls(v,u2);}catch(e){}},100*60*1000);
  }catch(e){off.style.display='flex';off.textContent='일시 송출 중단';}
 }
}
async function initHlsWall(elId,jsonUrl){
 let cams;try{cams=await(await fetch(jsonUrl)).json();}catch(e){const w=document.getElementById(elId);if(w)w.innerHTML='<p style="color:#999">카메라 목록을 불러오지 못했습니다.</p>';return;}
 renderHlsWall(elId,cams);
}
