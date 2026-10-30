import {writeFile} from 'node:fs/promises';
import {VercelProduction,inspectConfiguration} from './production-admin-release.mjs';
import {readSelectedAdminId,targetDatabaseUrl} from './production-admin-bootstrap.mjs';
const env=process.env;
const report={sourceDatabaseWrites:false,environmentValueUnchanged:true,complete:false};
const undo=[];
let stage='configuration';
try {
 if(env.NOOP_SOURCE_ENV_PROBE!=='diagnose-existing-value-no-runtime-change')throw Error('confirmation_required');
 const provider=new VercelProduction(env);
 const configuration=await inspectConfiguration(env,provider);
 stage='source_admin_lookup';
 const sourceId=await readSelectedAdminId(configuration.source,env.BOOTSTRAP_ADMIN_EMAIL);
 stage='existing_target_admin_lookup';
 const targetId=await readSelectedAdminId(targetDatabaseUrl(configuration.source,env.TARGET_DATABASE_NAME),env.BOOTSTRAP_ADMIN_EMAIL);
 report.sameAdmin=sourceId===targetId;
 if(!report.sameAdmin)throw Error('admin_mismatch');
 stage='api_existing_database_environment';
 await provider.replace(env.VERCEL_API_PROJECT_ID,configuration.api.DATABASE_URL,'DATABASE_URL',configuration.api.DATABASE_URL.value,undo);
 report.complete=true;
} catch(error) {
 const allowed=['Error','TypeError','SyntaxError','TimeoutError','AbortError','BootstrapError','ReleaseError'];
 report.failure={stage,errorClass:allowed.includes(error.name)?error.name:'OtherError'};
 const value=error.reason??error.message;
 if(/^(admin_identity_lookup_failed|admin_not_unique|vercel_http_\d{3}|environment_create_not_confirmed|confirmation_required|admin_mismatch)$/.test(value??''))report.failure.reason=value;
} finally {
 report.rollbackComplete=true;
 for(const compensate of undo.reverse())try{await compensate();}catch{report.rollbackComplete=false;}
 await writeFile(env.ADMIN_RELEASE_EVIDENCE_FILE,JSON.stringify(report,null,2),{mode:0o600});
 console.log(JSON.stringify(report));
 if(!report.complete||!report.rollbackComplete)process.exitCode=1;
}
