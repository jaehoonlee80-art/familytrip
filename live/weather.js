// 지역 날씨 위젯 — Open-Meteo (무료, 키 불필요)
// <div class="wx" data-lat="37.57" data-lon="126.66" data-label="인천"></div> 를 자동 초기화
(function(){
const WMO={0:'맑음',1:'대체로 맑음',2:'구름 조금',3:'흐림',45:'안개',48:'안개',51:'이슬비',53:'이슬비',55:'이슬비',56:'어는이슬비',57:'어는이슬비',61:'비',63:'비',65:'폭우',66:'어는비',67:'어는비',71:'눈',73:'눈',75:'폭설',77:'눈',80:'소나기',81:'소나기',82:'폭우',85:'눈소나기',86:'눈소나기',95:'뇌우',96:'우박 뇌우',99:'우박 뇌우'};
const ICON={'맑음':'☀️','대체로 맑음':'🌤️','구름 조금':'⛅','흐림':'☁️','안개':'🌫️'};
function icon(w){return ICON[w]||'🌦️';}
function wd(iso){const d=new Date(iso+'T00:00:00');return (d.getMonth()+1)+'/'+d.getDate()+'('+['일','월','화','수','목','금','토'][d.getDay()]+')';}
async function mount(el){
 if(el.dataset.wxDone)return;el.dataset.wxDone='1';
 const lat=el.dataset.lat,lon=el.dataset.lon,label=el.dataset.label||'';
 el.innerHTML='<div style="padding:14px;color:#999;font-size:13px">'+label+' 날씨 불러오는 중…</div>';
 try{
  const mon=new Date();mon.setDate(1);
  const prev=new Date(mon);prev.setMonth(prev.getMonth()-1);
  const fmt=d=>d.toISOString().slice(0,10);
  const [cur,fc,hfc,arc]=await Promise.all([
   fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m&timezone=auto`).then(r=>r.json()),
   fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=8`).then(r=>r.json()),
   fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code,precipitation_probability&timezone=auto&forecast_days=2`).then(r=>r.json()),
   fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2021-01-01&end_date=2023-12-31&daily=temperature_2m_min,temperature_2m_max,precipitation_sum&timezone=auto`).then(r=>r.json()).catch(()=>null)
  ]);
  const c=cur.current,d=fc.daily;
  let monthly='';
  let monthlyTable='';
  if(arc&&arc.daily&&arc.daily.temperature_2m_max){
   const ad=arc.daily,t=ad.time;
   const buckets={};
   for(let i=0;i<t.length;i++){
    const m=+t[i].slice(5,7),y=+t[i].slice(0,4);
    buckets[m]=buckets[m]||{mins:[],maxs:[],ym:{}};
    if(ad.temperature_2m_min[i]!=null)buckets[m].mins.push(ad.temperature_2m_min[i]);
    if(ad.temperature_2m_max[i]!=null)buckets[m].maxs.push(ad.temperature_2m_max[i]);
    if(ad.precipitation_sum[i]!=null){const k=y+'-'+m;buckets[m].ym[k]=(buckets[m].ym[k]||0)+ad.precipitation_sum[i];}
   }
   const keys=Object.keys(buckets).sort((a,b)=>a-b);
   if(keys.length>=6){
    let cells='';
    keys.forEach(m=>{
     const b=buckets[m];
     const mn=b.mins.length?(b.mins.reduce((a,v)=>a+v,0)/b.mins.length).toFixed(1):'—';
     const mx=b.maxs.length?(b.maxs.reduce((a,v)=>a+v,0)/b.maxs.length).toFixed(1):'—';
     const ys=Object.keys(b.ym);
     const pr=ys.length?(ys.reduce((a,k)=>a+b.ym[k],0)/ys.length).toFixed(0):'—';
     cells+=`<div style="text-align:center;padding:8px 4px;border-left:1px solid #eee;min-width:64px"><div style="font-size:12px;color:#888;margin-bottom:3px">${m}월</div><div style="font-size:14px;font-weight:700;color:#dc2626;line-height:1.4">${mx}°</div><div style="font-size:14px;font-weight:700;color:#2563eb;line-height:1.4">${mn}°</div><div style="font-size:11px;color:#3b82f6;margin-top:3px">🌧 ${pr}mm</div></div>`;
    });
    monthlyTable=`<div style="margin-top:14px"><div style="font-size:13px;color:#2563eb;font-weight:700;margin-bottom:6px">📅 월별 평균 기후 (2021~2023 평균) — 기온 · 월 강수량</div><div style="display:flex;overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc">${cells}</div></div>`;
   }
  }
  // 시간별 예보 (앞으로 24시간)
  let hourly='';
  if(hfc.hourly&&hfc.hourly.time){
   const ht=hfc.hourly.time,htm=hfc.hourly.temperature_2m,hw=hfc.hourly.weather_code,hp=hfc.hourly.precipitation_probability;
   const _n=new Date(),nowH=_n.getFullYear()+'-'+String(_n.getMonth()+1).padStart(2,'0')+'-'+String(_n.getDate()).padStart(2,'0')+'T'+String(_n.getHours()).padStart(2,'0');
   let started=false,count=0;
   for(let i=0;i<ht.length&&count<24;i++){
    if(!started){if(ht[i].slice(0,13)<nowH)continue;started=true;}
    const hh=+ht[i].slice(11,13);
    hourly+=`<div style="text-align:center;padding:8px 4px;border-left:1px solid #eee;min-width:52px"><div style="font-size:12px;color:#888">${hh}시</div><div style="font-size:20px">${icon(WMO[hw[i]]||'')}</div><div style="font-size:13px;font-weight:600">${Math.round(htm[i])}°</div><div style="font-size:11px;color:#3b82f6">${hp[i]||0}%</div></div>`;
    count++;
   }
  }
  let daily='';
  for(let i=1;i<Math.min(8,d.time.length);i++){
   daily+=`<div style="text-align:center;padding:8px 4px;border-left:1px solid #eee"><div style="font-size:12px;color:#888">${wd(d.time[i])}</div><div style="font-size:20px">${icon(WMO[d.weather_code[i]]||'')}</div><div style="font-size:13px;font-weight:600">${Math.round(d.temperature_2m_max[i])}°/<span style="color:#888;font-weight:400">${Math.round(d.temperature_2m_min[i])}°</span></div><div style="font-size:11px;color:#3b82f6">${d.precipitation_probability_max[i]||0}%</div></div>`;
  }
  el.innerHTML=`<div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;background:#fff">
   <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <div style="font-size:34px">${icon(WMO[c.weather_code]||'')}</div>
    <div><div style="font-size:26px;font-weight:700">${Math.round(c.temperature_2m)}°C <span style="font-size:14px;font-weight:400;color:#888">체감 ${Math.round(c.apparent_temperature)}°C</span></div>
    <div style="font-size:13px;color:#555">${label} ${WMO[c.weather_code]||''} · 강수 ${c.precipitation}mm · 풍속 ${Math.round(c.wind_speed_10m)}km/h ${monthly}</div></div>
    <div style="margin-left:auto;font-size:12px;color:#999">Open-Meteo 실시간</div>
   </div>
   ${hourly?`<div style="font-size:12px;color:#888;margin-top:10px;font-weight:600">🕐 시간별 예보 (24시간)</div><div style="display:flex;overflow-x:auto;border-top:1px solid #f0f0f0;margin-top:4px;padding-top:4px">${hourly}</div>`:''}
   <div style="font-size:12px;color:#888;margin-top:10px;font-weight:600">📆 일별 예보 (7일)</div>
   <div style="display:flex;overflow-x:auto;border-top:1px solid #f0f0f0;margin-top:4px;padding-top:4px">${daily}</div>
   ${monthlyTable}
  </div>`;
 }catch(e){el.innerHTML='<div style="padding:10px;color:#999;font-size:12px">날씨를 불러오지 못했습니다.</div>';}
}
window.mountWx=mount;
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.wx').forEach(mount);});
})();
