#!/usr/bin/env bun
const { PLANE_BASE_URL, PLANE_WORKSPACE: WS, PLANE_TOKEN_FOR_AI: TOKEN } = process.env;

type Page<T> = { results: T[]; next_page_results?: boolean; next_cursor?: string };
type Issue = {
  id: string; sequence_id: number; name: string; state: string; assignees: string[]; parent: string | null;
  start_date: string | null; target_date: string | null; completed_at: string | null;
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const url = `${PLANE_BASE_URL!.replace(/\/$/, '')}/api/v1` + (path.startsWith('/') ? path : '/' + path).replace('{ws}', WS!);
  const response = await fetch(url, {
    method,
    headers: { 'X-API-Key': TOKEN!, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) fail(`${method} ${url} -> ${response.status}\n${text.slice(0, 2000)}`);
  return text ? JSON.parse(text) : null;
}

async function all<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const sep = path.includes('?') ? '&' : '?';
    const page: Page<T> | T[] = await call('GET', `${path}${sep}per_page=100${cursor ? `&cursor=${cursor}` : ''}`);
    if (Array.isArray(page)) return page;
    out.push(...page.results);
    cursor = page.next_page_results ? page.next_cursor : undefined;
  } while (cursor);
  return out;
}

async function issues(identifier: string, moduleName?: string) {
  const projects = await all<{ id: string; identifier: string }>(`/workspaces/${WS}/projects/`);
  const project = projects.find((p) => p.identifier.toUpperCase() === identifier.toUpperCase())
    ?? fail(`No project ${identifier}. Known: ${projects.map((p) => p.identifier).join(', ')}`);
  const base = `/workspaces/${WS}/projects/${project.id}`;
  const [states, members, list] = await Promise.all([
    all<{ id: string; name: string }>(`${base}/states/`),
    call('GET', `/workspaces/${WS}/members/`) as Promise<{ id: string; display_name: string }[]>,
    all<Issue>(`${base}/issues/`),
  ]);
  let moduleIssueIds: Set<string> | undefined;
  if (moduleName) {
    const modules = await all<{ id: string; name: string }>(`${base}/modules/`);
    const mod = modules.find((m) => m.name.toLowerCase() === moduleName.toLowerCase())
      ?? fail(`No module "${moduleName}". Known: ${modules.map((m) => m.name).join(' | ')}`);
    moduleIssueIds = new Set((await all<{ id: string; issue?: string }>(`${base}/modules/${mod.id}/module-issues/`)).map((r) => r.issue ?? r.id));
  }
  const stateName = new Map(states.map((s) => [s.id, s.name]));
  const memberName = new Map(members.map((m) => [m.id, m.display_name]));
  const seq = new Map(list.map((i) => [i.id, i.sequence_id]));
  console.log(`project ${project.identifier} ${project.id}`);
  console.log(['key', 'state', 'start', 'target', 'completed', 'assignees', 'parent', 'id', 'name'].join('\t'));
  for (const i of list.filter((i) => !moduleIssueIds || moduleIssueIds.has(i.id)).sort((a, b) => a.sequence_id - b.sequence_id)) {
    console.log([
      `${project.identifier}-${i.sequence_id}`, stateName.get(i.state), i.start_date ?? '-', i.target_date ?? '-',
      i.completed_at?.slice(0, 10) ?? '-', i.assignees.map((a) => memberName.get(a) ?? a).join(',') || '-',
      i.parent ? `${project.identifier}-${seq.get(i.parent) ?? i.parent}` : '-', i.id, i.name.replace(/\s+/g, ' '),
    ].join('\t'));
  }
}

const [command, ...args] = process.argv.slice(2);
const missing = ['PLANE_BASE_URL', 'PLANE_WORKSPACE', 'PLANE_TOKEN_FOR_AI'].filter((name) => !process.env[name]);
if (missing.length) fail(`Set ${missing.join(', ')} before running plane.ts.`);
if (command === 'api') {
  const [method, path, body] = args;
  if (!method || !path) fail('usage: plane.ts api <METHOD> <path> [json-body]');
  const result = method.toUpperCase() === 'GET' && args.includes('--all')
    ? await all(path)
    : await call(method.toUpperCase(), path, body === undefined || body === '--all' ? undefined : JSON.parse(body));
  console.log(JSON.stringify(result, null, 2));
} else if (command === 'issues') {
  const [identifier, moduleName] = args;
  if (!identifier) fail('usage: plane.ts issues <PROJECT-IDENTIFIER> [module name]');
  await issues(identifier, moduleName);
} else {
  fail('usage: plane.ts api <METHOD> <path> [json-body] [--all] | plane.ts issues <PROJECT-IDENTIFIER> [module name]');
}
