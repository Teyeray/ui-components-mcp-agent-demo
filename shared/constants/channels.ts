/**
 * Redis channel constants
 */

export const REDIS_CHANNELS = {
  TODO_ACTIONS: 'todo:actions',
  TODO_EVENTS: 'todo:events',
  COMPONENT_STATE: 'component:state',
} as const;

export const SSE_EVENTS = {
  TODO_ADDED: 'todo_added',
  TODO_UPDATED: 'todo_updated',
  TODO_DELETED: 'todo_deleted',
  COMPONENT_STATE_CHANGED: 'component_state_changed',
  COMPONENT_SWITCH: 'component_switch',
  TERMINAL_COMMAND_EXECUTED: 'terminal_command_executed',
  HEARTBEAT: 'heartbeat',
} as const;
