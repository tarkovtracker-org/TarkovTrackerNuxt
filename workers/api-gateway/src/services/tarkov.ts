import type { Env, TarkovTask, TarkovHideoutStation } from '../types';
const CACHE_TTL = 3600; // 1 hour
const TASKS_CACHE_KEY = 'tarkov:tasks';
const HIDEOUT_CACHE_KEY = 'tarkov:hideout';
const TASKS_QUERY = `{
  tasks {
    id
    name
    factionName
    alternatives { id }
    objectives { id type count }
    taskRequirements { task { id } status }
  }
}`;
const HIDEOUT_QUERY = `{
  hideoutStations {
    id
    levels {
      id
      level
      itemRequirements { id count }
    }
  }
}`;
async function fetchGraphQL<T>(query: string): Promise<T | null> {
  try {
    const response = await fetch('https://api.tarkov.dev/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { data: T };
    return json.data;
  } catch {
    return null;
  }
}
interface TasksResponse {
  tasks: TarkovTask[];
}
interface HideoutResponse {
  hideoutStations: TarkovHideoutStation[];
}
export async function getTasks(env: Env): Promise<TarkovTask[]> {
  // Check cache first
  const cached = await env.API_GATEWAY_KV.get(TASKS_CACHE_KEY, 'json');
  if (cached) return cached as TarkovTask[];
  // Fetch from API
  const data = await fetchGraphQL<TasksResponse>(TASKS_QUERY);
  if (!data?.tasks) return [];
  // Transform alternatives from objects to string array
  const tasks = data.tasks.map((task) => ({
    ...task,
    alternatives: (task.alternatives as unknown as { id: string }[] | undefined)?.map((a) => a.id),
  }));
  // Cache result
  await env.API_GATEWAY_KV.put(TASKS_CACHE_KEY, JSON.stringify(tasks), {
    expirationTtl: CACHE_TTL,
  });
  return tasks;
}
export async function getHideoutStations(env: Env): Promise<TarkovHideoutStation[]> {
  // Check cache first
  const cached = await env.API_GATEWAY_KV.get(HIDEOUT_CACHE_KEY, 'json');
  if (cached) return cached as TarkovHideoutStation[];
  // Fetch from API
  const data = await fetchGraphQL<HideoutResponse>(HIDEOUT_QUERY);
  if (!data?.hideoutStations) return [];
  // Cache result
  await env.API_GATEWAY_KV.put(HIDEOUT_CACHE_KEY, JSON.stringify(data.hideoutStations), {
    expirationTtl: CACHE_TTL,
  });
  return data.hideoutStations;
}
