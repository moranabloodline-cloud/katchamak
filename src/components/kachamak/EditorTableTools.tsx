'use client';

import {useRef, useState, type FormEvent, type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown, Table2} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Input} from '@/components/ui/input';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {captureTableInsertion, editEditorTable, focusEditorRange, insertEditorTable, maxTableColumns, maxTableRows,
  tableCellOptions, type TableAction, type TableCellTarget, type TableInsertion, type TableSize} from '@/lib/kachamak/editor-tables';
import {tableAlignments, tableFits, tableProperties, type TableAlignment, type TableFit} from '@/lib/kachamak/editor-table-format';

const quickColumns = 10;
const quickRows = 8;
const sizeFields = [
  ['columns', 'Number of columns', maxTableColumns],
  ['rows', 'Number of rows', maxTableRows],
] as const;
const fitLabels: Record<TableFit, string> = {
  contents:'Fit to contents',
  page:'Fit to page',
  fixed:'Fixed column widths',
};
const selectClass = 'h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm';

function dialogButtons(action: string, close: () => void, destruct = false) {
  return <div className="flex justify-end gap-2">
    <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
    <Button type="submit" variant={destruct?'destructive':'default'}>{action}</Button>
  </div>;
}

function TableSizeForm({initial, label, close, submit, split = false}: {
  initial: TableSize; label: string; close: () => void; submit: (size:TableSize) => void; split?:boolean;
}) {
  const [error,setError] = useState('');
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const size = {columns:Number(fields.get('columns')), rows:Number(fields.get('rows'))};
    if (split && size.columns === 1 && size.rows === 1) {
      setError('Choose at least two columns or two rows.');
      return;
    }
    submit(size);
  }
  return <form className="grid gap-4" onSubmit={apply}>
    {sizeFields.map(([name,title,max],i) => <label key={name} className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3 text-sm">
      {title}<Input name={name} type="number" min={1} max={max} step={1} required defaultValue={initial[name]} autoFocus={i===0}/>
    </label>)}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {dialogButtons(label, close)}
  </form>;
}

export function EditorTableInsert({range, owns, disabled}: {
  range: () => Range | null; owns: (range:Range) => Range | null; disabled:boolean;
}) {
  const [open,setOpen] = useState(false);
  const [manual,setManual] = useState(false);
  const [size,setSize] = useState<TableSize>({columns:1, rows:1});
  const saved = useRef<TableInsertion | undefined>(undefined);
  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-table-size]');
    if (!direction || !button) return;
    event.preventDefault();
    const [column,row] = button.dataset.tableSize!.split('x').map(Number);
    const c = Math.max(1,Math.min(quickColumns,column + direction[0]));
    const r = Math.max(1,Math.min(quickRows,row + direction[1]));
    event.currentTarget.querySelector<HTMLButtonElement>('[data-table-size="'+c+'x'+r+'"]')?.focus();
  };
  function openPicker(next: boolean) {
    if (next) {
      saved.current = captureTableInsertion(range());
      if (!saved.current) return;
      setSize({columns:1,rows:1});
    }
    setOpen(next);
  }
  function insert(size: TableSize) {
    const target = saved.current;
    setOpen(false);
    setManual(false);
    requestAnimationFrame(() => {
      if (!target || !owns(target.range) || !insertEditorTable(target,size)) {
        toast.error('The editor changed. Place the cursor and insert the table again.');
      }
    });
  }
  function restoreCaret() {
    const target = saved.current;
    requestAnimationFrame(() => { if (target && owns(target.range)) focusEditorRange(target.editor,target.range); });
  }
  function closeManual() {
    setManual(false);
    restoreCaret();
  }
  return <>
    <Popover open={open} onOpenChange={openPicker}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} aria-label="Insert table" title="Insert table"
          onMouseDown={event=>event.preventDefault()}
          className="flex items-center gap-0.5 rounded-md p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-50">
          <Table2 className="size-4"/><ChevronDown className="size-3"/>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" data-editor-toolbar-popup className="w-72 max-w-[calc(100vw-1.5rem)] p-2.5"
        onCloseAutoFocus={event=>event.preventDefault()} onEscapeKeyDown={restoreCaret}>
        <div className="mb-2 flex justify-between gap-3 px-0.5 text-sm">
          <span>Table size</span><output className="tabular-nums text-muted-foreground">{size.columns} × {size.rows}</output>
        </div>
        <div role="group" aria-label="Table size grid" className="grid grid-cols-10 gap-1" onKeyDown={moveFocus}>
          {Array.from({length:quickRows * quickColumns},(_,i) => {
            const columns = i % quickColumns + 1, rows = Math.floor(i / quickColumns) + 1;
            const selected = columns <= size.columns && rows <= size.rows;
            return <button type="button" key={i} data-table-size={columns+'x'+rows}
              aria-label={columns+' '+(columns===1?'column':'columns')+', '+rows+' '+(rows===1?'row':'rows')}
              tabIndex={columns===size.columns&&rows===size.rows ? 0 : -1}
              onFocus={()=>setSize({columns,rows})} onMouseEnter={()=>setSize({columns,rows})} onClick={()=>insert({columns,rows})}
              className={'aspect-square rounded-sm border focus-visible:outline-2 focus-visible:outline-ring '+(selected?'border-amber-500/80 bg-amber-400/25':'border-border bg-muted/35')}/>;
          })}
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-2">
          <Button type="button" size="sm" variant="ghost" onClick={()=>{setOpen(false);restoreCaret();}}>Cancel</Button>
          <Button type="button" size="sm" variant="ghost" onClick={()=>{setOpen(false);setManual(true);}}>Custom size…</Button>
        </div>
      </PopoverContent>
    </Popover>
    <Dialog open={manual} onOpenChange={next=>{if(!next)closeManual();}}>
      <DialogContent data-editor-toolbar-popup className="sm:max-w-sm" onCloseAutoFocus={event=>event.preventDefault()}>
        <DialogHeader><DialogTitle>Insert table</DialogTitle>
          <DialogDescription className="sr-only">Enter the number of columns and rows.</DialogDescription>
        </DialogHeader>
        <TableSizeForm initial={{columns:5,rows:2}} label="Insert table" close={closeManual} submit={insert}/>
      </DialogContent>
    </Dialog>
  </>;
}

export type EditorTableMenuRequest = {target:TableCellTarget; x:number; y:number};
type TableDialog = {kind:'insertCell'|'deleteCell'|'split'|'properties'; target:TableCellTarget};
const dialogTitles: Record<TableDialog['kind'], string> = {
  insertCell:'Insert cells',deleteCell:'Delete cells',split:'Split cell',properties:'Table properties',
};

function TablePropertiesForm({table,close,submit}: {
  table:HTMLTableElement; close:()=>void; submit:(action:TableAction)=>void;
}) {
  const initial=tableProperties(table);
  const [fit,setFit]=useState(initial.fit);
  return <form className="grid gap-4" onSubmit={event=>{
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    submit({type:'properties',properties:{
      fit,width:fit==='contents'?initial.width:Number(fields.get('width')),
      alignment:fields.get('alignment') as TableAlignment,borders:fields.has('borders'),
    }});
  }}>
    <label className="grid gap-1.5 text-sm">AutoFit
      <select className={selectClass} value={fit} onChange={event=>setFit(event.target.value as TableFit)}>
        {tableFits.map(fit=><option key={fit} value={fit}>{fitLabels[fit]}</option>)}
      </select>
    </label>
    <label className="grid gap-1.5 text-sm">Width (%)
      <Input type="number" name="width" min={1} max={100} step="any" defaultValue={initial.width} disabled={fit==='contents'} required/>
    </label>
    <label className="grid gap-1.5 text-sm">Table alignment
      <select name="alignment" className={selectClass} defaultValue={initial.alignment}>
        {tableAlignments.map(align=><option key={align} value={align}>{align[0].toUpperCase()+align.slice(1)}</option>)}
      </select>
    </label>
    <label className="flex items-center gap-2 text-sm"><input name="borders" type="checkbox" defaultChecked={initial.borders}/>Show borders</label>
    {dialogButtons('Save changes',close)}
  </form>;
}

function CellShiftForm({insert,close,submit}:{insert:boolean;close:()=>void;submit:(action:TableAction)=>void}) {
  const kind=insert?'insertCell':'deleteCell';
  return <form className="grid gap-4" onSubmit={event=>{
    event.preventDefault();
    const axis=new FormData(event.currentTarget).get('direction')==='column'?'column':'row';
    submit({type:kind,axis});
  }}>
    <label className="grid gap-1.5 text-sm">Shift cells
      <select name="direction" className={selectClass}>
        <option value="column">{insert?'Right':'Left'}</option>
        <option value="row">{insert?'Down':'Up'}</option>
      </select>
    </label>
    {dialogButtons(insert?'Insert cells':'Delete cells',close,!insert)}
  </form>;
}

export function EditorTableMenu({request,close}: {request:EditorTableMenuRequest|null; close:()=>void}) {
  const [dialog,setDialog]=useState<TableDialog|null>(null);
  const target=request?.target;
  const options=target?tableCellOptions(target):undefined;
  function execute(target:TableCellTarget,action:TableAction) {
    requestAnimationFrame(()=>{
      if (!editEditorTable(target,action)) toast.error('The table changed or the edit would make it too large. Check the table and try again.');
    });
  }
  function choose(action:TableAction) {
    if (target) execute(target,action);
  }
  function show(kind:TableDialog['kind']) {
    if (target) setDialog({kind,target});
  }
  function cancelDialog() {
    const target=dialog?.target;
    setDialog(null);
    if (target) requestAnimationFrame(()=>focusEditorRange(target.editor,target.range));
  }
  function submitDialog(action: TableAction) {
    if (dialog) execute(dialog.target,action);
    setDialog(null);
  }
  const split=dialog?.kind==='split'?tableCellOptions(dialog.target):undefined;
  return <>
    {request && createPortal(
      <DropdownMenu open onOpenChange={next=>{if(!next)close();}} modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="pointer-events-none fixed size-px opacity-0" tabIndex={-1} aria-hidden
            style={{left:request.x,top:request.y}}/>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52" align="start" sideOffset={1} aria-label="Table options"
          onCloseAutoFocus={event=>event.preventDefault()}
          onEscapeKeyDown={()=>{if(target)requestAnimationFrame(()=>focusEditorRange(target.editor,target.range));}}>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!options?.structural}>Insert</DropdownMenuSubTrigger>
            <DropdownMenuPortal><DropdownMenuSubContent>
              <DropdownMenuItem onSelect={()=>choose({type:'insertColumn',edge:'before'})}>Insert column left</DropdownMenuItem>
              <DropdownMenuItem onSelect={()=>choose({type:'insertColumn',edge:'after'})}>Insert column right</DropdownMenuItem>
              <DropdownMenuItem onSelect={()=>choose({type:'insertRow',edge:'before'})}>Insert row above</DropdownMenuItem>
              <DropdownMenuItem onSelect={()=>choose({type:'insertRow',edge:'after'})}>Insert row below</DropdownMenuItem>
              <DropdownMenuSeparator/>
              <DropdownMenuItem disabled={!options?.shift} onSelect={()=>show('insertCell')}>Insert cells…</DropdownMenuItem>
            </DropdownMenuSubContent></DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Delete</DropdownMenuSubTrigger>
            <DropdownMenuPortal><DropdownMenuSubContent>
              <DropdownMenuItem disabled={!options?.structural} onSelect={()=>choose({type:'deleteRow'})}>Delete row</DropdownMenuItem>
              <DropdownMenuItem disabled={!options?.structural} onSelect={()=>choose({type:'deleteColumn'})}>Delete column</DropdownMenuItem>
              <DropdownMenuItem disabled={!options?.shift} onSelect={()=>show('deleteCell')}>Delete cells…</DropdownMenuItem>
              <DropdownMenuSeparator/>
              <DropdownMenuItem variant="destructive" onSelect={()=>choose({type:'deleteTable'})}>Delete table</DropdownMenuItem>
            </DropdownMenuSubContent></DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem disabled={!options?.structural} onSelect={()=>show('split')}>Split cell…</DropdownMenuItem>
          <DropdownMenuSeparator/>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Cell alignment</DropdownMenuSubTrigger>
            <DropdownMenuPortal><DropdownMenuSubContent>
              {tableAlignments.map(value=><DropdownMenuItem key={value} onSelect={()=>choose({type:'align',horizontal:value})}>Align {value}</DropdownMenuItem>)}
              <DropdownMenuSeparator/>
              <DropdownMenuItem onSelect={()=>choose({type:'align',vertical:'top'})}>Align top</DropdownMenuItem>
              <DropdownMenuItem onSelect={()=>choose({type:'align',vertical:'middle'})}>Align middle</DropdownMenuItem>
              <DropdownMenuItem onSelect={()=>choose({type:'align',vertical:'bottom'})}>Align bottom</DropdownMenuItem>
            </DropdownMenuSubContent></DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>AutoFit</DropdownMenuSubTrigger>
            <DropdownMenuPortal><DropdownMenuSubContent>
              {tableFits.map(fit=><DropdownMenuItem key={fit} onSelect={()=>choose({type:'fit',fit})}>{fitLabels[fit]}</DropdownMenuItem>)}
            </DropdownMenuSubContent></DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={()=>show('properties')}>Table properties…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,request.target.editor.ownerDocument.body)}
    {dialog && <Dialog open onOpenChange={next=>{if(!next)cancelDialog();}}>
      <DialogContent className="sm:max-w-sm" onCloseAutoFocus={event=>event.preventDefault()}>
        <DialogHeader><DialogTitle>{dialogTitles[dialog.kind]}</DialogTitle>
          <DialogDescription className="sr-only">Change the table in the active editor.</DialogDescription>
        </DialogHeader>
        {dialog.kind==='properties' ? <TablePropertiesForm table={dialog.target.table} close={cancelDialog} submit={submitDialog}/> :
          split ? <TableSizeForm initial={{
            columns:Math.min(maxTableColumns,split.columns>1||split.rows>1?split.columns:2),
            rows:Math.min(maxTableRows,split.rows),
          }} split label="Split cell" close={cancelDialog} submit={size=>submitDialog({type:'split',size})}/> :
          <CellShiftForm insert={dialog.kind==='insertCell'} close={cancelDialog} submit={submitDialog}/>}
      </DialogContent>
    </Dialog>}
  </>;
}
