import{writeFile}from'node:fs/promises';
import{inspectDeploymentDatabase}from'./production-admin-release.mjs';
const report=await inspectDeploymentDatabase({...process.env,DIAGNOSTIC_DEPLOYMENT_ID:'dpl_FnXtQVfY33FUnozCuQwZHmEjzCyS',DIAGNOSTIC_DEPLOYMENT_URL:'https://ai-sport-hle0s9fa5-kevinmrgts-projects.vercel.app',TARGET_DATABASE_NAME:'alcide_admin_20261030_b',RELEASE_REVISION:'f9c222722367fe2ebb3fb73e08d4bb680322ddb1'});
await writeFile(process.env.ADMIN_RELEASE_EVIDENCE_FILE,JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.complete)process.exitCode=1;
