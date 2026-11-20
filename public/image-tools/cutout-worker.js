/* Homepage images are processed inside this worker. Only the engine and model are fetched.
 * Engine: Microsoft ONNX Runtime Web 1.17.3 (MIT).
 * Model: Xuebin Qin et al., U²-Netp (https://github.com/xuebinqin/U-2-Net).
 * The ONNX file matches the rembg u2netp release. License notices are in this directory.
 */
const runtimeUrl = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/ort-wasm-simd.wasm';
const modelUrl = 'https://huggingface.co/nfa04/u2netp-onnx/resolve/8e72726f035efc3d1918c96b020d536f2b69ba0c/u2netp.onnx';

async function asset(url, integrity) {
  const request = new Request(url, {integrity:'sha256-'+integrity, credentials:'omit', referrerPolicy:'no-referrer'});
  const cache = await self.caches?.open('kachamak-cutout-v1').catch(()=>undefined);
  const stored = await cache?.match(request);
  if (stored) return stored.arrayBuffer();
  const response = await fetch(request).catch(()=>{
    throw Error('The photo tools need a connection on first use. Reconnect and try again.');
  });
  if (!response.ok) throw Error('Could not download the image tools. Check your connection and try again.');
  const bytes = await response.arrayBuffer();
  await cache?.put(request,new Response(bytes)).catch(()=>{});
  return bytes;
}

async function subjectMask(canvas) {
  self.postMessage({status:'Loading photo tools (15 MB on first use)…'});
  importScripts('ort-wasm-1.17.3.min.js');
  const [wasm,model]=await Promise.all([
    asset(runtimeUrl,'Z4P81mR84bQmpSfDFBKpxAiUVS+qYJ6ckxsyOaNDgHE='),
    asset(modelUrl,'MJyEaSWN2nQnk9zg6+qObdOTF0+Jk0cz7MixTHb03dg='),
  ]);
  const wasmUrl=URL.createObjectURL(new Blob([wasm],{type:'application/wasm'}));
  try {
    ort.env.wasm.numThreads=1;
    ort.env.wasm.wasmPaths={'ort-wasm-simd.wasm':wasmUrl};
    const session=await ort.InferenceSession.create(model,{executionProviders:['wasm']});
    self.postMessage({status:'Finding the subject…'});
    const side=320,area=side*side;
    const small=new OffscreenCanvas(side,side),ctx=small.getContext('2d');
    ctx.drawImage(canvas,0,0,side,side);
    const data=ctx.getImageData(0,0,side,side),input=new Float32Array(area*3);
    const means=[.485,.456,.406],std=[.229,.224,.225];
    let peak=1;
    for(let i=0;i<data.data.length;i+=4)peak=Math.max(peak,data.data[i],data.data[i+1],data.data[i+2]);
    for(let c=0;c<3;c++)for(let i=0;i<area;i++)input[c*area+i]=(data.data[i*4+c]/peak-means[c])/std[c];
    const outName=session.outputNames[0];
    const result=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',input,[1,3,side,side])},[outName]);
    const values=result[outName].data;
    let min=Infinity,max=-Infinity;
    for(const value of values){min=Math.min(min,value);max=Math.max(max,value);}
    if(!(max-min>.001))throw Error('No distinct foreground was found.');
    for(let i=0;i<area;i++){
      data.data[i*4]=data.data[i*4+1]=data.data[i*4+2]=255;
      data.data[i*4+3]=255*(values[i]-min)/(max-min);
    }
    ctx.putImageData(data,0,0);
    return small;
  } finally {URL.revokeObjectURL(wasmUrl);}
}

self.onmessage=async({data})=>{
  try {
    const src=typeof data==='string'?data:data.src;
    const logoMode=data.mode==='logo';
    const original=await createImageBitmap(await (await fetch(src)).blob());
    const canvas=new OffscreenCanvas(original.width,original.height);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(original,0,0);original.close();
    const image=ctx.getImageData(0,0,canvas.width,canvas.height);
    const {removeGraphicMatte}=await import('./logo-matte.js');
    const result=removeGraphicMatte(image.data,canvas.width,canvas.height,logoMode);
    if(result==='transparent'){
      if(typeof data==='string')throw Error('The original image already has a transparent background.');
      self.postMessage({useOriginal:true});
      return;
    }
    if(result==='removed'){
      ctx.putImageData(image,0,0);
    }else{
      if(logoMode)throw Error('A uniform logo background could not be identified. The current preview is unchanged.');
      const mask=await subjectMask(canvas);
      ctx.globalCompositeOperation='destination-in';
      ctx.drawImage(mask,0,0,canvas.width,canvas.height);
    }
    const bitmap=canvas.transferToImageBitmap();
    self.postMessage({bitmap},[bitmap]);
  }catch(err){self.postMessage({error:err.message||'Could not remove the background.'});}
};
