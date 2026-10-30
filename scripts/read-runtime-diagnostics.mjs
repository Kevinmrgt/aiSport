import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const args = ['--yes','vercel@54.17.2','logs','--project',process.env.VERCEL_API_PROJECT_ID,
  '--deployment','https://ai-sport-pol6w2cuo-kevinmrgts-projects.vercel.app','--no-branch',
  '--since','2026-10-30T16:29:50Z','--until','2026-10-30T16:30:30Z','--limit','80','--json',
  '--token',process.env.VERCEL_TOKEN];
const result = spawnSync('npx', args, { encoding:'utf8',timeout:120000,maxBuffer:4000000,
  env:{...process.env,VERCEL_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe'] });
const report = { readOnly:true, paidCalls:0, source:'bounded-vercel-runtime-logs', cliSucceeded:result.status===0,
  parsedRecords:0, records:[], unexpectedJson:0 };
for (const line of (result.stdout??'').split('\n')) {
  if(!line.trim()) continue;
  let event; try{event=JSON.parse(line)}catch{report.unexpectedJson++;continue;}
  report.parsedRecords++;
  const raw=JSON.stringify(event);
  const markers=['AiService','AiProgramService','AppError','GenerationBudget','UnexpectedError'].filter(v=>raw.includes('['+v+']'));
  if(!markers.length)continue;
  const reasons=[...new Set(raw.match(/\b(?:SessionPlanningError|ZodError|AiProviderError|AiResponseError|AiAccountingError|AiTimeoutError|UnknownError)\b/g)??[])];
  const paths=[...new Set(raw.match(/\b(?:exercises|warmup|cooldown|prescription)(?:\.[a-z_0-9]+){0,6}\b/g)??[])];
  const issues=[...new Set(raw.match(/\b(?:invalid_type|invalid_value|too_small|too_big|invalid_format|custom|unrecognized_keys)\b/g)??[])];
  const diagnosticText=[];
  for(const pattern of [/Impossible de composer[^"\n\\]{0,350}/g, /(?:chauffement|retour au calme)[^"\n\\]{0,150}/g,
    /(?:cardio continu|force|isom.trie|mobilit.|transition|repos|palier|multiple)[^"\n\\]{0,100}/g]) {
    for(const m of raw.matchAll(pattern))diagnosticText.push(m[0]);
  }
  // Only application diagnostics explicitly designed to exclude user input; never entire log records.
  report.records.push({markers,reasons,paths,issues,diagnosticText:diagnosticText.slice(0,16)});
}
if(result.status!==0)report.cliFailure={timeout:result.error?.code==='ETIMEDOUT',
  forbidden:/forbidden|403|not authorized/i.test(result.stderr??''),
  unsupported:/unknown option|unexpected argument/i.test(result.stderr??'')};
await writeFile(process.env.DIAGNOSTIC_FILE,JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
if(result.status!==0)process.exitCode=1;
