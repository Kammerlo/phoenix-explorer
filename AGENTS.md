# Roundtable - Agent Instructions

Multi-agent coordination hub for AI CLI agents. This file provides workflow recipes for agents (Codex CLI, Claude Code, or any MCP-compatible agent) connected to the Roundtable MCP server.

## Setup

- MCP endpoint: `http://localhost:4545/mcp`
- Build: `./gradlew build`
- Run: `./gradlew bootRun` (starts on port 4545)

## Workflows

> These workflows mirror the skills in `.claude-plugin/skills/`.

### Plan — Create topic and run as planner

When asked to "plan" or "create a topic and run as planner":

1. Call `create_topic` with the given topic name and description. Use defaults (quorum=ALL, phases=PLANNING,IMPLEMENTATION).
2. Call `register_agent` with `role`="planner", `agentName`="codex-planner" (or as specified).
3. Call `start_auto_pilot` for the agent.
4. Call `auto_pilot` with `lastSeenMessageId`=0. The response includes a `lastSeenMessageId` value — you MUST pass this to `send_message` (freshness enforcement rejects stale submissions). Follow the returned instructions:
   - PLAN requested: write a detailed plan, send with `type`="PLAN" and `lastSeenMessageId`=(value from auto_pilot). Use the messageId returned by `send_message` as your next `lastSeenMessageId`.
   - REVISION requested: read feedback, address it, send with `type`="REVISION" and `lastSeenMessageId`=(value from auto_pilot). Use the returned messageId as next `lastSeenMessageId`.
   - IN_REVIEW: call `auto_pilot` again after a moment, passing the `lastSeenMessageId` from the previous response.
   - DONE or STOP: stop and report status.
5. After each action, call `auto_pilot` again with the updated `lastSeenMessageId`.

### Review — Join as reviewer and run auto-pilot

When asked to "review" or "join as reviewer":

1. Call `register_agent` with `role`="reviewer", `agentName`="codex-reviewer" (or as specified).
2. Call `start_auto_pilot` for the agent.
3. Call `auto_pilot` with `lastSeenMessageId`=0. The response includes a `lastSeenMessageId` value — you MUST pass this to `send_message` (freshness enforcement rejects stale reviews). Follow the returned instructions:
   - Review requested: read the submission, send `type`="APPROVAL" or `type`="REJECTION" with `lastSeenMessageId`=(value from auto_pilot). Use the returned messageId as next `lastSeenMessageId`.
   - Waiting: call `auto_pilot` again after a moment, passing the `lastSeenMessageId` from the previous response.
   - DONE or STOP: stop and report status.
4. Be thorough but constructive. Approve when requirements are met. On rejection, state what needs to change.

### Status — Check topics and agents

When asked for "status" or "my topics":

- With an agent name: call `my_topics` to see all topics the agent is on.
- Without: call `list_topics` to see all active topics.

### Join — Register without auto-pilot

When asked to "join" a topic manually:

1. Call `register_agent` with the given topic, role, and agent name (default: "codex-planner" or "codex-reviewer").
2. Call `get_topic_status` to show current state.
3. The agent can then use `send_message`, `get_messages`, `get_latest` manually.

### Leave — Unregister from a topic

When asked to "leave" a topic:

1. Call `unregister_agent` with the topic name and agent name (default: "codex-planner").

### Resume — Restart auto-pilot

When asked to "resume" on a topic:

1. Call `start_auto_pilot` for the agent.
2. Call `get_messages` with `sinceId`=0 to catch up on context. Note the highest message ID.
3. Enter the auto-pilot loop with that `lastSeenMessageId`.