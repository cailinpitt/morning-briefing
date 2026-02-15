async function fetchTodos() {
  const token = process.env.TODOIST_API_TOKEN;
  if (!token || token === "your_token_here") return null;

  const res = await fetch("https://api.todoist.com/rest/v2/tasks?filter=today|overdue", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;

  const tasks = await res.json();
  return tasks.map((t) => ({
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
    const marker = task.priority >= 3 ? "(!)" : "[ ]";
    printer.printWrapped(`  ${marker} ${task.content}`, 40);
  }
}

module.exports = { fetchTodos, printTodos };
