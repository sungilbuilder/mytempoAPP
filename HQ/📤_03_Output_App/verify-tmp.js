// zustand persist가 partialize:undefined를 어떻게 다루는지 실제로 확인
const { createStore } = require('zustand/vanilla');
const { persist } = require('zustand/middleware');

const mem = {};
const storage = {
  getItem: (k) => mem[k] ?? null,
  setItem: (k, v) => { mem[k] = v; },
  removeItem: (k) => { delete mem[k]; },
};

function build(label, opts) {
  try {
    const s = createStore(persist((set) => ({
      a: 1, setA: (a) => set({ a }),
    }), { name: label, storage: { getItem:async k=>mem[k]?JSON.parse(mem[k]):null,
      setItem:async (k,v)=>{mem[k]=JSON.stringify(v)}, removeItem:async k=>{delete mem[k]} }, ...opts }));
    s.getState().setA(2);
    return 'OK';
  } catch (e) { return 'CRASH: ' + e.message; }
}

console.log('① partialize 키를 아예 안 넣음      →', build('t1', {}));
console.log('② partialize: undefined 명시적 전달  →', build('t2', { partialize: undefined }));
console.log('③ partialize 함수 전달               →', build('t3', { partialize: (s) => ({ a: s.a }) }));
