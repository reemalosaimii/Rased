'use strict';
let language='ar';
document.documentElement.classList.add('js');

/** Switches every [data-ar]/[data-en] element between Arabic and English. */
document.getElementById('lang').addEventListener('click',()=>{language=language==='ar'?'en':'ar';document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';for(const el of document.querySelectorAll('[data-ar]')){const content=el.dataset[language];el.replaceChildren();content.split('\\n').forEach((line,i)=>{if(i)el.append(document.createElement('br'));el.append(document.createTextNode(line))})}document.getElementById('lang').textContent=language==='ar'?'English':'العربية';});


/* Fade sections in as they scroll into view; show everything at once if the observer is unavailable. */
const revealItems=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}},{threshold:.15});revealItems.forEach((item,index)=>{item.style.transitionDelay=`${(index%4)*90}ms`;observer.observe(item)})}else{revealItems.forEach(item=>item.classList.add('visible'))}

/** Counts a stat up from 0 to its data-to value and fills its card bar; jumps straight to the value when motion is reduced. */
function animateCount(el){const target=Number(el.dataset.to),decimals=Number(el.dataset.decimals||0),card=el.closest('article');card.classList.remove('done');card.classList.add('run');if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=target.toFixed(decimals);card.classList.add('done');return}cancelAnimationFrame(el.frame);const start=performance.now(),duration=2500;const tick=now=>{const progress=Math.min((now-start)/duration,1),eased=1-Math.pow(1-progress,3);el.textContent=(target*eased).toFixed(decimals);if(progress<1){el.frame=requestAnimationFrame(tick)}else{card.classList.add('done')}};el.frame=requestAnimationFrame(tick)}
/** Resets a stat to 0 so it counts again the next time it scrolls into view. */
function resetCount(el){cancelAnimationFrame(el.frame);el.textContent=(0).toFixed(Number(el.dataset.decimals||0));el.closest('article').classList.remove('run','done')}
const counters=document.querySelectorAll('.count');
if('IntersectionObserver' in window){const countObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)animateCount(entry.target);else resetCount(entry.target)}},{threshold:.6});counters.forEach(counter=>countObserver.observe(counter))}else{counters.forEach(counter=>{counter.textContent=Number(counter.dataset.to).toFixed(Number(counter.dataset.decimals||0))})}

/* ---------- Interactive Expo zones map (ported from the RASID dashboard's ExpoMap) ---------- */
/* Zone centres and ellipse sizes are in the photo's 2000 × 1125 pixel frame. */
const SITE_W=2000,SITE_H=1125;
const expoZones=[
  {id:'A1',name:['الإنسانية','Humanity'],c:[905,400],rx:190,ry:100,color:'#8E1218',icon:'<path d="M12 4.5 19 9v6l-7 4.5L5 15V9z"/><path d="M8.5 11.2 12 9l3.5 2.2v2.6L12 16l-3.5-2.2z"/>'},
  {id:'D2',name:['الثقافة','Culture'],c:[1365,390],rx:180,ry:92,color:'#E2601A',icon:'<path d="M6.5 19 12 5l5.5 14"/><path d="M10 14.5h4"/>'},
  {id:'D3',name:['الأرض','Earth'],c:[575,540],rx:185,ry:115,color:'#7DB61C',icon:'<path d="M6 5.5 19 12 6 18.5z"/><path d="M10 10.2 14 12l-4 1.8"/>'},
  {id:'D4',name:['التقنيات','Technologies'],c:[1470,560],rx:195,ry:115,color:'#1E3E9A',icon:'<path d="M12 4 20 10l-8 10-8-10z"/><path d="M4 10h16"/><path d="M9 10l3 6 3-6"/>'},
  {id:'D5',name:['التعاون','Cooperation'],c:[965,815],rx:230,ry:150,color:'#F2B100',icon:'<path d="M6 5c3.5 3 8.5 11 12 14"/><path d="M18 5c-3.5 3-8.5 11-12 14"/>'}
];
const BEAM_ANGLES=[-28,-6,14];
/* Sample live alerts drawn in the middle of the site (photo pixel frame). */
const mapAlerts=[
  {type:'fire',pos:[1075,585],label:['حريق','Fire'],icon:'<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 2 1 3 3 3 3s1-3 0-7z"/>'},
  {type:'crowd',pos:[830,470],label:['ازدحام','Crowding'],icon:'<circle cx="12" cy="6" r="2.5"/><circle cx="5" cy="9" r="2"/><circle cx="19" cy="9" r="2"/><path d="M7.5 20v-3a4.5 4.5 0 0 1 9 0v3M1.5 19v-1.5A3.5 3.5 0 0 1 5 14h1M22.5 19v-1.5A3.5 3.5 0 0 0 19 14h-1"/>'}
];

/** Sets bilingual text on an element so the language toggle can switch it later. */
function setBilingual(element,pair){element.dataset.ar=pair[0];element.dataset.en=pair[1];element.textContent=pair[language==='ar'?0:1]}
const pct=(value,total)=>`${(value/total)*100}%`;

const expoMap=document.getElementById('expo-map');
if(expoMap){
  const inner=expoMap.querySelector('.map-inner'),pinLayer=document.getElementById('map-pins'),world=expoMap.querySelector('.world');
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parts=new Map();
  let hoverId=null,pinnedId=null;

  if(!reduceMotion)expoMap.querySelector('.photo').classList.add('drift');

  expoZones.forEach((zone,index)=>{
    const [cx,cy]=zone.c,at=`${pct(cx,SITE_W)} ${pct(cy,SITE_H)}`;
    /* A dimming layer with this zone's ellipse cut out, and a warm glow over the zone. */
    const shade=document.createElement('div');shade.className='shade';
    const mask=`radial-gradient(ellipse ${pct(zone.rx*1.5,SITE_W)} ${pct(zone.ry*1.5,SITE_H)} at ${at}, transparent 0%, transparent 58%, #000 100%)`;
    shade.style.webkitMaskImage=mask;shade.style.maskImage=mask;
    const glow=document.createElement('div');glow.className='glow';
    Object.assign(glow.style,{left:pct(cx,SITE_W),top:pct(cy,SITE_H),width:pct(zone.rx*2.2,SITE_W),height:pct(zone.ry*2.2,SITE_H)});
    inner.insertBefore(glow,pinLayer);inner.insertBefore(shade,glow);

    /* Light beams rising from the zone. */
    const beams=document.createElement('div');beams.className='beams';
    Object.assign(beams.style,{left:pct(cx-6,SITE_W),top:pct(cy,SITE_H)});
    BEAM_ANGLES.forEach((angle,beamIndex)=>{const beam=document.createElement('span');beam.className=`beam b${beamIndex+1}`;beam.style.transform=`rotate(${angle+(index%2?4:-4)}deg)`;beam.style.left=`${beamIndex*8-8}px`;beams.append(beam)});

    /* The zone pin: coloured square with an icon; its name slides out when the zone is lit. */
    const pin=document.createElement('button');
    pin.type='button';pin.className=`pin${reduceMotion?'':' idle'}`;
    Object.assign(pin.style,{left:pct(cx,SITE_W),top:pct(cy-6,SITE_H),animationDelay:`${index*0.45}s`});
    pin.style.setProperty('--c',zone.color);
    pin.innerHTML=`<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${zone.icon}</svg></span><span class="lbl"></span>`;
    setBilingual(pin.querySelector('.lbl'),zone.name);
    pin.setAttribute('aria-label',`${zone.name[0]} / ${zone.name[1]}`);pin.setAttribute('aria-pressed','false');
    pin.addEventListener('mouseenter',()=>{if(!pinnedId){hoverId=zone.id;render()}});
    pin.addEventListener('mouseleave',()=>{if(!pinnedId){hoverId=null;render()}});
    pin.addEventListener('focus',()=>{if(!pinnedId){hoverId=zone.id;render()}});
    pin.addEventListener('blur',()=>{if(!pinnedId){hoverId=null;render()}});
    pin.addEventListener('click',event=>{
      event.stopPropagation();pinnedId=pinnedId===zone.id?null:zone.id;hoverId=pinnedId;render();
      /* On phones the map scrolls sideways: bring the tapped zone into view. */
      const scroller=expoMap.closest('.map-scroll');
      if(pinnedId&&scroller.scrollWidth>scroller.clientWidth){const box=scroller.getBoundingClientRect(),pinBox=pin.getBoundingClientRect();scroller.scrollBy({left:pinBox.left+pinBox.width/2-(box.left+box.width/2),behavior:reduceMotion?'auto':'smooth'})}
    });
    pinLayer.append(beams,pin);
    parts.set(zone.id,{shade,glow,beams,pin});
  });

  /* Pulsing alert beacons: severity disc with icon, expanding waves and a label. Kept above the dimming layers. */
  mapAlerts.forEach((alert,index)=>{
    const beacon=document.createElement('div');beacon.className=`alert ${alert.type}`;
    Object.assign(beacon.style,{left:pct(alert.pos[0],SITE_W),top:pct(alert.pos[1],SITE_H),animationDelay:`${index*0.7}s`});
    beacon.innerHTML=`<span class="wave"></span><span class="wave"></span><span class="wave"></span><span class="disc"><svg viewBox="0 0 24 24" aria-hidden="true">${alert.icon}</svg></span><span class="alert-lbl"></span>`;
    setBilingual(beacon.querySelector('.alert-lbl'),alert.label);
    beacon.querySelectorAll('.wave').forEach((wave,waveIndex)=>{wave.style.animationDelay=`${waveIndex*0.6+index*0.3}s`});
    inner.insertBefore(beacon,pinLayer);
  });

  /** Lights the hovered or clicked zone: dims the rest, shows its glow, beams and name. */
  function render(){
    const activeId=hoverId??pinnedId,active=expoZones.find(zone=>zone.id===activeId);
    expoMap.classList.toggle('active',!!active);
    for(const [id,part] of parts){
      const on=id===activeId;
      part.shade.classList.toggle('on',on);part.glow.classList.toggle('on',on);part.beams.classList.toggle('on',on);part.pin.classList.toggle('on',on);
      part.pin.setAttribute('aria-pressed',String(pinnedId===id));
    }
    /* Zoom toward the lit zone. */
    world.style.transformOrigin=active?`${pct(active.c[0],SITE_W)} ${pct(active.c[1],SITE_H)}`:'';
  }

  /* Clicking empty map space or pressing Escape releases the pinned zone. */
  expoMap.addEventListener('click',()=>{pinnedId=null;hoverId=null;render()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&pinnedId){pinnedId=null;hoverId=null;render()}});

  /* On narrow screens the map scrolls sideways; start it centred. Scroll offsets are negative in right-to-left pages. */
  const mapScroller=expoMap.closest('.map-scroll'),overflow=mapScroller.scrollWidth-mapScroller.clientWidth;
  if(overflow>0)mapScroller.scrollLeft=(overflow/2)*(getComputedStyle(mapScroller).direction==='rtl'?-1:1);
}
