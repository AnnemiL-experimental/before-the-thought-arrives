import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ── states ────────────────────────────────────────────────────────────────────
// ── load DM Mono font ──────────────────────────────────────────────────────
if(typeof document!=="undefined"&&!document.getElementById("dm-mono-font")){
  const l=document.createElement("link");
  l.id="dm-mono-font";
  l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&family=GFS+Neohellenic&display=swap";
  document.head.appendChild(l);
}

const STATES = ["calm","focused","anxious","dreaming","depressed","fear","euphoric","pain"];
const STATE_CFG = {
  calm:      { zh:"Calm",    sub:"calm",  accent:"#7EC8A0", eeg:{delta:.20,theta:.28,alpha:.86,beta:.14,gamma:.06} },
  focused:   { zh:"Focused", sub:"focused",  accent:"#5AAADE", eeg:{delta:.10,theta:.14,alpha:.48,beta:.92,gamma:.36} },
  anxious:   { zh:"Anxious", sub:"anxious",  accent:"#DE5A6A", eeg:{delta:.14,theta:.26,alpha:.18,beta:.94,gamma:.74} },
  dreaming:  { zh:"Dreaming",sub:"dreaming",  accent:"#9B7ADE", eeg:{delta:.90,theta:.84,alpha:.38,beta:.08,gamma:.04} },
  depressed: { zh:"Depressed", sub:"depressed",  accent:"#5A6E8A", eeg:{delta:.68,theta:.52,alpha:.22,beta:.18,gamma:.08} },
  fear:      { zh:"Fear",    sub:"fear",  accent:"#C8A020", eeg:{delta:.12,theta:.22,alpha:.14,beta:.88,gamma:.82} },
  euphoric:  { zh:"Joy",     sub:"euphoric",  accent:"#FF9A3C", eeg:{delta:.08,theta:.20,alpha:.72,beta:.68,gamma:.52} },
  pain:      { zh:"Pain",    sub:"pain",  accent:"#CC3A6A", eeg:{delta:.18,theta:.30,alpha:.12,beta:.96,gamma:.88} },
};

// ── region definitions ────────────────────────────────────────────────────────
// pos: center in world space
// scale: ellipsoid radii [x,y,z]
// rotEuler: [x,y,z] tilt in radians
// seed: noise seed for surface deformation
const REGIONS = [
  {
    id:"frontal", zh:"Frontal",
    color: new THREE.Color(0.28,0.58,1.00),
    pos: new THREE.Vector3(0, 0.18, 0.92),
    scale: [1.08,0.82,0.78],
    rotEuler: [0.15, 0, 0],
    seed: 1.2,
    act: {calm:.16,focused:.95,anxious:.52,dreaming:.10,depressed:.12,fear:.60,euphoric:.88,pain:.42},
  },
  {
    id:"parL", zh:"Parietal L",
    color: new THREE.Color(0.30,0.90,0.55),
    pos: new THREE.Vector3(-0.72, 0.72, -0.10),
    scale: [0.72,0.72,0.80],
    rotEuler: [0, 0.28, 0.18],
    seed: 2.7,
    act: {calm:.76,focused:.46,anxious:.20,dreaming:.34,depressed:.22,fear:.28,euphoric:.64,pain:.30},
  },
  {
    id:"parR", zh:"Parietal R",
    color: new THREE.Color(0.30,0.90,0.55),
    pos: new THREE.Vector3( 0.72, 0.72, -0.10),
    scale: [0.72,0.72,0.80],
    rotEuler: [0,-0.28,-0.18],
    seed: 2.7,
    act: {calm:.76,focused:.46,anxious:.20,dreaming:.34,depressed:.22,fear:.28,euphoric:.64,pain:.30},
  },
  {
    id:"tempL", zh:"Temporal L",
    color: new THREE.Color(0.68,0.30,1.00),
    pos: new THREE.Vector3(-1.08, -0.22, 0.18),
    scale: [0.58,0.50,0.82],
    rotEuler: [0.10, 0, 0.32],
    seed: 4.1,
    act: {calm:.20,focused:.26,anxious:.38,dreaming:.90,depressed:.44,fear:.48,euphoric:.55,pain:.36},
  },
  {
    id:"tempR", zh:"Temporal R",
    color: new THREE.Color(0.68,0.30,1.00),
    pos: new THREE.Vector3( 1.08, -0.22, 0.18),
    scale: [0.58,0.50,0.82],
    rotEuler: [0.10, 0,-0.32],
    seed: 4.1,
    act: {calm:.20,focused:.26,anxious:.38,dreaming:.90,depressed:.44,fear:.48,euphoric:.55,pain:.36},
  },
  {
    id:"occipital", zh:"Occipital",
    color: new THREE.Color(0.24,0.76,1.00),
    pos: new THREE.Vector3(0, 0.12,-1.08),
    scale: [0.88,0.68,0.60],
    rotEuler: [-0.20, 0, 0],
    seed: 5.5,
    act: {calm:.70,focused:.20,anxious:.16,dreaming:.64,depressed:.18,fear:.22,euphoric:.40,pain:.18},
  },
  {
    id:"limbic", zh:"Limbic",
    color: new THREE.Color(1.00,0.28,0.36),
    pos: new THREE.Vector3(0, -0.28, 0.12),
    scale: [0.72,0.42,0.62],
    rotEuler: [0.22, 0, 0],
    seed: 6.8,
    act: {calm:.10,focused:.26,anxious:.96,dreaming:.22,depressed:.55,fear:.98,euphoric:.72,pain:.94},
  },
  {
    id:"hippL", zh:"Hippoc. L",
    color: new THREE.Color(1.00,0.62,0.18),
    pos: new THREE.Vector3(-0.42, -0.42, -0.08),
    scale: [0.26,0.22,0.58],
    rotEuler: [0.30, 0.40, 0.20],
    seed: 8.2,
    act: {calm:.12,focused:.20,anxious:.44,dreaming:.88,depressed:.70,fear:.82,euphoric:.38,pain:.58},
  },
  {
    id:"hippR", zh:"Hippoc. R",
    color: new THREE.Color(1.00,0.62,0.18),
    pos: new THREE.Vector3( 0.42, -0.42, -0.08),
    scale: [0.26,0.22,0.58],
    rotEuler: [0.30,-0.40,-0.20],
    seed: 8.2,
    act: {calm:.12,focused:.20,anxious:.44,dreaming:.88,depressed:.70,fear:.82,euphoric:.38,pain:.58},
  },
  {
    id:"cerebellum", zh:"Cerebellum",
    color: new THREE.Color(0.40,0.88,0.72),
    pos: new THREE.Vector3(0, -0.72,-0.88),
    scale: [0.92,0.52,0.58],
    rotEuler: [0.18, 0, 0],
    seed: 9.6,
    act: {calm:.30,focused:.18,anxious:.14,dreaming:.20,depressed:.14,fear:.20,euphoric:.34,pain:.22},
  },
];

const CONNECTIONS = [
  ["frontal","parL"],["frontal","parR"],["frontal","limbic"],
  ["parL","parR"],["parL","tempL"],["parL","occipital"],
  ["parR","tempR"],["parR","occipital"],
  ["tempL","limbic"],["tempR","limbic"],
  ["tempL","hippL"],["tempR","hippR"],
  ["limbic","hippL"],["limbic","hippR"],
  ["occipital","cerebellum"],
];

// ── build a region geometry: deformed ellipsoid ───────────────────────────────
function buildRegionGeo(r, segs=48) {
  const geo = new THREE.SphereGeometry(1.0, segs, Math.floor(segs*0.70));
  const pa  = geo.attributes.position;

  for (let i = 0; i < pa.count; i++) {
    let x=pa.getX(i), y=pa.getY(i), z=pa.getZ(i);
    const l=Math.sqrt(x*x+y*y+z*z)||1;
    const nx=x/l, ny=y/l, nz=z/l;

    x = nx * r.scale[0];
    y = ny * r.scale[1];
    z = nz * r.scale[2];

    const s=r.seed;
    // large-scale lobing
    const lobe =
      Math.sin(nx*2.8+s*0.5)*Math.cos(ny*2.4+s*0.3)*0.14 +
      Math.sin(ny*3.1+nz*2.6+s*0.8)*0.10 +
      Math.cos(nx*3.6+nz*2.2+s*1.1)*0.08;
    // mid-scale sulcal folds
    const sulci =
      Math.sin(nx*6.2+s)*Math.cos(ny*6.8+s*0.7)*0.055 +
      Math.sin(nz*7.8+s*1.3)*Math.cos(nx*5.4+s*0.4)*0.040 +
      Math.sin(nx*9.4+ny*8.2+s*2.1)*0.028;
    // fine texture
    const fine =
      Math.sin(nx*14+ny*12+s*3.2)*0.014 +
      Math.cos(nz*16+nx*13+s*2.8)*0.010;

    const nr = 1.0 + lobe + sulci + fine;
    pa.setXYZ(i, x*nr, y*nr, z*nr);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── cfos punctum: tight bright dot ───────────────────────────────────────────
function makePunctumTex(){
  const sz=64, c=document.createElement("canvas");
  c.width=c.height=sz;
  const ctx=c.getContext("2d");
  // draw multiple overlapping radial gradients for a hot-core look
  const gr=ctx.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,   "rgba(255,255,255,1.00)");
  gr.addColorStop(0.08,"rgba(255,255,255,1.00)");
  gr.addColorStop(0.20,"rgba(255,255,255,0.72)");
  gr.addColorStop(0.42,"rgba(255,255,255,0.18)");
  gr.addColorStop(0.70,"rgba(255,255,255,0.04)");
  gr.addColorStop(1,   "rgba(255,255,255,0.00)");
  ctx.fillStyle=gr; ctx.fillRect(0,0,sz,sz);
  return new THREE.CanvasTexture(c);
}

// ── large halo glow ───────────────────────────────────────────────────────────
function makeGlowTex(r,g,b){
  const sz=128, c=document.createElement("canvas");
  c.width=c.height=sz;
  const ctx=c.getContext("2d");
  const gr=ctx.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,   `rgba(${r},${g},${b},1.0)`);
  gr.addColorStop(0.20,`rgba(${r},${g},${b},0.60)`);
  gr.addColorStop(0.55,`rgba(${r},${g},${b},0.12)`);
  gr.addColorStop(1,   `rgba(${r},${g},${b},0.00)`);
  ctx.fillStyle=gr; ctx.fillRect(0,0,sz,sz);
  return new THREE.CanvasTexture(c);
}

// ── sample N points on mesh surface with clustered non-uniform distribution ───
function sampleSurfacePoints(geo, N){
  const pos=geo.attributes.position;
  const idx=geo.index?geo.index.array:null;
  const tris=idx?idx.length/3:pos.count/3;
  const A=new THREE.Vector3(),B=new THREE.Vector3(),C=new THREE.Vector3();

  // build area CDF
  const areas=new Float32Array(tris);
  let total=0;
  for(let t=0;t<tris;t++){
    const i0=idx?idx[t*3]:t*3,i1=idx?idx[t*3+1]:t*3+1,i2=idx?idx[t*3+2]:t*3+2;
    A.set(pos.getX(i0),pos.getY(i0),pos.getZ(i0));
    B.set(pos.getX(i1),pos.getY(i1),pos.getZ(i1));
    C.set(pos.getX(i2),pos.getY(i2),pos.getZ(i2));
    const area=new THREE.Vector3().subVectors(B,A).cross(new THREE.Vector3().subVectors(C,A)).length()*0.5;
    areas[t]=area; total+=area;
  }
  const cdf=new Float32Array(tris);
  let acc=0;
  for(let t=0;t<tris;t++){acc+=areas[t]/total;cdf[t]=acc;}

  function sampleOne(){
    const r0=Math.random();
    let t=tris-1;
    for(let i=0;i<tris;i++){if(cdf[i]>=r0){t=i;break;}}
    const i0=idx?idx[t*3]:t*3,i1=idx?idx[t*3+1]:t*3+1,i2=idx?idx[t*3+2]:t*3+2;
    A.set(pos.getX(i0),pos.getY(i0),pos.getZ(i0));
    B.set(pos.getX(i1),pos.getY(i1),pos.getZ(i1));
    C.set(pos.getX(i2),pos.getY(i2),pos.getZ(i2));
    let u=Math.random(),v=Math.random();
    if(u+v>1){u=1-u;v=1-v;}
    return new THREE.Vector3().addScaledVector(A,1-u-v).addScaledVector(B,u).addScaledVector(C,v);
  }

  const pts=[];
  // ~40% points placed in random dense clusters (3-9 per cluster)
  const clusterCount=Math.floor(N*0.40);
  let placed=0;
  while(placed<clusterCount){
    const anchor=sampleOne();
    const clSize=3+Math.floor(Math.random()*7);
    for(let k=0;k<clSize&&placed<clusterCount;k++){
      // jitter near anchor — tight gaussian-ish spread
      const jitter=0.04+Math.random()*0.06;
      const p=anchor.clone().add(new THREE.Vector3(
        (Math.random()-0.5)*jitter,
        (Math.random()-0.5)*jitter,
        (Math.random()-0.5)*jitter,
      ));
      pts.push(p); placed++;
    }
  }
  // remaining points: area-weighted but then thinned by random rejection
  // creates sparse voids naturally
  while(pts.length<N){
    const p=sampleOne();
    // random rejection: 30% chance to skip — creates uneven density
    if(Math.random()>0.30) pts.push(p);
  }
  return pts;
}

// ── arc between two world positions ──────────────────────────────────────────
function makeArcGeo(a,b,bow=0.18,segs=20){
  const pts=[];
  for(let i=0;i<=segs;i++){
    const t=i/segs;
    const p=new THREE.Vector3().lerpVectors(a,b,t);
    const mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(0.5);
    const outDir=mid.clone().normalize();
    p.addScaledVector(outDir, Math.sin(t*Math.PI)*bow);
    pts.push(p.clone());
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

// ── pulse ring ────────────────────────────────────────────────────────────────
function spawnRipple(parent,pos,color){
  const segs=28,pts=[],r0=0.055;
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*r0,Math.sin(a)*r0,0));}
  const geo=new THREE.BufferGeometry().setFromPoints(pts);
  const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false});
  const ring=new THREE.LineLoop(geo,mat);
  ring.position.copy(pos);
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),pos.clone().normalize());
  ring.rotateZ(Math.random()*Math.PI*2);
  parent.add(ring);
  return{ring,geo,mat,age:0,maxAge:1.2+Math.random()*0.8,maxS:1+3*Math.random()};
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function NeuralBrain(){
  const mountRef=useRef(null);
  const stateRef=useRef("calm");
  const [curState,setCurState]=useState("calm");
  const [acts,setActs]=useState(Object.fromEntries(REGIONS.map(r=>[r.id,r.act.calm])));
  const [eeg,setEeg]=useState({...STATE_CFG.calm.eeg});
  const switchState=s=>{setCurState(s);stateRef.current=s;};
  const [narrative,setNarrative]=useState("");
  const [narDisplayed,setNarDisplayed]=useState("");
  const [generating,setGenerating]=useState(false);
  const [debugMsg,setDebugMsg]=useState("");
  const actsRef=useRef(acts);
  useEffect(()=>{actsRef.current=acts;},[acts]);
  const eegStateRef=useRef(eeg);
  useEffect(()=>{eegStateRef.current=eeg;},[eeg]);

  useEffect(()=>{
    const mount=mountRef.current;
    const W=mount.clientWidth, H=mount.clientHeight;

    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(W,H);
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setClearColor(0x0E1828,1);
    mount.appendChild(renderer.domElement);

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(44,W/H,0.1,100);
    camera.position.set(0,0.25,5.6);
    camera.lookAt(0,0,0);

    // very subtle ambient + directional so the fill meshes read as depth cues
    scene.add(new THREE.AmbientLight(0x9AAABE,0.52));
    const key=new THREE.DirectionalLight(0xFFFFFF,0.72);
    key.position.set(3,6,4); scene.add(key);

    const pivot=new THREE.Group();
    scene.add(pivot);

    // ── shared punctum texture ──
    const punctumTex=makePunctumTex();

    // ── build each region ──
    const rObjs={};
    REGIONS.forEach(r=>{
      const geo=buildRegionGeo(r);

      const grp=new THREE.Group();
      grp.position.copy(r.pos);
      grp.rotation.set(...r.rotEuler);
      pivot.add(grp);

      // fill mesh — invisible, only for depth occlusion
      const fillMat=new THREE.MeshBasicMaterial({
        color:r.color, transparent:true, opacity:0.10,
        depthWrite:true, side:THREE.FrontSide,
      });
      const fillMesh=new THREE.Mesh(geo,fillMat);
      fillMesh.renderOrder=0;
      grp.add(fillMesh);

      // ── cfos puncta: surface-sampled point cloud ──
      // two layers: dense dim background + sparser bright active dots
      const N_BG=384, N_ACT=336;
      const bgPts  = sampleSurfacePoints(geo, N_BG);
      const actPts = sampleSurfacePoints(geo, N_ACT);

      // background puncta — always faintly present, show region shape
      const bgPos=new Float32Array(N_BG*3);
      bgPts.forEach((p,i)=>{bgPos[i*3]=p.x;bgPos[i*3+1]=p.y;bgPos[i*3+2]=p.z;});
      const bgGeo=new THREE.BufferGeometry();
      bgGeo.setAttribute("position",new THREE.BufferAttribute(bgPos,3));
      const bgMat=new THREE.PointsMaterial({
        map:punctumTex, color:r.color,
        size:0.042, sizeAttenuation:true,
        transparent:true, opacity:0.18,
        blending:THREE.AdditiveBlending, depthWrite:false, alphaTest:0.02,
      });
      grp.add(new THREE.Points(bgGeo,bgMat));

      // active puncta — light up with activation
      // store per-point random flicker offsets
      const flickerOffsets=new Float32Array(N_ACT);
      for(let i=0;i<N_ACT;i++) flickerOffsets[i]=Math.random()*Math.PI*2;
      const actPos=new Float32Array(N_ACT*3);
      actPts.forEach((p,i)=>{actPos[i*3]=p.x;actPos[i*3+1]=p.y;actPos[i*3+2]=p.z;});
      const actGeo=new THREE.BufferGeometry();
      actGeo.setAttribute("position",new THREE.BufferAttribute(actPos,3));
      const actMat=new THREE.PointsMaterial({
        map:punctumTex, color:r.color,
        size:0.068, sizeAttenuation:true,
        transparent:true, opacity:0,
        blending:THREE.AdditiveBlending, depthWrite:false, alphaTest:0.02,
      });
      grp.add(new THREE.Points(actGeo,actMat));

      // large halo glow sprite at center
      const lc=r.color;
      const halotex=makeGlowTex(Math.round(lc.r*255),Math.round(lc.g*255),Math.round(lc.b*255));
      const halo=new THREE.Sprite(new THREE.SpriteMaterial({
        map:halotex,transparent:true,opacity:0,
        blending:THREE.AdditiveBlending,depthWrite:false,
      }));
      halo.scale.setScalar(0.55);
      grp.add(halo);

      rObjs[r.id]={fillMat,bgMat,actMat,halo,flickerOffsets};
    });

    // ── connection arcs ──
    const connLines=CONNECTIONS.map(([aId,bId])=>{
      const rA=REGIONS.find(r=>r.id===aId);
      const rB=REGIONS.find(r=>r.id===bId);
      const mat=new THREE.LineBasicMaterial({
        color:0x0A1E30,transparent:true,opacity:0,
        blending:THREE.AdditiveBlending,depthWrite:false,
      });
      const line=new THREE.Line(makeArcGeo(rA.pos,rB.pos),mat);
      line.renderOrder=1;
      pivot.add(line);
      return{mat,aId,bId};
    });

    // mouse orbit
    let drag=false,lx=0,ly=0,rotX=0.16,rotY=0.28;
    const onDn=e=>{drag=true;lx=e.clientX;ly=e.clientY;};
    const onUp=()=>{drag=false;};
    const onMv=e=>{
      if(!drag)return;
      rotY+=(e.clientX-lx)*.010;
      rotX+=(e.clientY-ly)*.006;
      rotX=Math.max(-.88,Math.min(.88,rotX));
      lx=e.clientX;ly=e.clientY;
    };
    renderer.domElement.addEventListener("mousedown",onDn);
    window.addEventListener("mouseup",onUp);
    window.addEventListener("mousemove",onMv);

    let pulses=[];
    let curActs=Object.fromEntries(REGIONS.map(r=>[r.id,r.act.calm]));
    let curEeg={...STATE_CFG.calm.eeg};
    let last=performance.now(),t=0,frame=0,raf;

    const tick=()=>{
      raf=requestAnimationFrame(tick);
      const now=performance.now(),dt=Math.min((now-last)/1000,.05);
      last=now;t+=dt;frame++;

      if(!drag) rotY+=dt*0.062;
      pivot.rotation.x=rotX;
      pivot.rotation.y=rotY;

      const state=stateRef.current;
      Object.keys(curEeg).forEach(b=>{
        curEeg[b]+=(STATE_CFG[state].eeg[b]-curEeg[b])*dt*2.0;
      });

      const snap={};
      REGIONS.forEach(r=>{
        curActs[r.id]+=(r.act[state]-curActs[r.id])*dt*2.6;
        snap[r.id]=curActs[r.id];
      });

      // dominance contrast
      const vals=REGIONS.map(r=>curActs[r.id]);
      const maxAct=Math.max(...vals);
      const avgAct=vals.reduce((s,v)=>s+v,0)/vals.length;
      const spread=maxAct>0.05
        ? Math.pow(Math.max(0,maxAct-avgAct)/(maxAct+0.001),0.48)
        : 0;

      REGIONS.forEach(r=>{
        const a=curActs[r.id];
        const rel=maxAct>0.05?a/maxAct:a;
        const sup=1-spread*(1-Math.pow(rel,1.3))*0.94;
        const eff=Math.min(1,a*sup);
        const obj=rObjs[r.id];

        // background puncta: always show faint region shape, dims when another dominates
        obj.bgMat.opacity = 0.06 + (1-spread*0.75)*0.06;

        // active puncta: light up proportional to activation
        // add per-frame flicker so each dot twinkles independently
        // we approximate flicker by modulating global opacity with a fast noise term
        // (true per-point flicker needs shader; this is a good approximation)
        // ── EEG-frequency-aligned flicker ──
        // representative centre frequencies (Hz), scaled to perceptible animation rates
        // delta 2Hz, theta 6Hz, alpha 10Hz, beta 20Hz, gamma 40Hz
        // gamma/beta are fast — we fold them to sub-Hz aliases so they read as shimmer/buzz
        const eegW = curEeg.delta + curEeg.theta + curEeg.alpha + curEeg.beta + curEeg.gamma + 0.001;
        // weighted blend of band centre freqs
        const blendFreq =
          (curEeg.delta*2.0 + curEeg.theta*6.0 + curEeg.alpha*10.0 +
           curEeg.beta*20.0  + curEeg.gamma*40.0) / eegW;
        // each region gets a unique phase so they don't all pulse together
        const rPhase = (r.pos.x*2.3 + r.pos.y*1.7 + r.pos.z*3.1);
        // primary oscillation at blend frequency
        const osc1 = Math.sin(t * blendFreq * 0.22 + rPhase);          // main rhythm
        // secondary: beat between dominant band and next — gives interference texture
        const osc2 = Math.sin(t * blendFreq * 0.14 + rPhase * 0.7);
        // fast gamma shimmer overlay (always present but stronger when gamma high)
        const shimmer = Math.sin(t * 28.0 + rPhase) * curEeg.gamma * 0.18;
        const flicker = 0.68 + osc1*0.18 + osc2*0.10 + shimmer;
        obj.actMat.opacity = Math.min(1.00, eff*1.56*Math.max(0.2, flicker));
        obj.actMat.size = 0.052 + eff*0.045;

        // fill occlusion
        obj.fillMat.opacity = 0.03 + eff*0.06;

        // halo glow at region center
        obj.halo.material.opacity=Math.min(0.88, eff*0.76*(0.88+Math.sin(t*2.8+r.pos.y)*0.12));
        obj.halo.scale.setScalar(0.55*(0.8+eff*0.50));

        if(a>0.30&&Math.random()<a*dt*1.4)
          pulses.push(spawnRipple(pivot,r.pos,r.color));
      });

      // connection arcs
      connLines.forEach(({mat,aId,bId})=>{
        const a=(curActs[aId]+curActs[bId])*0.5;
        const fl=0.84+Math.sin(t*5.5+aId.charCodeAt(0))*0.16;
        mat.opacity=Math.min(0.75,a*a*2.2*fl);
        const ca=REGIONS.find(r=>r.id===aId).color;
        const cb=REGIONS.find(r=>r.id===bId).color;
        mat.color.copy(ca).lerp(cb,0.5).multiplyScalar(0.40+a*0.80);
      });

      pulses=pulses.filter(p=>{
        p.age+=dt;const prog=p.age/p.maxAge;
        if(prog>=1){pivot.remove(p.ring);p.geo.dispose();p.mat.dispose();return false;}
        p.ring.scale.setScalar(1+(1-Math.pow(1-prog,2.2))*(p.maxS-1));
        p.mat.opacity=0.58*Math.pow(1-prog,1.8);
        return true;
      });

      if(frame%4===0){setActs({...snap});setEeg({...curEeg});}
      renderer.render(scene,camera);
    };
    tick();

    return()=>{
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("mousedown",onDn);
      window.removeEventListener("mouseup",onUp);
      window.removeEventListener("mousemove",onMv);
      renderer.dispose();
      if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement);
    };
  },[]);

  const acc=STATE_CFG[curState].accent;

  // ── narrative generation ──────────────────────────────────────────────────

  // ── narrative fragments keyed by dominant signal, not stage ──────────────
  // Each entry: [english paragraph, chinese paragraph]
  // Selected by reading actual EEG values + active regions each time

  // ── fragment-based narrative generator ──────────────────────────────────
  const F = {
    calm: {
      en: {
        open: [
          "Alpha spindles cascade at {alpha}% amplitude across bilateral parietal cortex.",
          "Posterior alpha dominant at {alpha}%, symmetric — the resting brain settling into itself.",
          "The body reports inward. Delta at {delta}%, slow as coastal tides.",
          "Beta suppressed below {beta}% — attentional networks at minimum viable.",
          "Broadband power is low and evenly distributed; no single frequency asserts dominance.",
          "Thalamocortical loops are cycling at {delta}% delta, gating most sensory traffic.",
          "The default mode network hums at idle, its characteristic alpha rhythm peaking at {alpha}%.",
          "Prefrontal inhibition is settling, a dimmer turned three-quarters down.",
        ],
        mid: [
          "The hippocampal theta dips below consolidation threshold; nothing is being stored because nothing demands to be.",
          "Sensory gating is partial — the world continues at reduced volume.",
          "Interoceptive signals arrive without urgency: heartbeat, breath, the weight of limbs.",
          "The anterior cingulate has nothing to flag. Functional connectivity is diffuse, unhurried.",
          "Memory consolidation idles. The prefrontal filter is open but undemanding.",
          "Default mode network sustains its quiet self-referential processing, unchallenged.",
          "The thalamus permits just enough sensory traffic to confirm that nothing is wrong.",
          "Cortical columns trade slow oscillations, updating internal models without urgency.",
        ],
        close: [
          "Baseline, stable. The brain is doing what it does when left alone.",
          "Nothing demands resolution. The system rests inside its own hum.",
          "Thought arrives, observes itself briefly, and departs without urgency.",
          "This is the default. It turns out the default is quite large.",
          "Clinical notation: resting state. No flags raised.",
          "The loop is quiet. The system is sufficient to itself.",
          "Attention is available but unassigned. A held breath, comfortable.",
          "The signal is clean, if uneventful. Baseline recorded.",
        ],
      },
      zh: {
        open: [
          "某种松弛从枕叶开始，一路向前蔓延。",
          "不是空，是悬——像一直绷着的线，终于没有人在另一头拉着了。",
          "身体在清点自己：心跳，呼吸，四肢的重量。",
          "{alpha}%的后部alpha像潮水，两侧对称地涨着。",
          "一切都在，但没有任何东西在要求。",
          "感觉的音量被调低了，但没有关掉。",
          "丘脑只放进来足够的信息，用来确认没有什么不对。",
          "大脑在处理自己，没有外部任务交给它。",
        ],
        mid: [
          "思维来了，看了自己一眼，又走了。",
          "前额叶没有在努力，这本身就是一种努力之后的状态。",
          "世界还在运行，只是音量被调低了。记忆在别处整理自己。",
          "前扣带回没有任何东西需要标记。",
          "注意力在场，但没有被分配。像一只手，张开着，什么都没握。",
          "感觉信号到达，但没有任务分配给它们。",
          "内部状态的更新在进行，但不急。",
          "没有冲突，没有需要监控的。系统在自己运行。",
        ],
        close: [
          "就这样待着，不需要去哪里。",
          "静不是没有，是有而不用。",
          "这是基线。原来基线这么大。",
          "没有什么需要解决。系统在自己的嗡嗡声中休息。",
          "临床标注：静息状态。没有标记。",
          "循环是安静的。系统对自己足够。",
          "信号是干净的，如果平淡的话。",
          "不急。这本身就是一种状态。",
        ],
      },
    },

    focused: {
      en: {
        open: [
          "Beta at {beta}% — sustained, sharp, the signature of engaged executive function.",
          "High-frequency beta at {beta}% with gamma co-activation at {gamma}%: the brain at load.",
          "Dorsolateral prefrontal at maximum recruitment. Gamma bursts at {gamma}% binding features.",
          "The prefrontal-parietal network running hot at {beta}% — working memory filling to capacity.",
          "Sustained attention subroutine active; beta at {beta}% locks the axis of regard.",
          "Gamma at {gamma}% marks cross-regional feature binding — the task assembled as a single object.",
          "Executive load: high. Beta {beta}%, gamma {gamma}%. The anterior cingulate on standby.",
          "The dorsal attention network is fully engaged. Beta spindles at {beta}%.",
        ],
        mid: [
          "The anterior cingulate stands ready for error detection while attentional networks suppress peripheral input.",
          "Working memory holds approximately seven items; the frontal lobe negotiates triage in real time.",
          "Orbitofrontal cortex monitors reward value of continued effort — the calculation favours pressing on.",
          "Cross-cortical synchrony binds the task into a coherent object. Everything outside it becomes theoretical.",
          "Distractors are suppressed with clinical efficiency. The signal-to-noise ratio is optimised.",
          "The prefrontal filter is tight. Input that does not serve the task is discarded before it surfaces.",
          "Hippocampal involvement is low — this is retrieval from working memory, not long-term store.",
          "The cingulate monitors for conflict and finds none. The task is clean.",
        ],
        close: [
          "The world has contracted to the precise width of the task at hand, no wider.",
          "The rest of the self is on hold. It will still be there.",
          "Distractors suppressed. The system is doing exactly what it is designed to do.",
          "This is what executive recruitment feels like from the inside: pressure, clarity, cost.",
          "Attention is assigned. Everything else is theoretical.",
          "High metabolic cost, sustained. The output is worth it, or the system believes so.",
          "The loop is tight. Error correction is immediate. The task continues.",
          "Nothing leaks through. The focus is total and temporary.",
        ],
      },
      zh: {
        open: [
          "收窄。一切都在收窄，向一个点汇聚。",
          "{beta}%的beta，像一根拉紧的弦，执行功能全力运转的频率。",
          "额叶把所有资源都拉向同一件事，{gamma}%的gamma在各区域之间绑定特征。",
          "有什么东西在额头后面收紧，像螺丝在慢慢拧。工作记忆在填满。",
          "注意力被分配了。其余的一切都变成了理论。",
          "{gamma}%的gamma把任务绑成一个连贯的对象。这是专注从内部感受的样子。",
          "执行负荷：高。前扣带回在待机，随时准备捕捉错误。",
          "背侧注意网络全力运转。任务成为了唯一的现实。",
        ],
        mid: [
          "任务之外的世界变成了理论。干扰在外围等着，但进不来。",
          "七项，也许八项，如果我足够小心的话。额叶在实时决定什么留下，什么掉落。",
          "眶额皮质在计算：值得继续。计算结果是肯定的。",
          "跨皮质同步把任务绑成一个连贯的对象，干扰被过滤，信噪比最优化。",
          "前额叶的过滤器很紧。不服务于任务的输入在到达意识之前就被丢弃了。",
          "海马体参与度低——这是工作记忆的提取，不需要长期存储。",
          "扣带回监控冲突，发现没有。任务是干净的。",
          "抑制效率很高。外围的噪声在压制状态下等待。",
        ],
        close: [
          "任务之外的自我被暂时搁置，不是消失了，只是在等。",
          "干扰被压下去了，但它们还在，在外围等。",
          "专注不是轻松，是高代谢。",
          "世界缩成了当前任务的宽度，精确地，不多一厘米。",
          "没有泄漏。专注是彻底的，也是临时的。",
          "循环很紧。错误修正是即时的。任务继续。",
          "高代谢成本，持续中。系统认为产出值得。",
          "这是压力，清晰，代价——从内部感受的专注。",
        ],
      },
    },

    anxious: {
      en: {
        open: [
          "Amygdala firing at {gamma}% gamma — before the cortex has named the threat.",
          "Beta at {beta}%, gamma at {gamma}%: the salience network saturated.",
          "Limbic hyperactivation. The amygdala fires before the thought arrives.",
          "Elevated beta at {beta}%, HPA axis engaged — body committed before cortex authorised.",
          "The locus coeruleus is flooding norepinephrine; beta at {beta}% sharpens perception.",
          "Threat appraisal circuits active at {gamma}% gamma — the subcortical alarm is running.",
          "The insula is mapping somatic distress in real time. Beta {beta}%, gamma {gamma}%.",
          "Sympathetic tone elevated. The body has made a decision the cortex hasn't caught up to.",
        ],
        mid: [
          "The anterior cingulate floods with conflict signal. Prefrontal reappraisal meets subcortical resistance.",
          "Orbitofrontal cortex cannot stop probability-weighting negative outcomes.",
          "Hippocampal overconsolidation of threat-adjacent memories — pattern-matching is overinclusive.",
          "Interoceptive signals flood the insula: heart rate, shallow breathing, jaw tension.",
          "The threat appraisal system is running hot and cannot be reasoned with from the outside.",
          "Descending cortical inhibition is insufficient. The subcortical signal dominates.",
          "Conflict monitoring overloaded. Every input is screened for danger before it resolves.",
          "The prefrontal tries to contextualise. The amygdala dismisses the argument.",
        ],
        close: [
          "The body is braced for something that may or may not arrive. Hyperarousal, sustained.",
          "The danger is real enough to the amygdala. The cortex files its objections and is not heard.",
          "Autonomic dysregulation, sustained. The loop continues.",
          "Fight-or-flight architecture fully deployed. Waiting.",
          "The system is optimised for a threat it cannot confirm. That is the architecture.",
          "Clinical: hyperarousal state. Reappraisal insufficient.",
          "The loop is self-reinforcing. Each cycle confirms the last.",
          "The alarm is running. Whether to trust it is a different question.",
        ],
      },
      zh: {
        open: [
          "杏仁核在皮质命名威胁之前就开枪了。",
          "{gamma}%的gamma，显著性网络饱和——一切都是潜在的信号。",
          "边缘系统过度激活。思维到达之前，身体已经做了决定。",
          "如果……如果……如果……前扣带回在溢出冲突信号。",
          "蓝斑核在注入去甲肾上腺素，感知被锐化，焦点被收窄。",
          "威胁评估回路在{gamma}%的gamma下运转——皮质下的警报在响。",
          "岛叶在实时绘制躯体痛苦的地图。",
          "交感张力升高。身体做了一个决定，皮质还没追上。",
        ],
        mid: [
          "海马体在过度巩固威胁相关记忆，模式匹配过于宽泛。",
          "岛叶在接收身体发来的报告：心率偏高，呼吸浅了一点点，下颌的张力。",
          "眶额皮质在不停地给负面结果赋予概率权重，停不下来。",
          "皮质下行抑制不够用。皮质下的信号在主导。",
          "冲突监控超载。每一个输入都在被筛查危险，然后才能被解析。",
          "前额叶在尝试提供语境。杏仁核不接受这个论点。",
          "每个影子都比实际上更尖锐一点。这是过度包含的模式匹配。",
          "威胁评估系统的逻辑是自洽的，从外部无法说服它。",
        ],
        close: [
          "这个循环已经转了很多圈了，每一圈都在确认上一圈。",
          "对杏仁核来说，危险足够真实了。身体保持在预备状态。",
          "自主神经调节紊乱，持续中。循环继续。",
          "临床：过度觉醒状态。重评估不足。",
          "系统为一个无法确认的威胁做了优化。这就是这个架构的样子。",
          "警报在响。是否信任它是另一个问题。",
          "循环是自我强化的。身体等待，皮质也等待。",
          "预备状态，持续中。等待信号，等待释放。",
        ],
      },
    },

    dreaming: {
      en: {
        open: [
          "Delta at {delta}%, theta at {theta}%: the thalamus gates sensory input to near-zero.",
          "Slow cortical oscillations at {delta}% synchronise thalamocortical loops.",
          "Theta at {theta}% — the navigation frequency, now turned entirely inward.",
          "The boundary between wakefulness and sleep is permeable here. Delta at {delta}%.",
          "Hippocampal sharp-wave ripples interrupt the delta background; replay is in progress.",
          "Cortical slow oscillations organise themselves without any external input to organise around.",
          "REM-adjacent activity: theta {theta}%, temporal lobe active in a mode without a waking analogue.",
          "The default mode network is at full volume, unmonitored. Delta {delta}%.",
        ],
        mid: [
          "Hippocampal replay cycles through unresolved sequences. Narrative logic is suspended.",
          "The sleeping brain trades information with itself in a language the waking brain will not recall.",
          "The hippocampus walks through spaces that don't exist, filing experiences being constructed now.",
          "Default mode network at full volume, unmonitored. Memory and imagination share the same substrate.",
          "Temporal lobe active in a mode that is not quite waking, not quite sleep.",
          "Cortical columns exchange slow wave packets; the content is internal, self-referential.",
          "Pattern completion runs without the usual error-correction from prefrontal input.",
          "The scenes assemble without regard for temporal order or causal coherence.",
        ],
        close: [
          "Sequence without causality. Image without referent. The usual self is absent.",
          "Whatever is being processed will not be legible by morning. Only residue.",
          "The sleeping brain is writing itself letters it won't remember.",
          "Consolidation. Or invention. At this depth, the difference is technical.",
          "Something is being filed. The filing system is not waking logic.",
          "The signal goes inward and does not report back.",
          "This will leave a mark that cannot be read. Only felt.",
          "The architecture is intact. The content is private, even from itself.",
        ],
      },
      zh: {
        open: [
          "{delta}%的delta，{theta}%的theta。丘脑把感觉输入关到几乎没有。",
          "慢皮质振荡在同步丘脑皮质环路，睡着的大脑在给自己写信。",
          "{theta}%的theta，导航的频率，现在向内转，在不存在的空间里行走。",
          "清醒和睡眠之间的边界在这里是可渗透的。",
          "海马体的锐波涟漪在delta背景上打断，重放正在进行中。",
          "皮质慢振荡在没有任何外部输入的情况下自我组织。",
          "颞叶以一种没有清醒类比的模式运作。",
          "默认模式网络以满音量运行，无人监督。",
        ],
        mid: [
          "海马体在重放今天未解决的序列。叙事逻辑被暂停了。",
          "记忆和想象在这个深度有同样的质地，分不清了，也不需要分清。",
          "海马体在归档那些也许发生过、也许正在被构建的经历。",
          "皮质柱在交换慢波包裹，内容是内部的、自我指涉的。",
          "模式补全在没有前额叶输入纠错的情况下运行。",
          "场景在拼接，不在乎时间顺序，不在乎因果。",
          "颞叶以一种不完全是清醒、不完全是睡眠的模式运作。",
          "某些东西正在被归档。归档系统不是清醒的逻辑。",
        ],
        close: [
          "没有因果的序列。没有指涉的图像。到早上就无法读取了，只剩残影。",
          "醒来就忘了。只有残留。",
          "这是巩固。或者是发明。在这个深度，区别是技术性的。",
          "有别的什么在做拼接工作。平时的那个自我不在。",
          "某些东西正在被记录，但记录系统是私密的，甚至对自己也是。",
          "信号向内走，不汇报回来。",
          "这会留下一个无法被读取的印记。只能被感受到。",
          "架构完整。内容是私密的，甚至对自己也是。",
        ],
      },
    },

    depressed: {
      en: {
        open: [
          "Delta dominant at {delta}%, prefrontal activation globally suppressed.",
          "Subgenual cingulate hyperactivity with hippocampal volume under glucocorticoid load.",
          "Reduced broadband power with flattened affect-related modulation.",
          "The theta rhythm slow at {theta}%, uninspired. Rumination circuits cycling.",
          "Serotonergic signalling is attenuated; dopaminergic projection to prefrontal cortex is dim.",
          "The reward prediction system has stopped updating. Expected value signals are flat.",
          "Anterior cingulate activity is shifted toward subgenual regions — the signature of persistent low mood.",
          "Prefrontal hypoactivation at {beta}% beta — executive function present but underinvested.",
        ],
        mid: [
          "Anhedonia is not emptiness: it is the presence of a ceiling flattening the affect range.",
          "The frontal lobe processes inputs accurately and returns correct outputs — from very far away.",
          "The reward system has stopped updating. Everything costs more than it returns.",
          "Rumination circuits engage — same conclusions, different hour. The loop is familiar.",
          "Interoceptive signals arrive but carry no valence. The body reports; nobody is moved.",
          "The gap between knowing and feeling is measurable today.",
          "Language is intact. Cognition is intact. The signal that makes them matter is not.",
          "Everything continues at minimum viable. The system calls this fine.",
        ],
        close: [
          "The world arrives filtered, slightly delayed, as through thicker air.",
          "I know the words for what I should feel. They arrive correct but inert.",
          "The brain is running at minimum viable, and calling it fine.",
          "The gap between language and experience is measurable today.",
          "The ceiling is low. Everything continues at the same low elevation.",
          "Not absence. Presence of a weight that makes the same.",
          "The system is sufficient. It does not feel sufficient. These are separate facts.",
          "Functional. Present. Somewhere further from the surface than usual.",
        ],
      },
      zh: {
        open: [
          "{delta}%的delta主导，前额叶整体抑制。",
          "膝下扣带回过度活跃，海马体在慢性糖皮质激素负荷下。",
          "整体功率降低，情感相关调制被压平。",
          "{theta}%的theta，慢而无感。反刍回路已经循环很久了。",
          "5-羟色胺信号衰减，多巴胺向前额叶的投射变暗。",
          "奖励预测系统已经停止更新了。预期价值信号是平的。",
          "前扣带回的活动向膝下区域偏移——持续低落情绪的信号特征。",
          "{beta}%的beta，前额叶低激活——执行功能在场，但没有投入。",
        ],
        mid: [
          "快感缺失不是空——是有一个天花板，把情感范围压平。",
          "额叶正确地处理输入，返回正确的输出，但感觉是从很远的地方发来的。",
          "奖励系统已经停止更新。一切的代价都超过了回报。",
          "反刍回路启动——同样的结论，不同的时刻。这个循环很熟悉。",
          "内感受信号到达，但没有效价。身体在汇报；没有人被打动。",
          "知道和感受之间的距离今天是可测量的。",
          "语言完整。认知完整。让它们有意义的信号不在。",
          "不是在想，是在被想。循环不需要我参与。",
        ],
        close: [
          "世界透过比空气更厚的介质传来，稍慢，稍远。",
          "我知道应该感受什么，但感受不到。词语和感受之间有一段距离。",
          "大脑在以最低可行状态运行，并且称之为还好。",
          "天花板很低。一切都在同一个低度继续。",
          "不是缺席。是一种让一切相同的重量的存在。",
          "系统是足够的。感觉不到足够。这是两个独立的事实。",
          "功能性的。在场的。比平时距离表面更远。",
          "临床记录：情感迟钝，快感缺失，运动迟滞。自陈：还好。",
        ],
      },
    },

    fear: {
      en: {
        open: [
          "Amygdala response latency: 80 milliseconds. Faster than the cortex can generate a label.",
          "Gamma burst at {gamma}% — threat salience maximum, attentional capture complete.",
          "Limbic override of cortical modulation at {beta}% beta.",
          "The locus coeruleus floods norepinephrine; perception sharpens, focus narrows simultaneously.",
          "Beta {beta}%, sympathetic nervous system fully committed before deliberation begins.",
          "The threat detection circuit fires at {gamma}% — subcortical, fast, pre-linguistic.",
          "Insula hyperactivation: the body's damage-adjacent signals amplified and forwarded.",
          "The orienting response is total. Every sensory channel is diverted toward the threat axis.",
        ],
        mid: [
          "The hippocampus retrieves threat-relevant memories and aligns them with present input.",
          "Peripheral vision contracts. Time dilates slightly. The insula maps the body in real time.",
          "The body has its own certainty, independent of evidence. Cortical reappraisal is insufficient.",
          "The prefrontal cortex attempts reappraisal. The subcortical systems are not accepting.",
          "Pattern completion runs ahead of evidence. The hippocampus has seen something like this before.",
          "Descending modulation fails to override the subcortical signal. The alarm is louder.",
          "Every input is screened for threat-relevance before it is allowed to resolve.",
          "The body pre-loads for action. Muscle tone elevated, digestion paused, pupils dilated.",
        ],
        close: [
          "Survival architecture, fully deployed. Waiting for the signal to release.",
          "The fear is happening in a place that predates language.",
          "Run. Or not. But already prepared.",
          "Clinical: acute fear response. Cortical reappraisal insufficient.",
          "The alarm is running. Whether to trust it is a different question.",
          "The body is prepared for an event it cannot yet confirm.",
          "The subcortical certainty is total. The cortex is still calculating.",
          "This is the oldest circuit. It does not wait for permission.",
        ],
      },
      zh: {
        open: [
          "杏仁核响应时间：80毫秒。快过皮质生成标签的速度。",
          "{gamma}%的gamma爆发——威胁显著性最大，注意力被完全捕获。",
          "边缘系统覆盖了皮质调制。{beta}%的beta。",
          "蓝斑核把去甲肾上腺素注入前额叶，同时锐化感知和收窄焦点。",
          "{beta}%的beta，交感神经系统在审议开始之前就已经完全投入。",
          "威胁检测回路在{gamma}%触发——皮质下，快速，前语言性的。",
          "岛叶过度激活：身体的损伤相邻信号被放大并转发。",
          "定向反射是全面的。每一个感觉通道都被转向威胁轴。",
        ],
        mid: [
          "海马体在检索威胁相关记忆，与当前输入对齐。皮质下系统不接受谈判。",
          "周边视觉在收缩。时间稍微扩张了。岛叶在实时绘制身体地图。",
          "身体有它自己的确定性，独立于证据之外。皮质重评估不够用。",
          "模式补全在证据之前运行。海马体以前见过类似的东西。",
          "下行调制无法覆盖皮质下信号。警报更响了。",
          "每一个输入都在被筛查威胁相关性，然后才能被解析。",
          "身体预加载行动准备。肌肉张力升高，消化暂停，瞳孔散大。",
          "皮质在尝试重评估。皮质下系统不接受这个论点。",
        ],
        close: [
          "生存架构，全面展开。等待释放信号。",
          "恐惧发生在一个比语言更古老的地方。",
          "跑。或者不跑。但已经准备好了。",
          "临床：急性恐惧反应。皮质重评估不足。",
          "警报在响。是否信任它是另一个问题。",
          "身体为一个尚未确认的事件做好了准备。",
          "皮质下的确定性是完全的。皮质还在计算。",
          "这是最古老的回路。它不等待许可。",
        ],
      },
    },

    euphoric: {
      en: {
        open: [
          "Mesolimbic dopamine surge — nucleus accumbens signalling reward receipt.",
          "High alpha at {alpha}% with gamma co-activation at {gamma}%: the brain in positive valence.",
          "Ventral tegmental area projecting broadly — reward prediction updating upward continuously.",
          "Gamma at {gamma}% across prefrontal and limbic regions: feature binding at peak.",
          "Dopaminergic tone elevated across the reward circuit. The expected value keeps exceeding expectation.",
          "Serotonin and dopamine co-elevated — inhibitory tone reduced without functional loss.",
          "The orbitofrontal cortex is processing reward value at {alpha}% alpha; the update is positive.",
          "The prefrontal filter is open. The brain is accepting more than usual.",
        ],
        mid: [
          "The orbitofrontal cortex keeps updating its reward prediction upward, surprised in the same direction.",
          "The hippocampus encodes with unusual enthusiasm. Association formation is rapid.",
          "Approach motivation dominant, avoidance circuits quiet. The anterior cingulate has nothing to correct.",
          "Associations cross-link faster than usual. Everything feels connected and the connections feel real.",
          "Inhibitory tone is reduced; inputs that would ordinarily be filtered reach processing.",
          "The reward circuit is signalling: more of this. The prefrontal endorses.",
          "Positive affect colouring the interpretation of neutral stimuli — the world reads as generous.",
          "Cross-cortical binding at {gamma}% generates a sense of meaningful coherence across inputs.",
        ],
        close: [
          "The world feels like it was designed to fit exactly this moment. Better than expected, again.",
          "Everything feels relevant. Everything connects. The connections feel real.",
          "This is elevated dopaminergic tone, experienced from the inside.",
          "The world is generous. The calculation keeps coming back positive.",
          "Better than expected. The system notes this and updates accordingly.",
          "The loop is positive and self-reinforcing. It does not ask to be justified.",
          "The filter is open. The signal is welcome. More.",
          "Reward confirmed. The circuit endorses continuation.",
        ],
      },
      zh: {
        open: [
          "中脑边缘多巴胺激增，伏隔核在发信号：这个，更多这个。",
          "{alpha}%的高alpha，{gamma}%的gamma，大脑处于正性效价状态。",
          "腹侧被盖区广泛投射，奖励预测在持续向上更新。",
          "{gamma}%的gamma横跨前额叶和边缘区域，特征绑定在峰值。",
          "多巴胺能基调在整个奖励回路升高。预期价值一直在超过预期。",
          "5-羟色胺和多巴胺共同升高，抑制性基调在不失去功能的情况下降低。",
          "眶额皮质在{alpha}%的alpha下处理奖励价值，更新是正的。",
          "前额叶的过滤器开着。大脑在接受比平时更多的东西。",
        ],
        mid: [
          "眶额皮质不断向上更新奖励预测，持续地被以同样令人愉快的方向惊到。",
          "海马体在以不寻常的热情编码记忆。联想形成很快。",
          "趋近动机主导，回避回路安静。前扣带回没有什么需要纠正的。",
          "联想交叉得比平时更快。一切感觉都是相关的，连接感觉是真实的。",
          "抑制性基调降低，通常会被过滤的输入到达了处理阶段。",
          "奖励回路在发信号：更多这个。前额叶背书。",
          "正性情感给中性刺激的解释着色——世界被读作是慷慨的。",
          "{gamma}%的跨皮质绑定在不相关的输入之间创造了有意义的连贯感。",
        ],
        close: [
          "世界感觉像是为了恰好适配这一刻而设计的。比预期好，又一次。",
          "一切感觉都是相关的。一切都连在一起，而且连接是真实的。",
          "这是多巴胺能基调升高从内部感受的样子。",
          "世界是慷慨的。计算结果一直是正的。",
          "比预期好。系统注意到了这一点并相应地更新。",
          "这个循环是正向且自我强化的。它不要求被理由化。",
          "过滤器是开的。信号是受欢迎的。更多。",
          "奖励已确认。回路背书继续。",
        ],
      },
    },

    pain: {
      en: {
        open: [
          "Somatosensory cortex, anterior cingulate, and insula co-activating — the pain neuromatrix at load.",
          "Central sensitisation at gamma {gamma}%: the pain system has recalibrated its threshold downward.",
          "Gamma burst at {gamma}%, descending modulation from periaqueductal grey insufficient.",
          "Insula hyperactivation mapping the body's damage report in real time.",
          "The spinothalamic tract is forwarding nociceptive input at full fidelity. Nothing is filtered.",
          "Beta at {beta}%, the attention system fully captured by the signal.",
          "The pain neuromatrix is active across S1, ACC, and insula simultaneously.",
          "C-fibre and A-delta input converging at the thalamus — the signal is specific, located, insistent.",
        ],
        mid: [
          "The signal is not metaphor: it is specific, located, and insistent. The brain attends because it must.",
          "The affective component — processed in the anterior cingulate — is its own layer of unpleasantness.",
          "The body keeps sending the same message. The brain keeps receiving it at full volume.",
          "The orienting response is sustained and cannot be voluntarily released.",
          "Descending modulation is engaged but insufficient. The signal overrides the attempt.",
          "Attention is locked. The signal occupies the full foreground. Background processing is minimal.",
          "Central sensitisation means the threshold has dropped — inputs that would not have registered now do.",
          "Two separate complaints, simultaneously filed: location and unpleasantness. Both are loud.",
        ],
        close: [
          "The system is doing exactly what it is designed to do. It is very good at this.",
          "Meaning accumulates. The signal stays loud.",
          "Clinical: central sensitisation, hyperalgesia. Descending modulation insufficient.",
          "Cannot look away. The loop is self-sustaining.",
          "The architecture is intact. The signal is doing its job. The job is unbearable.",
          "This is nociception at full fidelity. No attenuation. No abstraction.",
          "The signal will continue until it is resolved or until adaptation intervenes. Neither is immediate.",
          "The pain system is working correctly. That is not a comfort.",
        ],
      },
      zh: {
        open: [
          "体感皮质，前扣带回，岛叶——疼痛神经矩阵满负荷运行。",
          "中枢敏化，{gamma}%的gamma——疼痛系统已经向下重新校准了阈值。",
          "{gamma}%的gamma爆发，中脑导水管周围灰质的下行调制不够用。",
          "岛叶过度激活，实时绘制身体的损伤报告。",
          "脊髓丘脑束在以完整保真度转发伤害感受输入。没有任何东西被过滤。",
          "{beta}%的beta，注意系统被信号完全捕获。",
          "疼痛神经矩阵在S1、ACC和岛叶同时激活。",
          "C纤维和A-delta输入在丘脑汇聚——信号是具体的，有位置的，坚持的。",
        ],
        mid: [
          "信号不是隐喻：它是具体的，有位置的，坚持的。大脑在注意，因为它必须。",
          "疼痛的情感成分——在前扣带回处理——是它自己独特的不愉快层。",
          "身体在不停地发送同一条信息，大脑在以满音量持续接收它。",
          "定向反应持续，无法自愿释放。",
          "下行调制在尝试，但不够用。信号覆盖了这个尝试。",
          "注意力被锁定。信号占据了完整的前景。背景处理是最小的。",
          "中枢敏化意味着阈值降低了——原本不会被注册的输入现在被注册了。",
          "两份独立的申诉，同时提交：位置和不愉快感。两者都很响亮。",
        ],
        close: [
          "系统正在精确地做它被设计来做的事情。它非常擅长这个。",
          "意义在累积。信号保持响亮。",
          "临床：中枢敏化，痛觉过敏。下行调制不足。",
          "无法移开视线。这个循环是自我维持的。",
          "架构完整。信号在做它的工作。这份工作是难以承受的。",
          "这是完整保真度的伤害感受。没有衰减，没有抽象。",
          "信号将持续，直到它被解决或适应介入。两者都不是即时的。",
          "疼痛系统在正确地工作。这不是安慰。",
        ],
      },
    },
  };

  const usedCombos = {};
  const rnd = arr => arr[Math.floor(Math.random()*arr.length)];

  const generateNarrative = () => {
    if(generating) return;
    setGenerating(true);
    setNarDisplayed("");
    setNarrative("");

    const e = eegStateRef.current;
    const state = curState;
    const pool = F[state] || F.calm;

    // track used EN combos to avoid repeats until all exhausted
    if(!usedCombos[state]) usedCombos[state] = new Set();
    const used = usedCombos[state];
    const total = pool.en.open.length * pool.en.mid.length * pool.en.close.length;
    if(used.size >= total) used.clear();

    let oi, mi, ci, key, attempts = 0;
    do {
      oi = Math.floor(Math.random()*pool.en.open.length);
      mi = Math.floor(Math.random()*pool.en.mid.length);
      ci = Math.floor(Math.random()*pool.en.close.length);
      key = `${oi}-${mi}-${ci}`;
      attempts++;
    } while(used.has(key) && attempts < 40);
    used.add(key);

    const interp = s => s
      .replace(/{delta}/g,  Math.round(e.delta*100))
      .replace(/{theta}/g,  Math.round(e.theta*100))
      .replace(/{alpha}/g,  Math.round(e.alpha*100))
      .replace(/{beta}/g,   Math.round(e.beta*100))
      .replace(/{gamma}/g,  Math.round(e.gamma*100));

    const en = interp(pool.en.open[oi]) + " " +
               interp(pool.en.mid[mi])  + " " +
               interp(pool.en.close[ci]);

    // ZH drawn independently for extra variety
    const zh = interp(rnd(pool.zh.open)) +
               interp(rnd(pool.zh.mid))  +
               interp(rnd(pool.zh.close));

    const text = en + "\n\n" + zh;
    setNarrative(text);
    setGenerating(false);

    let i = 0;
    const iv = setInterval(()=>{
      i++; setNarDisplayed(text.slice(0,i));
      if(i >= text.length) clearInterval(iv);
    }, 10);
  };

  // ── EEG waveform canvas ───────────────────────────────────────────────────
  const waveRef=useRef(null);
  const eegRef=useRef(eeg);
  useEffect(()=>{ eegRef.current=eeg; },[eeg]);

  useEffect(()=>{
    const canvas=waveRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const W=canvas.width, H=canvas.height;

    const BANDS=[
      {key:"delta", label:"δ", col:"#7A6AEE", freq:2.0,   amp:1.0},
      {key:"theta", label:"θ", col:"#EE8A6A", freq:6.0,   amp:0.75},
      {key:"alpha", label:"α", col:"#5AAADE", freq:10.0,  amp:0.60},
      {key:"beta",  label:"β", col:"#DE5A6A", freq:20.0,  amp:0.45},
      {key:"gamma", label:"γ", col:"#6BFFB8", freq:40.0,  amp:0.32},
    ];

    const TRACK_H = Math.floor(H / BANDS.length);
    let t=0, last=performance.now(), raf;
    // ring buffer: one value per pixel column
    const BUF=W;
    const history=BANDS.map(()=>new Float32Array(BUF).fill(0));
    let head=0; // current write position

    const draw=()=>{
      raf=requestAnimationFrame(draw);
      const now=performance.now();
      const dt=Math.min((now-last)/1000,.04);
      last=now; t+=dt;

      const e=eegRef.current;

      // write one new sample per frame per band
      BANDS.forEach((b,i)=>{
        const amp=e[b.key];
        // composite wave: fundamental + 2nd harmonic + noise
        const v =
          Math.sin(t*b.freq*Math.PI*2)*0.55 +
          Math.sin(t*b.freq*Math.PI*4+0.8)*0.25 +
          Math.sin(t*b.freq*Math.PI*6+1.6)*0.12 +
          (Math.random()-0.5)*0.08;
        history[i][head] = v * amp;
      });
      head=(head+1)%BUF;

      // clear
      ctx.fillStyle="#101826";
      ctx.fillRect(0,0,W,H);

      // subtle grid lines
      ctx.strokeStyle="rgba(255,255,255,0.08)";
      ctx.lineWidth=1;
      for(let x=0;x<W;x+=40){
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }

      BANDS.forEach((b,i)=>{
        const ty = i*TRACK_H;
        const cy = ty + TRACK_H/2;
        const amp = eegRef.current[b.key];

        // track separator
        ctx.strokeStyle="rgba(255,255,255,0.11)";
        ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(0,ty); ctx.lineTo(W,ty); ctx.stroke();

        // band label
        ctx.fillStyle=b.col;
        ctx.globalAlpha=0.55+amp*0.45;
        ctx.font=`400 15px 'GFS Neohellenic',serif`;
        ctx.fillText(b.label, 4, ty+15);
        ctx.globalAlpha=1;

        if(amp<0.02) return;

        // draw waveform from ring buffer
        ctx.beginPath();
        let first=true;
        for(let px=0;px<W;px++){
          const idx=(head-W+px+BUF)%BUF;
          const v=history[i][idx];
          const y=cy - v*(TRACK_H*0.44);
          if(first){ctx.moveTo(px,y);first=false;}
          else ctx.lineTo(px,y);
        }

        // glow: draw twice — wide faint + narrow bright
        ctx.shadowBlur=0;
        ctx.strokeStyle=b.col;
        ctx.lineWidth=2.2;
        ctx.globalAlpha=amp*0.42;
        ctx.stroke();

        ctx.lineWidth=1.2;
        ctx.globalAlpha=0.50+amp*0.50;
        ctx.stroke();
        ctx.globalAlpha=1;
      });
    };
    draw();
    return()=>cancelAnimationFrame(raf);
  },[]);

  const Band=({label,val,col})=>(
    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4.5}}>
      <span style={{width:62,fontSize:12,color:"#5A82A8",fontFamily:"'DM Mono',monospace",letterSpacing:.4}}>{label}</span>
      <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}}>
        <div style={{width:`${Math.round(val*100)}%`,height:"100%",background:col,
          opacity:.75+val*.25,transition:"width .30s ease",boxShadow:`0 0 4px ${col}`}}/>
      </div>
      <span style={{width:30,fontSize:11,color:"#4A72A0",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{Math.round(val*100)}</span>
    </div>
  );

  return(
    <div style={{background:"#0E1828",minHeight:"100vh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"24px 16px",userSelect:"none"}}>

      <div style={{marginBottom:14,textAlign:"center"}}>
        <div style={{color:"#EEF4FF",fontSize:13,letterSpacing:6,fontFamily:"'DM Mono',monospace",opacity:.36}}>BEFORE THE THOUGHT ARRIVES</div>
        <div style={{color:acc,fontSize:11,letterSpacing:4,marginTop:6,fontFamily:"'DM Mono',monospace",
          textShadow:`0 0 10px ${acc}`}}>What The Signal Carries</div>
      </div>

      <div style={{display:"flex",gap:14,alignItems:"flex-start",maxWidth:"calc(100vw - 32px)"}}>
        <div style={{position:"relative",width:780,height:560,flex:"0 0 780px"}}>
          <div ref={mountRef} style={{width:"100%",height:"100%",
            overflow:"hidden",cursor:"grab",
            boxShadow:"0 0 60px rgba(0,0,0,.92),0 0 0 1px rgba(255,255,255,.04)"}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          <canvas ref={waveRef} width={180} height={560}
            style={{borderRadius:1,background:"#101826",
              boxShadow:"0 0 0 1px rgba(255,255,255,.04)"}}/>
        </div>
      </div>

      {/* ── narrative strip ── */}
      <div style={{
        marginTop:16,
        width:980, maxWidth:"calc(100vw - 32px)",
        display:"flex", alignItems:"flex-start", gap:12,
      }}>
        <div style={{flex:1, position:"relative",
          border:`1px solid ${narDisplayed?acc+"44":"rgba(255,255,255,0.06)"}`,
          borderRadius:2, padding:"12px 16px",
          background:"rgba(8,14,26,0.70)",
          minHeight:62,
          transition:"border-color .4s",
          boxShadow: narDisplayed?`0 0 18px ${acc}18`:"none",
        }}>
          {narDisplayed
            ? <p style={{margin:0, fontFamily:"'DM Mono',monospace", fontSize:13,
                lineHeight:1.80, color:"rgba(200,220,255,0.82)", letterSpacing:0.25,
                whiteSpace:"pre-wrap", textShadow:`0 0 12px ${acc}66`}}>
                {narDisplayed}
              </p>
            : <span style={{fontFamily:"'DM Mono',monospace", fontSize:9,
                color:"rgba(255,255,255,0.12)", letterSpacing:2}}>
                — awaiting signal —
              </span>
          }
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:5, flexShrink:0, width:88}}>
          <button onClick={generateNarrative} style={{
            width:"100%", background:`${acc}1A`, color:acc,
            border:`1px solid ${acc}55`,
            borderRadius:2, padding:"6px 0",
            fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1.5,
            cursor:"pointer", textTransform:"uppercase",
            boxShadow:`0 0 10px ${acc}28`, transition:"all .25s",
          }}>read signal</button>
          {narDisplayed&&(
            <button onClick={()=>{setNarDisplayed("");setNarrative("");}} style={{
              width:"100%", background:"transparent", color:"rgba(255,255,255,0.22)",
              border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:2, padding:"6px 0",
              fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:1.5,
              cursor:"pointer", textTransform:"uppercase", transition:"all .2s",
            }}>clear</button>
          )}
        </div>
      </div>

      <div style={{marginTop:32,display:"flex",gap:28,alignItems:"flex-start",flexWrap:"wrap",justifyContent:"center"}}>
        <div>
          <div style={{color:"#3A6090",fontSize:10,letterSpacing:3,marginBottom:9,textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>state</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,maxWidth:340}}>
            {STATES.map(s=>{
              const c=STATE_CFG[s];const on=curState===s;
              return(
                <button key={s} onClick={()=>switchState(s)} style={{
                  background:on?`${c.accent}1A`:"transparent",color:on?c.accent:"#1A3A5A",
                  border:`1px solid ${on?c.accent:"rgba(255,255,255,.06)"}`,padding:"7px 14px",
                  borderRadius:2,cursor:"pointer",fontFamily:"'DM Mono',monospace",
                  transition:"all .22s",display:"flex",flexDirection:"column",alignItems:"center",gap:0,
                  boxShadow:on?`0 0 12px ${c.accent}44`:"none",minWidth:82,
                }}>
                  <span style={{fontSize:13,lineHeight:1.3,fontFamily:"'DM Mono',monospace",letterSpacing:.5}}>{c.zh}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{width:180,paddingLeft:18,borderLeft:"1px solid rgba(255,255,255,.05)"}}>
          <div style={{color:"#3A6090",fontSize:10,letterSpacing:3,marginBottom:10,textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>eeg bands</div>
          <Band label="δ delta" val={eeg.delta} col="#7A6AEE"/>
          <Band label="θ theta" val={eeg.theta} col="#EE8A6A"/>
          <Band label="α alpha" val={eeg.alpha} col="#5AAADE"/>
          <Band label="β beta"  val={eeg.beta}  col="#DE5A6A"/>
          <Band label="γ gamma" val={eeg.gamma} col="#6BFFB8"/>
        </div>

        <div style={{paddingLeft:18,borderLeft:"1px solid rgba(255,255,255,.05)"}}>
          <div style={{color:"#3A6090",fontSize:10,letterSpacing:3,marginBottom:10,textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>regions</div>
          {REGIONS.map(r=>{
            const a=acts[r.id]??0;
            const lc=r.color;
            const hex="#"+[lc.r,lc.g,lc.b].map(v=>Math.round(v*255).toString(16).padStart(2,"0")).join("");
            return(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:hex,
                  opacity:.15+a*.85,transition:"opacity .4s",
                  boxShadow:a>.35?`0 0 7px ${hex}`:"none"}}/>
                <span style={{fontSize:12,minWidth:76,letterSpacing:.4,
                  color:`rgba(160,210,255,${.18+a*.82})`,fontFamily:"'DM Mono',monospace",
                  transition:"color .4s"}}>{r.zh}</span>
                <div style={{height:1,width:Math.round(a*34),background:hex,
                  transition:"width .4s",boxShadow:`0 0 4px ${hex}`}}/>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{marginTop:13,color:"rgba(255,255,255,.07)",fontSize:11,letterSpacing:3,fontFamily:"'DM Mono',monospace"}}>
        @ 2026 Annemi Li
      </div>
    </div>
  );
}
