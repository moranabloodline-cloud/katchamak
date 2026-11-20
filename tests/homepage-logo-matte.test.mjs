import assert from 'node:assert/strict';
import {removeGraphicMatte} from '../public/image-tools/logo-matte.js';

const width=600,height=60;
const offset=(x,y)=>4*(y*width+x);
const alpha=(data,x,y)=>data[offset(x,y)+3];

function wordmark(matte,ink){
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const stroke=y>15 && (x%90<12 || x>=width-10 || (y>20 && y<27 && x%90<53));
    const subtitle=y<5 && x>=198 && x<=388 && x%11<4;
    data.set([...(stroke||subtitle?ink:matte),255],offset(x,y));
  }
  return data;
}

for(const [matte,ink] of [[[22,22,22],[230,230,230]],[[242,243,240],[30,31,34]]]){
  const data=wordmark(matte,ink),original=data.slice();
  const edge=offset(15,40);
  for(let c=0;c<3;c++)data[edge+c]=Math.round((ink[c]+matte[c])/2);
  assert.equal(removeGraphicMatte(data,width,height),'removed');
  assert.ok(Math.abs(data[edge+3]-128)<3,'Antialiased pixels retain their coverage');
  for(let i=0;i<data.length;i+=4){
    if(i===edge)continue;
    assert.equal(data[i+3],original[i]===ink[0]?255:0,'Keep every disconnected stroke and clear every gap');
  }
}

const clear=wordmark([0,0,0],[255,255,255]);
for(let i=0;i<clear.length;i+=4)if(clear[i]===0)clear[i+3]=0;
clear[offset(8,41)+3]=97;
const saved=clear.slice();
assert.equal(removeGraphicMatte(clear,width,height),'transparent');
assert.deepEqual(clear,saved,'Preserve existing alpha and RGB exactly');

const photo=new Uint8ClampedArray(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++)photo.set([x%256,y*4,(x+y)%256,255],offset(x,y));
const untouched=photo.slice();
assert.equal(removeGraphicMatte(photo,width,height),'photo');
assert.equal(removeGraphicMatte(photo,width,height,true),'photo');
assert.deepEqual(photo,untouched,'An uncertain matte must leave the input available to the photo model');
console.log('Tightly cropped wordmark, subtitle, inverse colours, antialiasing, existing alpha and photo routing passed.');
