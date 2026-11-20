// Sample the perimeter by its actual length. The two short ends of a wordmark
// can be almost completely occupied by letters.
function sampleBackdrop(pixels,width,height) {
  const border=[],interior=[];
  const sample=(points,x,y)=>points.push((y*width+x)*4);
  const horizontal=Math.max(2,Math.min(width,Math.ceil(256*width/(width+height))));
  const vertical=Math.max(2,Math.min(height,Math.ceil(256*height/(width+height))));
  for(let n=0;n<horizontal;n++){
    const x=Math.min(width-1,Math.floor((n+.5)*width/horizontal));
    sample(border,x,0);
    sample(border,x,height-1);
  }
  for(let n=0;n<vertical;n++){
    const y=Math.min(height-1,Math.floor((n+.5)*height/vertical));
    sample(border,0,y);
    sample(border,width-1,y);
  }
  const cols=Math.min(96,width),rows=Math.min(48,height);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    sample(interior,Math.floor((x+.5)*width/cols),Math.floor((y+.5)*height/rows));
  }
  return {border,interior};
}

function medianColor(pixels,offsets){
  return [0,1,2].map(c=>{
    const channel=offsets.map(i=>pixels[i+c]).sort((a,b)=>a-b);
    return channel[channel.length>>1];
  });
}

function distance(pixels,i,color){
  return Math.max(Math.abs(pixels[i]-color[0]),Math.abs(pixels[i+1]-color[1]),Math.abs(pixels[i+2]-color[2]));
}

// A second strong colour peak distinguishes printed lettering on a flat
// field from a subject photographed against a complex background.
function dominantInk(pixels,interior,matte){
  const foreground=interior.filter(i=>pixels[i+3]>=224&&distance(pixels,i,matte)>40);
  if(foreground.length<3)return null;
  const ink=medianColor(pixels,foreground);
  if(distance(ink,0,matte)<45)return null;
  return foreground.filter(i=>distance(pixels,i,ink)<=18).length>=foreground.length*.65?ink:null;
}

export function removeGraphicMatte(pixels,width,height,logoMode=false){
  const {border,interior}=sampleBackdrop(pixels,width,height);
  const opaque=border.filter(i=>pixels[i+3]>=224);
  const clearFraction=points=>points.filter(i=>pixels[i+3]<=8).length/points.length;
  const clearBorder=clearFraction(border);
  if(clearBorder>.9 || (clearBorder>.16 && clearFraction(interior)>.09))return 'transparent';
  if(!opaque.length)return 'photo';
  const matte=medianColor(pixels,opaque);
  const same=i=>pixels[i+3]>=224 && distance(pixels,i,matte)<=15;
  const rimMatch=opaque.filter(same).length/opaque.length;
  const areaMatch=interior.filter(same).length/interior.length;
  const ink=dominantInk(pixels,interior,matte);
  if(rimMatch<.94 && !(rimMatch>=.48 && areaMatch>=.28 && (ink||logoMode)))return 'photo';

  const delta=ink?.map((v,c)=>v-matte[c]);
  const norm=delta?.reduce((sum,v)=>sum+v*v,0);
  let visible=false;
  for(let i=0;i<pixels.length;i+=4){
    if(pixels[i+3]===0)continue;
    const d=distance(pixels,i,matte);
    if(d<=8){pixels[i+3]=0;continue;}
    // For two-colour lettering, undo the original matte in antialiased
    // pixels. Full ink and off-palette accents retain their original RGB.
    if(delta && norm){
      const coverage=((pixels[i]-matte[0])*delta[0]+(pixels[i+1]-matte[1])*delta[1]+(pixels[i+2]-matte[2])*delta[2])/norm;
      if(coverage<=0 && d<18){pixels[i+3]=0;continue;}
      if(coverage>0 && coverage<.985 && delta.every((v,c)=>Math.abs(pixels[i+c]-matte[c]-v*coverage)<=12)){
        pixels[i+3]*=coverage;
        for(let c=0;c<3;c++)pixels[i+c]=ink[c];
      }
    }else{
      const alpha=Math.max(0,Math.min(1,(d-8)/35));
      if(alpha>0 && alpha<1){
        for(let c=0;c<3;c++)pixels[i+c]=matte[c]+(pixels[i+c]-matte[c])/alpha;
      }
      pixels[i+3]*=alpha;
    }
    if(pixels[i+3]>32)visible=true;
  }
  if(!visible)throw Error('No foreground was found in this image.');
  return 'removed';
}
