#!/usr/bin/env node
'use strict';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

const STATUS = {
  running: { label: 'run', color: YELLOW },
  completed: { label: 'done', color: GREEN },
  failed: { label: 'fail', color: RED },
  killed: { label: 'kill', color: RED },
};

function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, '');
}

function compact(n) {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

function modelName(id) {
  if (!id) return null;
  const s = String(id);
  const m = s.match(/^(.*?)-(\d+)(?:-(\d+))?(?:\[(.*?)\])?$/);
  if (!m) return s.replace(/^claude-/, '');
  const family = m[1].replace(/^claude-/, '');
  const version = m[2] + (m[3] ? '.' + m[3] : '');
  const suffix = m[4] ? ' [' + m[4] + ']' : '';
  return family.charAt(0).toUpperCase() + family.slice(1) + ' ' + version + suffix;
}

function shortAgent(type) {
  if (!type) return 'agent';
  const parts = String(type).split(':');
  return parts[parts.length - 1];
}

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function truncate(s, max) {
  if (max <= 0) return '';
  if (s.length <= max) return s;
  if (max <= 3) return s.slice(0, max);
  return s.slice(0, max - 3) + '...';
}

function render(task, columns) {
  if (!task || !task.id) return null;

  const status = STATUS[task.status] || { label: task.status || '?', color: DIM };
  const agent = shortAgent(task.agentType || task.name);
  const model = modelName(task.model);
  const tokens = Number(task.tokenCount) || 0;
  const windowSize = Number(task.contextWindowSize) || 0;

  const head = [
    status.color + status.label + RESET,
    BOLD + agent + RESET,
  ];
  if (model) head.push(DIM + model + RESET);
  if (tokens > 0 || windowSize > 0) {
    head.push(DIM + compact(tokens) + (windowSize > 0 ? ' ' + Math.floor((tokens / windowSize) * 100) + '%' : '') + RESET);
  }
  if (task.effort != null && task.effort !== '') head.push(DIM + 'effort ' + task.effort + RESET);

  const SEP_VISIBLE = 3;
  const sep = ' ' + DIM + '|' + RESET + ' ';
  const headText = head.join(sep);
  const label = clean(task.label || task.description);
  const budget = Number.isFinite(columns) && columns > 0
    ? columns - stripAnsi(headText).length - SEP_VISIBLE * 2
    : 60;

  const tail = label && budget > 2 ? sep + truncate(label, budget) : '';
  return JSON.stringify({ id: task.id, content: headText + tail });
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  const tasks = Array.isArray(input && input.tasks) ? input.tasks : [];
  const columns = Number(input && input.columns) || 0;
  const lines = tasks.map((t) => render(t, columns)).filter(Boolean);
  if (lines.length > 0) process.stdout.write(lines.join('\n') + '\n');
});
