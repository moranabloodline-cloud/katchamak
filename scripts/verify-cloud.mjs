import { spawnSync } from 'node:child_process';
import path from 'node:path';
const env={...process.env,PATH:path.join(process.cwd(),'.tools')+path.delimiter+process.env.PATH};
const run=(cmd,args)=>{const result=spawnSync(cmd,args,{stdio:'inherit',env});if(result.status!==0)process.exit(result.status??1);};
run(process.execPath,['node_modules/typescript/bin/tsc','--noEmit','-p','tsconfig.app.json']);
for(const test of ['rich-editor','knowledge','link-known-names','paste-content','note-tree-add','cloud-library','account-auth','rehydration','library','release-store'])run(process.platform==='win32'?'bun.exe':'bun',['run',`tests/${test}.test.mjs`]);
run(process.execPath,['scripts/run-target.mjs','sites','scripts/build-project.mjs']);
