import {useState} from 'react';
import {ImagePlus} from 'lucide-react';
import {GalleryImagePicker} from './GalleryImagePicker';
import type {Novel} from '@/lib/kachamak/types';

export function HomeImagePlaceholder({novel,onImage}:{
  novel:Novel;
  onImage:(image:string)=>boolean;
}){
  const [error,setError]=useState('');
  return <>
    <GalleryImagePicker novel={novel} onPick={ref=>setError(onImage(ref)?'':'The block changed. Choose the image again.')}>
      <button type="button"
        className="flex min-h-24 w-full aspect-[4/1] items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/25 text-sm text-muted-foreground hover:text-foreground">
        <ImagePlus className="size-4"/>Choose from Gallery
      </button>
    </GalleryImagePicker>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  </>;
}
