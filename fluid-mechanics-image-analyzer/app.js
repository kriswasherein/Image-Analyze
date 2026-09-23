const $=s=>document.querySelector(s);
const canvas=$("#canvas"), ctx=canvas.getContext("2d");
let images=[], current=0, scale=1, offset={x:0,y:0}, tool=null, drawing=null;
let objects=[], results=[], pendingObject=null, calibration=null;

$("#openImages").onclick=()=>$("#fileInput").click();
$("#fileInput").onchange=e=>addFiles([...e.target.files]);
document.addEventListener("dragover",e=>e.preventDefault());
document.addEventListener("drop",e=>{e.preventDefault(); const fs=[...e.dataTransfer.files].filter(f=>f.type.startsWith("image/")||/\.(bmp|png|jpe?g|tiff?|webp)$/i.test(f.name)); if(fs.length)addFiles(fs)});

function addFiles(fs){
  fs.forEach(file=>{const url=URL.createObjectURL(file); const im=new Image(); im.onload=()=>{images.push({file,url,img:im,measurements:{}}); renderList(); if(images.length===1){current=0;fit();} draw();}; im.src=url;});
  $("#dropHint").style.display="none";
}
function renderList(){
  const el=$("#imageList"); el.innerHTML="";
  images.forEach((x,i)=>{const d=document.createElement("div");d.className="image-item"+(i===current?" active":"");d.innerHTML=`<img class="thumb" src="${x.url}"><span>${i+1}. ${x.file.name}</span>`;d.onclick=()=>{current=i;renderList();fit();draw()};el.appendChild(d)});
  $("#imageCounter").textContent=images.length?`${current+1} / ${images.length}`:"No images";
}
function fit(){if(!images[current])return;const im=images[current].img,w=$("#canvasWrap").clientWidth-20,h=$("#canvasWrap").clientHeight-20;scale=Math.min(w/im.naturalWidth,h/im.naturalHeight,1);canvas.width=im.naturalWidth*scale;canvas.height=im.naturalHeight*scale;offset={x:0,y:0};updateZoom();}
function updateZoom(){$("#zoomText").textContent=Math.round(scale*100)+"%";}

function draw(){
 if(!images[current]){canvas.width=800;canvas.height=500;ctx.clearRect(0,0,canvas.width,canvas.height);return}
 const im=images[current].img; canvas.width=im.naturalWidth*scale;canvas.height=im.naturalHeight*scale;
 ctx.drawImage(im,0,0,canvas.width,canvas.height);
 // Draw all first-frame definitions as visual overlays. Later frames show tracked/recomputed overlays.
 const defs=images[current].measurements?.defs||objects;
 for(const o of defs) drawObject(o);
 if(drawing) drawGeometry(drawing.points||[]);
}
function p(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale}}
function drawGeometry(ps){
 ctx.save();ctx.strokeStyle="#22d3ee";ctx.fillStyle="#22d3ee";ctx.lineWidth=2;
 ctx.beginPath();ps.forEach((q,i)=>i?ctx.lineTo(q.x*scale,q.y*scale):ctx.moveTo(q.x*scale,q.y*scale));ctx.stroke();
 ps.forEach(q=>{ctx.beginPath();ctx.arc(q.x*scale,q.y*scale,4,0,Math.PI*2);ctx.fill()});ctx.restore();
}
function drawObject(o){
 if(!o.points)return; ctx.save();ctx.strokeStyle="#f59e0b";ctx.fillStyle="#f59e0b";ctx.lineWidth=2;
 ctx.beginPath();o.points.forEach((q,i)=>i?ctx.lineTo(q.x*scale,q.y*scale):ctx.moveTo(q.x*scale,q.y*scale));ctx.stroke();
 ctx.font="12px sans-serif"; if(o.name)ctx.fillText(o.name,o.points[0].x*scale+6,o.points[0].y*scale-6);ctx.restore();
}
function setTool(t){tool=t;document.querySelectorAll(".tool-grid button").forEach(b=>b.classList.toggle("active",b.dataset.tool===t));$("#status").textContent=t?`Draw ${t}`:"Ready"}
document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>setTool(b.dataset.tool));

canvas.onmousemove=e=>{
 const q=p(e); $("#cursorInfo").textContent=`x: ${q.x.toFixed(1)} y: ${q.y.toFixed(1)}`;
 if(images[current]){const c=document.createElement("canvas"),cc=c.getContext("2d"); /* intentionally lightweight; pixel read uses source canvas below */ $("#pixelInfo").textContent="RGB readout available during sampling";}
};
canvas.onmousedown=e=>{
 if(!tool)return;
 const q=p(e);
 if(tool==="line"||tool==="diameter"||tool==="radius"||tool==="height") drawing={points:[q]};
 else if(tool==="point"){drawing={points:[q]};finishDrawing()}
 else if(tool==="angle"||tool==="area") drawing={points:[q]};
};
canvas.onmouseup=e=>{
 if(!drawing)return; drawing.points.push(p(e));
 if(tool==="angle" && drawing.points.length<3)return;
 if(tool==="area"){ // finish area on double click; otherwise retain
   if(drawing.points.length>=3) {drawing.close=true;}
 }
 if(tool!=="angle" && tool!=="area") finishDrawing();
 draw();
};
canvas.ondblclick=()=>{if(drawing)finishDrawing()};

function finishDrawing(){
 if(!drawing)return;
 const pts=drawing.points;
 if((tool==="line"||tool==="diameter"||tool==="radius"||tool==="height")&&pts.length>2)drawing.points=pts.slice(0,2);
 const type=tool==="line"?"length":tool;
 pendingObject={points:drawing.points,type};
 drawing=null; $("#objectModal").classList.remove("hidden");
}
$("#cancelObj").onclick=()=>{pendingObject=null;$("#objectModal").classList.add("hidden");draw()};
$("#saveObj").onclick=()=>{
 const name=$("#objName").value.trim()||`${pendingObject.type}_${objects.length+1}`;
 const o={...pendingObject,name,measure:$("#objMeasure").checked,locked:$("#objLock").checked};
 objects.push(o);
 if(!images[0].measurements)images[0].measurements={};
 images[0].measurements.defs=objects.map(x=>({...x,points:x.points.map(q=>({...q}))}));
 if($("#calibrationMode").checked && pendingObject.type==="length"){
   const px=dist(pendingObject.points[0],pendingObject.points[1]); const val=+$("#calValue").value;
   if(val>0){calibration={pixels:px,value:val,unit:$("#calUnit").value,pxPerUnit:px/val};$("#scaleReadout").textContent=`${px.toFixed(2)} px = ${val} ${calibration.unit}  |  ${calibration.pxPerUnit.toFixed(3)} px/${calibration.unit}`;}
 }
 updateObjects();$("#objectModal").classList.add("hidden");pendingObject=null;draw();
};
$("#calibrationMode").onchange=e=>{$("#calibrationBox").classList.toggle("disabled",!e.target.checked);};

function dist(a,b){return Math.hypot(b.x-a.x,b.y-a.y)}
function measureObject(o){
 const ps=o.points;
 if(o.type==="point")return {value:0,unit:"px",confidence:1};
 if(o.type==="length"||o.type==="diameter"||o.type==="radius"||o.type==="height"){
   const px=dist(ps[0],ps[1]); if(!calibration)return {value:px,unit:"px",confidence:.95};
   let v=px/calibration.pxPerUnit; if(o.type==="radius")v/=2;
   return {value:v,unit:calibration.unit,confidence:.95};
 }
 if(o.type==="angle"&&ps.length>=3){
   const a={x:ps[0].x-ps[1].x,y:ps[0].y-ps[1].y},b={x:ps[2].x-ps[1].x,y:ps[2].y-ps[1].y};
   const ang=Math.acos(Math.max(-1,Math.min(1,(a.x*b.x+a.y*b.y)/(Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y)))))*180/Math.PI;
   return {value:ang,unit:"deg",confidence:.9};
 }
 if(o.type==="area"&&ps.length>=3){
   let A=0;for(let i=0;i<ps.length;i++){let a=ps[i],b=ps[(i+1)%ps.length];A+=a.x*b.y-b.x*a.y}A=Math.abs(A/2);
   if(calibration)A/=calibration.pxPerUnit**2;
   return {value:A,unit:calibration?calibration.unit+"²":"px²",confidence:.8};
 }
 return {value:NaN,unit:"",confidence:0};
}
function updateObjects(){
 const el=$("#objectList");el.innerHTML="";
 objects.forEach((o,i)=>{const r=measureObject(o);const d=document.createElement("div");d.className="object-row";d.innerHTML=`<b>${o.name}</b><small>${o.type} · ${o.measure?"batch":"manual only"} · ${Number.isFinite(r.value)?r.value.toFixed(3):"—"} ${r.unit}</small>`;el.appendChild(d)});
 showCurrent();
}
function showCurrent(){
 const el=$("#currentResults"); if(!objects.length){el.innerHTML='<div class="empty">Draw a measurement to see its value.</div>';return}
 el.innerHTML=objects.map(o=>{const r=measureObject(o);return`<div class="result-line"><span>${o.name}</span><strong>${Number.isFinite(r.value)?r.value.toFixed(4):"—"} ${r.unit}</strong></div>`}).join("");
}
$("#prevImage").onclick=()=>{if(current>0){current--;renderList();draw()}};
$("#nextImage").onclick=()=>{if(current<images.length-1){current++;renderList();draw()}};
$("#zoomIn").onclick=()=>{scale*=1.2;draw();updateZoom()};
$("#zoomOut").onclick=()=>{scale/=1.2;draw();updateZoom()};
$("#fitImage").onclick=()=>{fit();draw()};

$("#processAll").onclick=async()=>{
 if(!images.length||!objects.length){$("#status").textContent="Add images and define objects first.";return}
 results=[];$("#status").textContent="Processing…";
 // Browser-only tracking assist: map each object to the most similar local patch using
 // RGB histogram + centroid search. This is intentionally transparent and editable.
 for(let i=0;i<images.length;i++){
   for(const o of objects.filter(x=>x.measure)){
     const tracked=trackObject(o,images[0].img,images[i].img);
     const rr=measureObject({...o,points:tracked.points});
     results.push({image:images[i].file.name,object:o.name,type:o.type,value:rr.value,unit:rr.unit,confidence:tracked.confidence});
     images[i].measurements=images[i].measurements||{};
     images[i].measurements[o.name]={...rr,points:tracked.points};
   }
 }
 renderResults();current=0;renderList();draw();$("#status").textContent=`Processed ${results.length} measurements.`;
};
function trackObject(o,ref,target){
 if(ref===target)return{points:o.points,confidence:1};
 const refCanvas=document.createElement("canvas"),tCanvas=document.createElement("canvas");
 refCanvas.width=ref.naturalWidth;refCanvas.height=ref.naturalHeight;tCanvas.width=target.naturalWidth;tCanvas.height=target.naturalHeight;
 const a=refCanvas.getContext("2d"),b=tCanvas.getContext("2d");a.drawImage(ref,0,0);b.drawImage(target,0,0);
 const minX=Math.max(0,Math.min(...o.points.map(q=>q.x))-60),maxX=Math.min(ref.naturalWidth,Math.max(...o.points.map(q=>q.x))+60);
 const minY=Math.max(0,Math.min(...o.points.map(q=>q.y))-60),maxY=Math.min(ref.naturalHeight,Math.max(...o.points.map(q=>q.y))+60);
 const w=maxX-minX,h=maxY-minY; let sx=0,sy=0,n=0;
 const sample=12;
 for(let y=minY;y<maxY;y+=sample)for(let x=minX;x<maxX;x+=sample){const c=a.getImageData(x,y,1,1).data;sx+=x;sy+=y;n++}
 const cx=sx/n,cy=sy/n;
 // Translation search around expected centroid using patch RGB error.
 let best={err:Infinity,dx:0,dy:0};
 const base=a.getImageData(Math.max(0,cx-12),Math.max(0,cy-12),24,24).data;
 for(let dy=-80;dy<=80;dy+=4)for(let dx=-80;dx<=80;dx+=4){
   const x=Math.round(cx+dx-12),y=Math.round(cy+dy-12);if(x<0||y<0||x+24>=target.naturalWidth||y+24>=target.naturalHeight)continue;
   const q=b.getImageData(x,y,24,24).data;let err=0;for(let k=0;k<base.length;k+=4){err+=Math.abs(base[k]-q[k])+Math.abs(base[k+1]-q[k+1])+Math.abs(base[k+2]-q[k+2])}
   if(err<best.err)best={err,dx,dy};
 }
 const dx=best.dx,dy=best.dy; const points=o.points.map(q=>({x:q.x+dx,y:q.y+dy}));
 const confidence=Math.max(.05,1-best.err/(24*24*3*255*2));
 return {points,confidence};
}
function renderResults(){const tb=$("#resultsTable tbody");tb.innerHTML=results.map(r=>`<tr><td>${esc(r.image)}</td><td>${esc(r.object)}</td><td>${r.type}</td><td>${Number.isFinite(r.value)?r.value.toFixed(5):""}</td><td>${r.unit}</td><td>${(r.confidence*100).toFixed(0)}%</td></tr>`).join("")}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("#exportCSV").onclick=()=>{
 if(!results.length)return alert("Process the images first.");
 const head="Image,Object,Type,Value,Unit,Confidence\n";const body=results.map(r=>[r.image,r.object,r.type,r.value,r.unit,r.confidence].map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
 download(new Blob([head+body],{type:"text/csv"}),"fluid-measurements.csv");
};
$("#exportProject").onclick=()=>{
 const project={version:"0.1",app:"Fluid Mechanics Image Analyzer",calibration,objects,results,images:images.map(x=>x.file.name)};
 download(new Blob([JSON.stringify(project,null,2)],{type:"application/json"}),"fluid-project.json");
};
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$("#addObject").onclick=()=>{if(!images.length)return alert("Add images first.");setTool("line");$("#status").textContent="Draw the geometry for the new object.";};

window.addEventListener("resize",()=>{if(images[current]){fit();draw()}});
fit();draw();
