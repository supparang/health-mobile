// Nutrition VR (A-Frame) — Grab & Place with goals and scoring
AFRAME.registerComponent('nutrient', {
  schema: {
    id: {type:'string'}, name:{type:'string'},
    kcal:{type:'number'}, carb:{type:'number'}, protein:{type:'number'}, fiber:{type:'number'},
    sugar:{type:'number'}, sodium:{type:'number'}, group:{type:'string'}
  }
});

AFRAME.registerComponent('grabbable-lite', {
  init(){
    this.grabbed = false;
    this.ctrl = null;
    this.startPos = this.el.object3D.position.clone();
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);
    this.el.classList.add('clickable');
    this.el.addEventListener('mousedown', this.onDown);
    this.el.addEventListener('mouseup', this.onUp);
  },
  remove(){
    this.el.removeEventListener('mousedown', this.onDown);
    this.el.removeEventListener('mouseup', this.onUp);
  },
  onDown(e){
    // Determine controller or cursor
    const r = (document.querySelector('#ctrlR')?.components.raycaster) || (document.querySelector('#cursor')?.components.raycaster);
    if (!r) return;
    this.ctrl = r.raycaster.ray.origin; // not used for follow; we snap to hit point along ray
    this.grabbed = true;
    // audio
    const a = document.getElementById('pickup'); if (a){ a.currentTime=0; a.play().catch(()=>{}); }
    this.el.setAttribute('material','opacity:0.85; transparent:true');
  },
  onUp(e){
    if (!this.grabbed) return;
    this.grabbed = false;
    this.el.setAttribute('material','opacity:1; transparent:false');
    // Check if over plate (distance to plate center)
    const plate = document.getElementById('plate');
    const pWorld = new THREE.Vector3();
    this.el.object3D.getWorldPosition(pWorld);
    const center = plate.object3D.getWorldPosition(new THREE.Vector3());
    const d = pWorld.distanceTo(center);
    if (d < 0.4){
      // Snap to plate surface
      const local = this.el.object3D.position;
      this.el.object3D.position.set(center.x + (Math.random()-0.5)*0.3, 0.8, center.z + (Math.random()-0.5)*0.3);
      this.el.setAttribute('grabbable-lite',''); // keep it placeable again
      window.NUTVR && window.NUTVR.onPlaced(this.el);
      const s = document.getElementById('place'); if (s){ s.currentTime=0; s.play().catch(()=>{}); }
    }
  }
});

AFRAME.registerComponent('drag-follow', {
  tick(){
    // If entity is grabbed, make it follow the active ray end (approx: set z in front of camera)
    const g = this.el.components['grabbable-lite'];
    if (!g || !g.grabbed) return;
    const cam = document.getElementById('camera');
    const dir = new THREE.Vector3(0,0,-1);
    dir.applyQuaternion(cam.object3D.quaternion);
    const pos = cam.object3D.position.clone().add(dir.multiplyScalar(0.6));
    this.el.object3D.position.lerp(pos, 0.6);
  }
});

const HUD = {
  kcal: document.getElementById('kcal'),
  pro: document.getElementById('pro'),
  carb: document.getElementById('carb'),
  fib: document.getElementById('fib'),
  sug: document.getElementById('sug'),
  sod: document.getElementById('sod'),
  stars: document.getElementById('stars'),
  levelSel: document.getElementById('levelSel'),
  reset: document.getElementById('btnReset')
};

const DB = [
  // Carbs
  { id:'rice_brown', name:'ข้าวกล้อง', color:'#28c76f', kcal:160, carb:35, protein:3, fiber:2, sugar:1, sodium:2, group:'คาร์บเชิงซ้อน' },
  { id:'bread_whole', name:'โฮลวีต', color:'#28c76f', kcal:110, carb:20, protein:5, fiber:2, sugar:3, sodium:120, group:'คาร์บเชิงซ้อน' },
  { id:'rice_white', name:'ข้าวขาว', color:'#3ec1d3', kcal:180, carb:40, protein:3, fiber:0.5, sugar:1, sodium:2, group:'คาร์บ' },
  // Protein
  { id:'egg', name:'ไข่ต้ม', color:'#ffd166', kcal:75, carb:0.6, protein:6, fiber:0, sugar:0, sodium:65, group:'โปรตีน' },
  { id:'chicken', name:'อกไก่', color:'#ffd166', kcal:150, carb:0, protein:26, fiber:0, sugar:0, sodium:80, group:'โปรตีน' },
  { id:'tofu', name:'เต้าหู้', color:'#ffd166', kcal:95, carb:2, protein:10, fiber:1, sugar:0, sodium:10, group:'โปรตีนพืช' },
  // Veg/Fruit
  { id:'veg_mix', name:'ผักรวม', color:'#9bdeac', kcal:60, carb:10, protein:4, fiber:5, sugar:3, sodium:40, group:'ผัก' },
  { id:'banana', name:'กล้วย', color:'#f6f078', kcal:96, carb:23, protein:1.3, fiber:2.6, sugar:12, sodium:1, group:'ผลไม้' },
  { id:'apple', name:'แอปเปิล', color:'#f6f078', kcal:80, carb:21, protein:0.5, fiber:3.5, sugar:16, sodium:1, group:'ผลไม้' },
  // Caution
  { id:'fried_chicken', name:'ไก่ทอด', color:'#ff6b6b', kcal:250, carb:12, protein:20, fiber:0, sugar:0, sodium:500, group:'ของทอด' },
  { id:'sausage', name:'ไส้กรอก', color:'#ff6b6b', kcal:220, carb:2, protein:8, fiber:0, sugar:1, sodium:700, group:'ปรุงสำเร็จ' },
  { id:'softdrink', name:'น้ำอัดลม', color:'#ff6b6b', kcal:140, carb:35, protein:0, fiber:0, sugar:35, sodium:45, group:'หวาน' }
];

const LEVELS = {
  1: { title:'เช้า 400–500 kcal', kcal:[400,500], limits:{sugar:30,sodium:1000}, minGroups:{'คาร์บเชิงซ้อน':1,'โปรตีน':1,'ผัก':1} },
  2: { title:'กลางวัน 550–700 kcal', kcal:[550,700], limits:{sugar:30,sodium:1500}, minGroups:{'โปรตีน':1,'ผัก':1} },
  3: { title:'เย็น 450–600 kcal (ลดหวานเค็ม)', kcal:[450,600], limits:{sugar:20,sodium:800}, minGroups:{'โปรตีน':1,'ผัก':1} }
};

window.NUTVR = {
  plate: [],
  onPlaced(el){
    const n = el.getAttribute('nutrient');
    this.plate.push(n);
    updateHUD();
    scorePreview();
  },
  reset(){
    this.plate = [];
    // remove placed clones by reloading items
    spawnFoods();
    updateHUD();
    scorePreview();
  }
};

function spawnFoods(){
  // Clear old
  document.querySelectorAll('.food').forEach(e=> e.parentNode.removeChild(e));
  const spawns = [document.getElementById('spawnL'), document.getElementById('spawnC'), document.getElementById('spawnR')];
  const columns = [[],[],[]];
  DB.forEach((it,i)=> columns[i%3].push(it));
  columns.forEach((col, ci)=>{
    col.forEach((it, ri)=>{
      const box = document.createElement('a-box');
      box.classList.add('food','clickable');
      box.setAttribute('color', it.color);
      box.setAttribute('depth','0.12'); box.setAttribute('height','0.08'); box.setAttribute('width','0.22');
      const pos = spawns[ci].object3D.position.clone();
      box.setAttribute('position', `${pos.x} ${pos.y - ri*0.12} ${pos.z}`);
      box.setAttribute('nutrient', it);
      box.setAttribute('grabbable-lite','');
      box.setAttribute('drag-follow','');
      // label
      const label = document.createElement('a-entity');
      label.setAttribute('text', `value:${it.name}; color:#001; align:center; width:2`);
      label.setAttribute('position', '0 0.06 0.07');
      box.appendChild(label);
      document.querySelector('a-scene').appendChild(box);
    });
  });
}

function updateGoalBoard(){
  const lv = HUD.levelSel.value;
  const L = LEVELS[lv];
  const text = `เป้าหมาย — ${L.title}
- พลังงานรวม ${L.kcal[0]}–${L.kcal[1]} kcal
- กลุ่มอาหารขั้นต่ำ: ${Object.keys(L.minGroups).map(k=>k+' '+L.minGroups[k]+' ที่').join(', ')}
- น้ำตาล ≤ ${L.limits.sugar} g, โซเดียม ≤ ${L.limits.sodium} mg`;
  document.getElementById('goalText').setAttribute('text', `value:${text}; align:center; color:#CFE8FF; width: 3`);
}

function updateHUD(){
  const s = window.NUTVR.plate.reduce((a,b)=>({
    kcal:a.kcal+b.kcal, carb:a.carb+b.carb, protein:a.protein+b.protein,
    fiber:a.fiber+b.fiber, sugar:a.sugar+b.sugar, sodium:a.sodium+b.sodium
  }), {kcal:0,carb:0,protein:0,fiber:0,sugar:0,sodium:0});
  HUD.kcal.textContent = Math.round(s.kcal);
  HUD.pro.textContent = Math.round(s.protein)+'g';
  HUD.carb.textContent = Math.round(s.carb)+'g';
  HUD.fib.textContent = Math.round(s.fiber)+'g';
  HUD.sug.textContent = Math.round(s.sugar)+'g';
  HUD.sod.textContent = Math.round(s.sodium)+'mg';
}

function scorePreview(){
  const lv = HUD.levelSel.value;
  const L = LEVELS[lv];
  const s = window.NUTVR.plate.reduce((a,b)=>({
    kcal:a.kcal+b.kcal, carb:a.carb+b.carb, protein:a.protein+b.protein,
    fiber:a.fiber+b.fiber, sugar:a.sugar+b.sugar, sodium:a.sodium+b.sodium
  }), {kcal:0,carb:0,protein:0,fiber:0,sugar:0,sodium:0});
  const counts = {};
  window.NUTVR.plate.forEach(it=>{
    const g = it.group.includes('โปรตีน')?'โปรตีน':(it.group==='คาร์บเชิงซ้อน'?'คาร์บเชิงซ้อน':it.group);
    counts[g]=(counts[g]||0)+1;
    if (it.group==='ผลไม้') counts['ผัก']=(counts['ผัก']||0)+1;
  });
  let stars = 3;
  if (s.kcal < L.kcal[0] || s.kcal > L.kcal[1]) stars--;
  if (s.sugar > L.limits.sugar) stars--;
  if (s.sodium > L.limits.sodium) stars--;
  for (const k in L.minGroups){ if ((counts[k]||0) < L.minGroups[k]) { stars--; break; } }
  stars = Math.max(1, Math.min(3, stars));
  HUD.stars.textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
}

HUD.levelSel.addEventListener('change', ()=>{ window.NUTVR.reset(); updateGoalBoard(); });
HUD.reset.addEventListener('click', ()=>{ window.NUTVR.reset(); });

// Init
spawnFoods();
updateGoalBoard();
updateHUD();
scorePreview();
