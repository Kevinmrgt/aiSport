import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function safeProject(project, domains, envs) {
  const deployment = project.targets?.production;
  const revision = deployment?.meta?.githubCommitSha ?? deployment?.gitSource?.sha;
  return {
    id: project.id, name: project.name, rootDirectory: project.rootDirectory,
    nodeVersion: project.nodeVersion, framework: project.framework,
    repository: project.link ? { type: project.link.type, repo: project.link.repo, productionBranch: project.link.productionBranch } : null,
    production: deployment ? {
      id: deployment.id,
      revision: /^[a-f0-9]{40}$/i.test(revision ?? '') ? revision : null,
      state: deployment.readyState, regions: deployment.regions,
    } : null,
    domains: (domains.domains ?? []).map((domain) => ({ name: domain.name, verified: domain.verified, redirect: domain.redirect })),
    // Only variable names and deployment targets. Never export encrypted OR plain values.
    environment: (envs.envs ?? []).map((env) => ({ key: env.key, target: env.target, type: env.type })),
  };
}

export async function inventoryTargets(env, fetcher = fetch) {
  const results = [];
  const team = env.VERCEL_ORG_ID;
  const token = env.VERCEL_TOKEN;
  for (const [service, projectId] of [['web', env.VERCEL_WEB_PROJECT_ID], ['api', env.VERCEL_API_PROJECT_ID]]) {
    if (!token || !team || !projectId) {
      results.push({ service, available: false, reason: 'missing_configuration' });
      continue;
    }
    try {
      const get = async (path) => {
        const url = new URL(path, 'https://api.vercel.com');
        url.searchParams.set('teamId', team);
        const response = await fetcher(url, {
          headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`http_${response.status}`);
        return response.json();
      };
      const project = encodeURIComponent(projectId);
      const details = await get(`/v9/projects/${project}`);
      const domains = await get(`/v9/projects/${project}/domains`);
      const envs = await get(`/v10/projects/${project}/env?decrypt=false`);
      results.push({ service, available: true, ...safeProject(details, domains, envs) });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const reason = /^http_\d{3}$/.test(message) ? message : 'request_failed';
      results.push({ service, available: false, reason });
    }
  }
  return { performedAt: new Date().toISOString(), readOnly: true, complete: results.every((r) => r.available), results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await inventoryTargets(process.env);
  await writeFile(process.env.TARGET_INVENTORY_FILE ?? 'target-inventory.json', `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ complete: report.complete, services: report.results.map(({ service, available, reason }) => ({ service, available, reason })) }));
  if (!report.complete) process.exitCode = 1;
}
