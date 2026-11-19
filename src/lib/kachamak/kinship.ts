import type {FamilyRelationship} from './types';

type Line = 'ancestry' | 'couple' | 'kin';

function directed<const F extends readonly string[], const R extends readonly string[]>(
  forward:F, reverse:R, line:Line='kin', steps=0,
) {
  return {forward,reverse,line,steps,mutual:false};
}

function mutual<const F extends readonly string[]>(forward:F, line:Line='kin') {
  return {forward,reverse:[] as const,line,steps:0,mutual:true};
}

// The first term identifies the underlying relationship. The selected term
// stays on the record, even when the writer enters it from the child's side.
const catalog = [
  {group:'Parents & children', entries:[
    directed(['parent','mother','father'],['child','daughter','son'],'ancestry',1),
    directed(['biological_parent','biological_mother','biological_father'],['biological_child','biological_daughter','biological_son'],'ancestry',1),
    directed(['adoptive_parent','adoptive_mother','adoptive_father'],['adopted_child','adopted_daughter','adopted_son'],'ancestry',1),
    directed(['stepparent','stepmother','stepfather'],['stepchild','stepdaughter','stepson'],'kin',1),
    directed(['foster_parent','foster_mother','foster_father'],['foster_child','foster_daughter','foster_son'],'kin',1),
  ]},
  {group:'Siblings', entries:[
    mutual(['sibling','sister','brother']),
    mutual(['half-sibling','half-sister','half-brother']),
    mutual(['stepsibling','stepsister','stepbrother']),
    mutual(['adoptive_sibling','adoptive_sister','adoptive_brother']),
    mutual(['foster_sibling','foster_sister','foster_brother']),
    mutual(['twin']), mutual(['identical_twin']), mutual(['fraternal_twin']),
  ]},
  {group:'Partners & marriage', entries:[
    mutual(['partner'],'couple'), mutual(['spouse','wife','husband'],'couple'),
    mutual(['fiancé','fiancée'],'couple'), mutual(['civil_partner'],'couple'),
    mutual(['former_partner'],'couple'), mutual(['former_spouse','ex-wife','ex-husband'],'couple'),
    mutual(['co-parent']),
  ]},
  {group:'Grandparents & ancestors', entries:[
    directed(['grandparent','grandmother','grandfather','maternal_grandmother','maternal_grandfather','paternal_grandmother','paternal_grandfather'],['grandchild','granddaughter','grandson'],'ancestry',2),
    directed(['great-grandparent','great-grandmother','great-grandfather'],['great-grandchild','great-granddaughter','great-grandson'],'ancestry',3),
    directed(['great-great-grandparent','great-great-grandmother','great-great-grandfather'],['great-great-grandchild','great-great-granddaughter','great-great-grandson'],'ancestry',4),
    directed(['ancestor'],['descendant'],'ancestry',1),
  ]},
  {group:'Extended family', entries:[
    directed(['aunt_or_uncle','aunt','uncle','maternal_aunt','maternal_uncle','paternal_aunt','paternal_uncle'],['niece_or_nephew','niece','nephew'],'kin',1),
    directed(['great-aunt_or_great-uncle','great-aunt','great-uncle'],['great-niece_or_great-nephew','great-niece','great-nephew'],'kin',2),
    mutual(['cousin']), mutual(['first_cousin']), mutual(['second_cousin']), mutual(['third_cousin']),
    mutual(['first_cousin_once_removed']), mutual(['first_cousin_twice_removed']),
    mutual(['second_cousin_once_removed']), mutual(['distant_relative']),
  ]},
  {group:'In-laws', entries:[
    directed(['parent-in-law','mother-in-law','father-in-law'],['child-in-law','daughter-in-law','son-in-law'],'kin',1),
    mutual(['sibling-in-law','sister-in-law','brother-in-law']),
    directed(['grandparent-in-law','grandmother-in-law','grandfather-in-law'],['grandchild-in-law','granddaughter-in-law','grandson-in-law'],'kin',2),
    directed(['aunt-in-law','uncle-in-law'],['niece-in-law','nephew-in-law'],'kin',1),
    mutual(['cousin-in-law']),
  ]},
  {group:'Guardians & chosen family', entries:[
    directed(['guardian'],['ward']),
    directed(['godparent','godmother','godfather'],['godchild','goddaughter','godson']),
    mutual(['godsibling']), mutual(['chosen_family_member']),
  ]},
];

type Entry = typeof catalog[number]['entries'][number];
type Preset = Entry['forward'][number] | Entry['reverse'][number];
export type KinshipKind = Preset | 'custom';
interface Definition { family:Preset; inverse:Preset; group:string; reverse:boolean; mutual:boolean; line:Line; steps:number; peer:boolean }
const definitions = new Map<string,Definition>();
export const kinshipGroups = catalog.map(({group,entries})=>{
  const kinds:Preset[]=[];
  for(const entry of entries){
    for(const kind of [...entry.forward,...entry.reverse]){
      const reverse=(entry.reverse as readonly string[]).includes(kind);
      const peer=entry.line==='couple'||group==='Siblings'||['first_cousin','second_cousin','third_cousin'].includes(kind);
      const inverse=reverse?entry.forward[0]:(entry.reverse[0]??entry.forward[0]);
      definitions.set(kind,{family:entry.forward[0],inverse,group,reverse,mutual:entry.mutual,line:entry.line,steps:entry.steps,peer});
      kinds.push(kind);
    }
  }
  return {group,kinds};
});

export function kinshipName(kind:KinshipKind) {
  const name=kind.replaceAll('_',' ');
  return name[0].toUpperCase()+name.slice(1);
}

export function relationshipName(edge:FamilyRelationship) {
  return edge.kind==='custom' ? edge.label : kinshipName(edge.kind);
}

export function relationshipCaption(edge:FamilyRelationship,person:string) {
  if(edge.from===person)return relationshipName(edge)+' of';
  if(edge.kind==='custom')return edge.mutual?edge.label+' of':'Has as '+edge.label;
  const inverse=definitions.get(edge.kind)!.inverse;
  if(inverse==='fiancé')return 'Engaged to';
  if(inverse==='aunt-in-law')return 'Aunt or uncle by marriage of';
  if(inverse==='niece-in-law')return 'Niece or nephew by marriage of';
  return kinshipName(inverse)+' of';
}

export function kinshipFamily(kind:KinshipKind) {
  return definitions.get(kind)?.family;
}

export function isSiblingRole(kind:KinshipKind) {
  return definitions.get(kind)?.group==='Siblings';
}

// Only an immediate parent/child role establishes parentage. An ancestor,
// spouse, guardian or stepparent alone does not establish it.
export function directParentage(edge:FamilyRelationship) {
  const family=kinshipFamily(edge.kind);
  if(family!=='parent' && family!=='biological_parent' && family!=='adoptive_parent')return;
  return relationshipDirection(edge);
}

export const customNameLimit=100;
export function validKind(edge:FamilyRelationship) {
  if(edge.kind!=='custom')return definitions.has(edge.kind);
  return typeof edge.label==='string' && edge.label===edge.label.trim() && edge.label.length>0
    && edge.label.length<=customNameLimit && !/[\u0000-\u001f\u007f]/.test(edge.label)
    && (edge.mutual===undefined || typeof edge.mutual==='boolean');
}

export function relationshipDirection(edge:FamilyRelationship) {
  const def=definitions.get(edge.kind);
  return {from:def?.reverse?edge.to:edge.from,to:def?.reverse?edge.from:edge.to,
    line:def?.line??'kin',steps:def?.steps??0,peer:!!def?.peer,mutual:edge.kind==='custom'?!!edge.mutual:!!def?.mutual};
}

export function relationshipKey(edge:FamilyRelationship) {
  const {from,to,mutual}=relationshipDirection(edge);
  const family=edge.kind==='custom' ? ['custom',edge.label.normalize('NFC').toLowerCase(),mutual] : definitions.get(edge.kind)?.family;
  return JSON.stringify([family,...(mutual&&from>to?[to,from]:[from,to])]);
}
