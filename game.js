// Nutrition VR P.5 — kid-friendly VR with Thai foods, mascot hints, modes, Thai TTS
// ---------- Helpers: Thai SpeechSynthesis
function speakTH(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const th = voices.find(v=>/th|thai/i.test(v.lang||'th'));
    if (th) u.voice = th;
    u.lang = 'th-TH';
    u.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch(e){ /* ignore */ }
}

// ---------- Components
AFRAME.registerComponent('nutrient', {
  schema: {
    id:{type:'string'}, name:{type:'string'}, emoji:{type:'string'},
    kcal:{type:'number'}, carb:{type:'number'}, protein:{type:'number'}, fiber:{type:'number'},
    sugar:{type:'number'}, sodium:{type:'number'}, group:{type:'string'}
  }
});

AFRAME.registerComponent('grabbable-lite', {
  init(){
    this.grabbed=false;
    this.el.classList.add('clickable');
    this.onDown = ()=>{
      this.grabbed=true;
      this.el.setAttribute('material','opacity:0.85; transparent:true');
      const a = document.getElementById('pickup'); a.currentTime=0; a.play().catch(()=>{});
    };
    this.onUp = ()=>{
      this.grabbed=false;
      this.el.setAttribute('material','opacity:1; transparent:false');
      // Drop check
      const plate = document.getElementById('plate');
      const p = new THREE.Vector3(); this.el.object3D.getWorldPosition(p);
      const c = plate.object3D.getWorldPosition(new THREE.Vector3());
      const d = p.distanceTo(c);
      if (d<0.45){
        // Snap
        this.el.object3D.position.set(c.x+(Math.random()-0.5)*0.32, 0.8, c.z+(Math.random()-0.5)*0.32);
        const s = document.getElementById('place'); s.currentTime=0; s.play().catch(()=>{});
        window.NUTVR && window.NUTVR.onPlaced(this.el);
      }
    };
    this.el.addEventListener('mousedown', this.onDown);
    this.el.addEventListener('mouseup', this.onUp);
  },
  remove(){
    this.el.removeEventListener('mousedown', this.onDown);
    this.el.removeEventListener('mouseup', this.onUp);
  }
});

AFRAME.registerComponent('drag-follow', {
  tick(){
    const g = this.el.components['grabbable-lite'];
    if (!g || !g.grabbed) return;
    const cam = document.getElementById('camera');
    const dir = new THREE.Vector3(0,0,-1); dir.applyQuaternion(cam.object3D.quaternion);
    const pos = cam.object3D.position.clone().add(dir.multiplyScalar(0.6));
    this.el.object3D.position.lerp(pos, 0.65);
  }
});

// ---------- Data: Thai-food, kid-friendly (emoji label)
const DB = [
  // Carbs (green)
  { id:'rice_brown', name:'ข้าวกล้อง', emoji:'🍚', color:'#28c76f', kcal:160, carb:35, protein:3, fiber:2, sugar:1, sodium:2, group:'คาร์บเชิงซ้อน' },
  { id:'rice_white', name:'ข้าวขาว', emoji:'🍚', color:'#3ec1d3', kcal:180, carb:40, protein:3, fiber:0.5, sugar:1, sodium:2, group:'คาร์บ' },
  { id:'bread_egg', name:'ข้าวผัดไข่', emoji:'🍳', color:'#28c76f', kcal:250, carb:34, protein:10, fiber:2, sugar:2, sodium:450, group:'คาร์บ' },
  { id:'padthai', name:'ผัดไทย', emoji:'🍜', color:'#28c76f', kcal:410, carb:55, protein:12, fiber:3, sugar:8, sodium:900, group:'คาร์บ' },
  // Protein (yellow)
  { id:'egg', name:'ไข่ต้ม', emoji:'🥚', color:'#ffd166', kcal:75, carb:0.6, protein:6, fiber:0, sugar:0, sodium:65, group:'โปรตีน' },
  { id:'chicken', name:'อกไก่', emoji:'🍗', color:'#ffd166', kcal:150, carb:0, protein:26, fiber:0, sugar:0, sodium:80, group:'โปรตีน' },
  { id:'tofu', name:'เต้าหู้', emoji:'🧈', color:'#ffd166', kcal:95, carb:2, protein:10, fiber:1, sugar:0, sodium:10, group:'โปรตีนพืช' },
  // Veg/Fruit (leaf green)
  { id:'somtam', name:'ส้มตำ (ไม่หวาน)', emoji:'🥗', color:'#9bdeac', kcal:90, carb:12, protein:3, fiber:3, sugar:5, sodium:400, group:'ผัก' },
  { id:'veg_mix', name:'ผักรวม', emoji:'🥦', color:'#9bdeac', kcal:60, carb:10, protein:4, fiber:5, sugar:3, sodium:40, group:'ผัก' },
  { id:'mango', name:'มะม่วง', emoji:'🥭', color:'#9bdeac', kcal:60, carb:15, protein:0.8, fiber:1.6, sugar:13, sodium:1, group:'ผลไม้' },
  { id:'watermelon', name:'แตงโม', emoji:'🍉', color:'#9bdeac', kcal:46, carb:12, protein:0.9, fiber:0.6, sugar:9, sodium:2, group:'ผลไม้' },
  // Caution (red)
  { id:'fried_chicken', name:'ไก่ทอด', emoji:'🍗', color:'#ff6b6b', kcal:250, carb:12, protein:20, fiber:0, sugar:0, sodium:500, group:'ของทอด' },
  { id:'sausage', name:'ไส้กรอก', emoji:'🌭', color:'#ff6b6b', kcal:220, carb:2, protein:8, fiber:0, sugar:1, sodium:700, group:'ปรุงสำเร็จ' },
  { id:'softdrink', name:'น้ำอัดลม', emoji:'🥤', color:'#ff6b6b', kcal:140, carb:35, protein:0, fiber:0, sugar:35, sodium:45, group:'หวาน' }
];

const LEVELS = {
  1: { title:'เช้า 400–500 kcal', kcal:[400,500], limits:{sugar:30,sodium:1000}, minGroups:{'คาร์บเชิงซ้อน':1,'โปรตีน':1,'ผัก':1} },
  2: { title:'กลางวัน 550–700 kcal (ผัก ≥ 1)', kcal:[550,700], limits:{sugar:30,sodium:1500}, minGroups:{'โปรตีน':1,'ผัก':1} },
  3: { title:'เย็น 450–600 kcal (หวาน≤20g เค็ม≤800mg)', kcal:[450,600], limits:{sugar:20,sodium:800}, minGroups:{'โปรตีน':1,'ผัก':1} }
};

// ---------- State & HUD
const HUD = {
  modeSel: document.getElementById('modeSel'),
  levelSel: document.getElementById('levelSel'),
  startBtn: document.getElementById('btnStart'),
  resetBtn: document.getElementById('btnReset'),
  hudMode: document.getElementById('hudMode'),
  hudTimer: document.getElementById('hudTimer'),
  kcal: document.getElementById('kcal'), pro: document.getElementById('pro'), carb: document.getElementById('carb'),
  fib: document.getElementById('fib'), sug: document.getElementById('sug'), sod: document.getElementById('sod'),
  stars: document.getElementById('stars'),
  mascot: document.getElementById('mascotText')
};

const Game = {
  running:false, timeLeft: Infinity, timerId:null,
  plate:[]
};

function setModeUI(){
  const mode = HUD.modeSel.value;
  HUD.hudMode.textContent = mode==='practice' ? 'Practice' : 'Challenge';
  if (mode==='practice'){ Game.timeLeft = Infinity; HUD.hudTimer.textContent = 'เวลา: ∞'; }
  else { Game.timeLeft = 60; HUD.hudTimer.textContent = 'เวลา: 60s'; }
}

HUD.modeSel.addEventListener('change', setModeUI);

function updateGoalBoard(){
  const lv = HUD.levelSel.value; const L = LEVELS[lv];
  const text = `เป้าหมาย — ${L.title}
- พลังงานรวม ${L.kcal[0]}–${L.kcal[1]} kcal
- กลุ่มอาหารขั้นต่ำ: ${Object.keys(L.minGroups).map(k=>k+' '+L.minGroups[k]+' ที่').join(', ')}
- น้ำตาล ≤ ${L.limits.sugar} g, โซเดียม ≤ ${L.limits.sodium} mg`;
  HUD.mascot.setAttribute('text', `value:${text}; align:center; color:#fff; width:3`);
}

function spawnFoods(){
  // Clear previous
  document.querySelectorAll('.food').forEach(e=> e.parentNode.removeChild(e));
  const spawns = [document.getElementById('spawnL'), document.getElementById('spawnC'), document.getElementById('spawnR')];
  const cols = [[],[],[]];
  DB.forEach((it,i)=> cols[i%3].push(it));
  cols.forEach((col,ci)=>{
    col.forEach((it,ri)=>{
      const box = document.createElement('a-box');
      box.classList.add('food','clickable');
      box.setAttribute('color', it.color);
      box.setAttribute('depth','0.12'); box.setAttribute('height','0.08'); box.setAttribute('width','0.28');
      const pos = spawns[ci].object3D.position.clone();
      box.setAttribute('position', `${pos.x} ${pos.y - ri*0.13} ${pos.z}`);
      box.setAttribute('nutrient', it);
      box.setAttribute('grabbable-lite','');
      box.setAttribute('drag-follow','');
      // Emoji label
      const label = document.createElement('a-entity');
      label.setAttribute('text', `value:${it.emoji} ${it.name}; color:#001; align:center; width:3`);
      label.setAttribute('position','0 0.06 0.07');
      box.appendChild(label);
      document.querySelector('a-scene').appendChild(box);
    });
  });
}

function updateHUD(){
  const s = Game.plate.reduce((a,b)=>({
    kcal:a.kcal+b.kcal, carb:a.carb+b.carb, protein:a.protein+b.protein,
    fiber:a.fiber+b.fiber, sugar:a.sugar+b.sugar, sodium:a.sodium+b.sodium
  }), {kcal:0,carb:0,protein:0,fiber:0,sugar:0,sodium:0});
  HUD.kcal.textContent = Math.round(s.kcal);
  HUD.pro.textContent = Math.round(s.protein)+'g';
  HUD.carb.textContent = Math.round(s.carb)+'g';
  HUD.fib.textContent = Math.round(s.fiber)+'g';
  HUD.sug.textContent = Math.round(s.sugar)+'g';
  HUD.sod.textContent = Math.round(s.sodium)+'mg';
  return s;
}

function scoreStars(summary){
  const lv = HUD.levelSel.value; const L = LEVELS[lv];
  const counts = {};
  Game.plate.forEach(it=>{
    const g = it.group.includes('โปรตีน')?'โปรตีน':(it.group==='คาร์บเชิงซ้อน'?'คาร์บเชิงซ้อน':it.group);
    counts[g]=(counts[g]||0)+1;
    if (it.group==='ผลไม้') counts['ผัก']=(counts['ผัก']||0)+1;
  });
  let stars = 3;
  if (summary.kcal < L.kcal[0] || summary.kcal > L.kcal[1]) stars--;
  if (summary.sugar > L.limits.sugar) stars--;
  if (summary.sodium > L.limits.sodium) stars--;
  for (const k in L.minGroups){ if ((counts[k]||0) < L.minGroups[k]) { stars--; break; } }
  stars = Math.max(1, Math.min(3, stars));
  HUD.stars.textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
  return stars;
}

function mascotHintOnPlace(item, summary){
  // Simple kid-friendly rules
  if (item.group==='ผัก' || item.group==='ผลไม้'){
    HUD.mascot.setAttribute('text', 'value: เยี่ยมมาก! ได้ผัก/ผลไม้เพิ่มแล้ว 🥦🍎; align:center; color:#fff; width:3');
    speakTH('เยี่ยมมาก! ได้ผักเพิ่มแล้ว');
  }else if (item.group==='ของทอด' || item.group==='ปรุงสำเร็จ' || item.group==='หวาน'){
    HUD.mascot.setAttribute('text', 'value: ระวังนะ จานนี้อาจเค็มหรือหวานเกินไป ลองเลือกผักเพิ่มสิ 🥗; align:center; color:#fff; width:3');
    speakTH('ระวังนะ เค็มหรือหวานเกินไป ลองเลือกผักเพิ่มสิ');
  }else if (item.group.includes('โปรตีน')){
    HUD.mascot.setAttribute('text', 'value: โปรตีนได้แล้ว! อย่าลืมคาร์บดี ๆ และผักด้วยนะ; align:center; color:#fff; width:3');
    speakTH('ได้โปรตีนแล้ว อย่าลืมคาร์บดีๆ และผักด้วยนะ');
  }
  // High sugar/sodium immediate feedback
  if (summary.sugar > 20){
    HUD.mascot.setAttribute('text', 'value: น้ำตาลเริ่มสูงแล้วนะ 🍭 ลองลดน้ำหวาน; align:center; color:#fff; width:3');
  }
  if (summary.sodium > 1000){
    HUD.mascot.setAttribute('text', 'value: โซเดียมสูงแล้ว ⚠️ เลี่ยงของทอด/ปรุงสำเร็จ; align:center; color:#fff; width:3');
  }
}

function startGame(){
  Game.running = true;
  Game.plate = [];
  spawnFoods();
  updateGoalBoard();
  const summary = updateHUD(); scoreStars(summary);
  const mode = HUD.modeSel.value;
  setModeUI();
  if (mode==='challenge'){
    if (Game.timerId) clearInterval(Game.timerId);
    Game.timeLeft = 60;
    HUD.hudTimer.textContent = 'เวลา: 60s';
    Game.timerId = setInterval(()=>{
      if (!Game.running) return;
      Game.timeLeft -= 1;
      HUD.hudTimer.textContent = 'เวลา: ' + Game.timeLeft + 's';
      if (Game.timeLeft<=0){
        clearInterval(Game.timerId);
        Game.running=false;
        const stars = scoreStars(updateHUD());
        HUD.mascot.setAttribute('text', `value: หมดเวลา! ได้ ${stars} ดาว ลองปรับจานให้ดีกว่านี้นะ ⭐; align:center; color:#fff; width:3`);
        if (stars>=2){ const w=document.getElementById('win'); w.currentTime=0; w.play().catch(()=>{}); }
      }
    }, 1000);
  }else{
    if (Game.timerId){ clearInterval(Game.timerId); Game.timerId=null; }
    HUD.hudTimer.textContent = 'เวลา: ∞';
  }
  HUD.mascot.setAttribute('text', 'value: เริ่มกันเลย! เลือกคาร์บดี ๆ + โปรตีน + ผักนะ 😊; align:center; color:#fff; width:3');
  speakTH('เริ่มกันเลย เลือกคาร์บดีๆ โปรตีน และผักนะ');
}

function resetGame(){
  Game.running=false;
  if (Game.timerId){ clearInterval(Game.timerId); Game.timerId=null; }
  Game.plate=[];
  spawnFoods();
  const summary = updateHUD(); scoreStars(summary);
  updateGoalBoard(); setModeUI();
  HUD.mascot.setAttribute('text', 'value: เริ่มใหม่อีกครั้ง เลือกอาหารที่มีประโยชน์นะ!; align:center; color:#fff; width:3');
}

window.NUTVR = {
  onPlaced(el){
    if (!Game.running) return;
    const n = el.getAttribute('nutrient');
    Game.plate.push(n);
    const summary = updateHUD();
    scoreStars(summary);
    mascotHintOnPlace(n, summary);
  }
};

HUD.startBtn.addEventListener('click', startGame);
HUD.resetBtn.addEventListener('click', resetGame);
HUD.levelSel.addEventListener('change', ()=>{ updateGoalBoard(); const s=updateHUD(); scoreStars(s); });

// Init
setModeUI();
spawnFoods();
updateGoalBoard();
const s0 = updateHUD(); scoreStars(s0);
HUD.mascot.setAttribute('text', 'value: สวัสดี! ฉันคือน้องโภชนา จะช่วยแนะนำอาหารที่ดีต่อสุขภาพนะ 😊; align:center; color:#fff; width:3');
