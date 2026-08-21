import fs from 'fs';
const mk=()=>({innerHTML:'',textContent:'',value:'',checked:false,style:{},dataset:{},options:[],files:[],
  selectedOptions:[{textContent:''}],classList:{add(){},remove(){},toggle(){},contains:()=>false},
  querySelectorAll:()=>[],querySelector:()=>null,appendChild(){},remove(){},focus(){},
  getBoundingClientRect:()=>({left:0,top:0,right:0,bottom:0,width:0,height:0}),
  addEventListener(){},getContext:()=>({clearRect(){},drawImage(){},fillRect(){},putImageData(){},
    getImageData:(a,b,w=1,h=1)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),createImageData:(w=1,h=1)=>({data:new Uint8ClampedArray((w.width||w)*(h||1)*4),width:w.width||w,height:h||1}),save(){},restore(){},translate(){},scale(){},beginPath(){},arc(){},fill(){},stroke(){},closePath(){},moveTo(){},lineTo(){}}),toBlob(){},toDataURL:()=>'data:,'});
export const ids=new Map();
// **HTML に無い id は null を返す。** 何でも作って返すと、
// 消したボタンのハンドラが残っていても素通りする(実際に踏んだ)。
// ブラウザでは null.onclick で全体が止まる
const HAVE = new Set([...fs.readFileSync('index.html','utf8').matchAll(/id="([A-Za-z0-9_]+)"/g)].map(m=>m[1]));
globalThis.__knownIds = HAVE;
globalThis.document={getElementById:i=>{
    if(!HAVE.has(i)) return null;
    if(!ids.has(i))ids.set(i,mk());return ids.get(i);},
  createElement:()=>mk(),querySelectorAll:()=>[],body:{appendChild(){}},addEventListener(){}};
globalThis.window=globalThis; globalThis.open=()=>{}; globalThis.devicePixelRatio=1;
globalThis.addEventListener=()=>{};
globalThis.location={hash:'',search:'',origin:'',pathname:'/'};
globalThis.requestAnimationFrame=cb=>{cb();return 1;};
globalThis.performance={now:()=>0};
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async()=>{}}},configurable:true});
// **中身のある localStorage。** 空返しにすると、保存の検査が素通りする
const _ls={};
globalThis.localStorage={getItem:k=>(k in _ls?_ls[k]:null),setItem:(k,v)=>{_ls[k]=String(v)},
  removeItem:k=>{delete _ls[k]},clear:()=>{for(const k in _ls)delete _ls[k]}};
globalThis.fetch=async u=>{const p=String(u).replace(/^\.\//,'').replace(/\?.*$/,'');
  if(!fs.existsSync(p)) throw new Error('404 '+p);
  return {json:async()=>JSON.parse(fs.readFileSync(p,'utf8')),blob:async()=>null,ok:true};};
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
globalThis.OffscreenCanvas=class{constructor(w,h){const o=mk();o.width=w;o.height=h;return o;}};

globalThis.Event=class{constructor(t){this.type=t;}};
