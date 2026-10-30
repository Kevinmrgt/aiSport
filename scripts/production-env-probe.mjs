import {writeFile} from 'node:fs/promises';
import {VercelProduction,inspectConfiguration,deployClosedProduction,privateCommand,checkReleaseHealth,safeReleaseFailure} from './production-admin-release.mjs';
import {runAdminBootstrap} from './production-admin-bootstrap.mjs';
const env={...process.env,ADMIN_IMPORT_POLICY:'account-only',BOOTSTRAP_CONFIRM:'selective-admin-copy-to-new-database',BOOTSTRAP_REUSE_EXISTING:'verified-admin-copy'};
const report={scope:'candidate-only-diagnostic',sourceDatabaseWrites:false,aliasesModified:false,complete:false};
let reachedHealth=false;
try {
 if(env.NOOP_SOURCE_ENV_PROBE!=='diagnose-existing-value-no-runtime-change')throw Error('confirmation_required');
 const provider=new VercelProduction(env);
 const configuration=await inspectConfiguration(env,provider);
 const result=await deployClosedProduction(env,configuration,provider,{
  bootstrap:async input=>{const proof=await runAdminBootstrap(input);report.bootstrap=proof;report.targetCreated=proof.targetCreated===true;report.existingTargetVerified=proof.existingTargetVerified===true;if(proof.targetCreated||!proof.existingTargetVerified||!proof.targetReused)throw Error('verified_existing_target_required');return proof;},
  command:privateApiCommand,
  health:async(url,expected,options)=>{reachedHealth=true;try{report.health=await checkReleaseHealth(url,expected,options);}catch(error){report.healthFailure=safeReleaseFailure(error,'api_health');}throw Error('intentional_diagnostic_stop_before_web_or_promotion');},
 });
 report.rollbackComplete=result.rollbackComplete;
 report.stagedDeploymentUrls=result.stagedDeploymentUrls;
 report.failure=result.failure;report.buildArtifactDiagnostics=result.buildArtifactDiagnostics;
 report.complete=reachedHealth&&result.rollbackComplete&&report.existingTargetVerified&&!report.targetCreated;
 function privateApiCommand(command,args,childEnv,timeout,context){
  if(!['api_pull','api_build','api_deploy'].includes(context?.stage))throw Error('only_api_candidate_commands_allowed');
  return privateCommand(command,args,childEnv,timeout,context);
 }
} catch(error){report.failure=safeReleaseFailure(error,'diagnostic_input');}
finally{await writeFile(env.ADMIN_RELEASE_EVIDENCE_FILE,JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report));if(!report.complete)process.exitCode=1;}
