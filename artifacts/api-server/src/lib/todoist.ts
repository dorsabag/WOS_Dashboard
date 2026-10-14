const TODOIST_API_BASE = "https://api.todoist.com";

function todoistRequest(path: string): Promise<Response> {
  const apiToken = process.env.TODOIST_API_TOKEN?.trim();
  if (!apiToken) throw new Error("TODOIST_API_TOKEN is not configured");
  return fetch(`${TODOIST_API_BASE}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${apiToken}` },
    signal: AbortSignal.timeout(15_000),
  });
}

export interface TodoistProject {
  id: string;
  name: string;
}

export interface TodoistDue {
  date: string;
  datetime: string | null;
  timezone: string | null;
  string: string;
  is_recurring: boolean;
}

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  due: TodoistDue | null;
  priority: number;
  is_completed: boolean;
  project_id: string;
}

interface PaginatedResponse<T> {
  results: T[];
  next_cursor: string | null;
}

async function todoistGet<T>(path: string): Promise<T[]> {
  const allResults: T[] = [];
  let cursor: string | null = null;

  do {
    const url = cursor ? `${path}${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}` : path;
    const response = await todoistRequest(url);
    if (!response.ok) {
      throw new Error(`Todoist API error (${response.status})`);
    }
    const data = await response.json() as PaginatedResponse<T>;
    allResults.push(...data.results);
    cursor = data.next_cursor ?? null;
  } while (cursor);

  return allResults;
}

export async function getTodoistProjects(): Promise<TodoistProject[]> {
  return todoistGet<TodoistProject>("/api/v1/projects");
}

export async function getTodoistTasksForProject(
  projectId: string
): Promise<TodoistTask[]> {
  return todoistGet<TodoistTask>(
    `/api/v1/tasks?project_id=${encodeURIComponent(projectId)}`
  );
}

export async function getWosEvents(): Promise<TodoistTask[]> {
  const projects = await getTodoistProjects();
  const wosProject = projects.find(
    (p) => p.name.toLowerCase().trim() === "whiteout survival"
  );
  if (!wosProject) {
    throw new Error(
      'Todoist project "Whiteout Survival" not found. Make sure the project exists in your Todoist account.'
    );
  }
  const tasks = await getTodoistTasksForProject(wosProject.id);
  return tasks.filter((t) => !t.is_completed);
}
