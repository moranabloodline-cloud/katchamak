import {BookImage,BookOpen,Clapperboard,CodeXml,Folder,FolderOpen,Gamepad2,Tv} from 'lucide-react';

const icons={anime:Tv,books:BookOpen,comics:BookImage,games:Gamepad2,movies:Clapperboard,software:CodeXml};

/** Existing collection names determine presentation only; custom folders stay folders. */
export function CollectionIcon({name,className,open=false}:{name:string;className?:string;open?:boolean}) {
  const Icon=icons[name.trim().toLocaleLowerCase() as keyof typeof icons]??(open?FolderOpen:Folder);
  return <Icon aria-hidden="true" className={className}/>;
}
