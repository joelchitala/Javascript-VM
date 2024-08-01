let ab = new ArrayBuffer(8);
let dv = new DataView(ab);

dv.setUint16(2, 255);
dv.setUint16(4, 2048);
console.log(dv);

console.log(dv.getUint16(2));
console.log(dv.getUint16(4));