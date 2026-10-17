// Test doubles: in-memory KV, fake static assets, and a fake Access check. Test-only; never part of the deploy copy.
export function fakeKV(){const m=new Map();return {m,
 async get(k,o){const v=m.get(k);if(!v)return null;const t=(o&&o.type)||(typeof o==='string'?o:'text');return t==='arrayBuffer'?(v.v instanceof Uint8Array?v.v.buffer.slice(0):new TextEncoder().encode(v.v).buffer):(v.v instanceof Uint8Array?new TextDecoder().decode(v.v):v.v);},
 async getWithMetadata(k,o){const v=m.get(k);if(!v)return {value:null,metadata:null};return {value:v.v instanceof Uint8Array?v.v.buffer.slice(0):v.v,metadata:v.meta||null};},
 async put(k,v,o){if(typeof v!=='string'&&!(v instanceof Uint8Array))v=new Uint8Array(v);m.set(k,{v,meta:o&&o.metadata});},
 async delete(k){m.delete(k);},
 async list(o){const keys=[...m.keys()].filter(k=>k.startsWith((o&&o.prefix)||'')).map(name=>({name}));return {keys,list_complete:true};}};}
export function fakeAssets(files){return {async fetch(req){const p=new URL(req.url).pathname;const f=files[p];return f==null?new Response('index fallback',{status:200,headers:{'x-static':'fallback'}}):new Response(f,{status:200,headers:{'x-static':'1','Content-Type':p.endsWith('.json')?'application/json':'text/html'}});}};}
