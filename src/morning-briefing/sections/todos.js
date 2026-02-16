async function fetchTodos() {
  const token = process.env.TODOIST_API_TOKEN;
  if (!token || token === "your_token_here") return null;

  const filter = encodeURIComponent("today | overdue");
  const res = await fetch(`https://api.todoist.com/api/v1/tasks?filter=${filter}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`Todoist API error: ${res.status} ${res.statusText}`);
    const body = await res.text().catch(() => "");
    if (body) console.error(body);
    return null;
  }

  const data = await res.json();
  const tasks = data.results || data;
  const today = new Date().toISOString().slice(0, 10);
  return tasks
    .filter((t) => t.due && t.due.date === today)
    .map((t) => ({
      content: t.content,
      priority: t.priority,
    }));
}

function printTodos(printer, todos) {
  printer.printSectionTitle("TODAY'S TASKS");

  if (!todos) {
    printer.printLine("  Todoist unavailable.");
    return;
  }

  if (todos.length === 0) {
    printer.printLine("  No tasks for today!");
    return;
  }

  for (const task of todos) {
    printer.printWrapped(`  - ${task.content}`, 40);
  }
}

module.exports = { fetchTodos, printTodos };
