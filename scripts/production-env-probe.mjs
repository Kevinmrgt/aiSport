import {writeFile} from 'node:fs/promises';
import {VercelProduction,inspectConfiguration,deployClosedProduction,privateCommand,checkReleaseHealth,safeReleaseFailure} from './production-admin-release.mjs';
import {runAdminBootstrap} from './production-admin-bootstrap.mjs';
const env={...process.env,ADMIN_IMPORT_POLICY:'account-only',BOOTSTRAP_CONFIRM:'selective-admin-copy-to-new-database',BOOTSTRAP_REUSE_EXISTING:'verified-admin-copy'};
const report={scope:'candidate-only-diagnostic',sourceDatabaseWrites:false,aliasesModified:false,complete:false,health:{},healthFailures:{}};
let reachedWebHealth=false;
try {
 if(env.NOOP_SOURCE_ENV_PROBE!=='diagnose-existing-value-no-runtime-change')throw Error('confirmation_required');
 const provider=new VercelProduction(env);
 const configuration=await inspectConfiguration(env,provider);
 const result=await deployClosedProduction(env,configuration,provider,{
  bootstrap:async input=>{const proof=await runAdminBootstrap(input);report.bootstrap=proof;report.targetCreated=proof.targetCreated===true;report.existingTargetVerified=proof.existingTargetVerified===true;if(proof.targetCreated||!proof.existingTargetVerified||!proof.targetReused)throw Error('verified_existing_target_required');return proof;},
  command:(command,args,childEnv,timeout,context)=>{
   if(!['api_pull','api_build','api_deploy','web_pull','web_build','web_deploy'].includes(context?.stage))throw Error('only_candidate_commands_allowed');
   return privateCommand(command,args,childEnv,timeout,context);
  },
  health:async(url,expected,options)=>{
   const component=expected.service==='alcide-api'?'api':'web';
   if(component==='web')reachedWebHealth=true;
   try{
    const health=await checkReleaseHealth(url,expected,options);report.health[component]=health;
    if(component==='api')return health;
    const response=await fetch(new URL('/api/auth/providers',url),{redirect:'error',signal:AbortSignal.timeout(15000),headers:options?.bypassSecret?{'x-vercel-protection-bypass':options.bypassSecret}:{}});
    const providers=await response.json();
    report.googleCallbackCanonical=response.ok&&providers.google?.callbackUrl==='https://www.alcideai.fr/api/auth/callback/google';
   }catch(error){report.healthFailures[component]=safeReleaseFailure(error,component+'_health');}
   throw Error('intentional_diagnostic_stop_before_promotion');
  },
 });
 report.rollbackComplete=result.rollbackComplete;report.stagedDeploymentUrls=result.stagedDeploymentUrls;
 report.failure=result.failure;report.buildArtifactDiagnostics=result.buildArtifactDiagnostics;
 report.complete=reachedWebHealth&&result.rollbackComplete&&report.existingTargetVerified&&!report.targetCreated;
 report.allCandidatesHealthy=Boolean(report.health.api&&report.health.web&&Object.keys(report.healthFailures).length===0&&report.googleCallbackCanonical);
}catch(error){report.failure=safeReleaseFailure(error,'diagnostic_input');}
finally{await writeFile(env.ADMIN_RELEASE_EVIDENCE_FILE,JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report));if(!report.complete)process.exitCode=1;}
