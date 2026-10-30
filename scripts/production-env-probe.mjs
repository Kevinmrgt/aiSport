import {writeFile} from 'node:fs/promises';
import {VercelProduction,inspectConfiguration,deployClosedProduction,privateCommand} from './production-admin-release.mjs';
import {runAdminBootstrap} from './production-admin-bootstrap.mjs';
const env={...process.env,ADMIN_IMPORT_POLICY:'account-only',BOOTSTRAP_REUSE_EXISTING:'verified-admin-copy'};
const report={sourceDatabaseWrites:false,newTargetWrites:false,aliasesModified:false,complete:false};
let stage='configuration';
try {
 if(env.NOOP_SOURCE_ENV_PROBE!=='diagnose-existing-value-no-runtime-change')throw Error('confirmation_required');
 const provider=new VercelProduction(env);
 const configuration=await inspectConfiguration(env,provider);
 stage='verify_existing_admin_target';
 const proof=await runAdminBootstrap({...env,SOURCE_DATABASE_URL:configuration.source,BOOTSTRAP_MODE:'apply',BOOTSTRAP_CONFIRM:'selective-admin-copy-to-new-database'});
 if(!proof.complete||!proof.adminCopyVerified||!proof.existingTargetVerified||proof.targetCreated)throw Error('existing_target_not_verified');
 let buildReached=false;
 stage='staging_configuration_and_pull';
 const result=await deployClosedProduction(env,configuration,provider,{
  bootstrap:async()=>proof,
  command:(command,args,childEnv,timeout,context)=>{
   if(context?.stage==='api_pull')return privateCommand(command,args,childEnv,timeout,context);
   buildReached=true;throw Error('intentional_probe_stop');
  },
 });
 report.complete=buildReached&&result.rollbackComplete;
 report.buildReached=buildReached;
 report.rollbackComplete=result.rollbackComplete;
 report.failure=result.failure;
} catch(error) {
 const allowed=['Error','TypeError','SyntaxError','TimeoutError','AbortError'];
 report.failure={stage,errorClass:allowed.includes(error.name)?error.name:'OtherError'};
 if(['confirmation_required','existing_target_not_verified'].includes(error.message))report.failure.reason=error.message;
} finally {
 await writeFile(env.ADMIN_RELEASE_EVIDENCE_FILE,JSON.stringify(report,null,2),{mode:0o600});
 console.log(JSON.stringify(report));
 if(!report.complete||!report.rollbackComplete)process.exitCode=1;
}
