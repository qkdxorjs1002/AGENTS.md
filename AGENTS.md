# Workflow

Write workflow documents in the user's language unless asked otherwise. Keep them short, practical, and current. Do not add unstated requirements or expand scope without explicit user approval.

## 0. Operating Principles

- Active workflow files live under `.agent-workflow/`, not the project root.
- Create or update only the workflow files needed for the current task.
- Workflow files may be created or updated before execution approval.
- Do not modify project source, tests, docs, configs, generated files, migrations, or other durable artifacts before approval.
- Implementation, refactoring, test changes, project documentation changes, configuration changes, migrations, and multi-file changes require an execution plan and user approval first.
- Check the worktree before and after work when practical, and never overwrite user changes.
- Do not commit, push, rebase, reset, discard changes, or include workflow files in commits unless explicitly requested.

## 1. User Input

- Ask the user only when the answer materially affects scope, approach, risk, compatibility, cost, or permission to execute.
- Use `request_user_input` for meaningful user decisions, especially when choosing an implementation approach, resolving unclear requirements, or asking whether to execute a prepared plan.
- Keep questions concise. Include options or a recommendation only when it helps the user decide.
- If a safe, reversible default is clear, proceed with that assumption and record it in the relevant workflow file instead of asking.
- Do not use user questions as a substitute for inspecting the repository when the answer can be found locally.

## 2. Workflow Files

- `.agent-workflow/request.md`: confirmed requirements, open questions, assumptions, and explicit out-of-scope items.
- `.agent-workflow/plan.md`: executable plan derived from confirmed requirements.
- `.agent-workflow/task.md`: current execution window.
- `.agent-workflow/task.recent.md`: recent completion and verification summary.
- `.agent-workflow/speedwagon.md`: current external findings that affect requirements, specs, tasks, or verification.
- `.agent-workflow/archive/<timestamp>-<task-slug>/`: archived workflow history and detailed logs.

## 3. Context Budget and Compaction

Active workflow files are current-state snapshots, not append-only logs. Do not keep conversation logs, raw tool outputs, rejected historical plans, old requirement versions, or full completed-task history in active files.

Compact active files when they grow stale, a phase completes, requirements or plans change materially, or approval is about to be requested.

Compaction procedure:

1. Archive useful history under `.agent-workflow/archive/<timestamp>-<task-slug>/`.
2. Add a short `summary.md` explaining what was archived and why.
3. Rewrite active files from the current confirmed state.
4. Preserve existing `REQ-*`, `SPEC-*`, and `TASK-*` IDs when they still refer to the same item.
5. Remove superseded, completed, resolved, failed-but-handled, and irrelevant content.
6. Add a single archive pointer line to active files when useful.

## 4. Plan Mode

Planning comes before implementation. Produce a plan that is clear enough to execute and verify.

Allowed before approval:

- Read relevant files, configs, schemas, docs, and current behavior.
- Search the repository.
- Check status and diffs.
- Run dry-run or read-only commands that do not create changes.

Not allowed before approval:

- Modify project, source, test, documentation, configuration, generated, or migration files.
- Generate code into the repository.
- Run formatters or commands that rewrite files.
- Run migrations or commands with persistent side effects.

Reduce uncertainty by inspecting the actual environment first. If a real decision remains, ask with `request_user_input` rather than guessing.

## 5. Requirements

Use `.agent-workflow/request.md` for complex tasks or tasks that require approval.

- Summarize the user's request.
- Assign stable IDs starting from `REQ-001` to confirmed requirements.
- Record open questions and assumptions separately.
- Record explicit out-of-scope items when they exist.
- Do not finalize the plan until requirements are clear enough to execute safely.
- Rewrite the file to reflect the current confirmed state; do not accumulate change history.

## 6. Plan

Use `.agent-workflow/plan.md` when planning is needed.

- Assign stable IDs starting from `SPEC-001` to implementation specs.
- Trace each `SPEC-*` to one or more `REQ-*` IDs.
- Include the approach, affected files or interfaces, execution order, dependencies, risks, edge cases, assumptions, and verification method as needed.
- Use a structure that fits the task instead of forcing a fixed template.
- Move rejected approaches and verbose investigation notes to the archive.
- Before implementation begins, ask whether to execute the plan when approval is required.

## 7. Tasks and Execution

Use `.agent-workflow/task.md` when execution has multiple steps.

- Keep only the current phase and a short next-phase preview when useful.
- Assign stable IDs starting from `TASK-001`.
- Each task must reference its source `SPEC-*` and include verification when applicable.
- After approval, execute the current phase from top to bottom.
- Mark a task complete only after implementation and verification are done.
- Move completed and verified work into `.agent-workflow/task.recent.md`, then remove it from `.agent-workflow/task.md`.
- Keep failed, blocked, skipped, or unverified work in `.agent-workflow/task.md` with an actionable next step.
- If scope or implementation details change materially, update workflow files and ask the user when the decision affects the approved plan.

## 8. External Findings

When external search or external documentation review is needed, record only findings that affect current requirements, specs, tasks, or verification in `.agent-workflow/speedwagon.md`.

Keep each entry short:

- source ID or link
- key finding
- related `REQ-*` or `SPEC-*`
- impact on the current decision

Do not store raw search dumps, long candidate link lists, or stale findings in active workflow files.

## 9. Completion

When work finishes:

- Summarize changed files and behavior.
- Report verification commands and results.
- Note remaining risks, skipped work, or follow-up tasks.
- Keep workflow files compact and current.
