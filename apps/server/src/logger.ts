export type Tag = 'SYSTEM' | 'HTTP' | 'WS' | 'SESSION' | 'SCENE' | 'ERROR';

const COLORS: Record<Tag, string> = {
  SYSTEM: '\x1b[36m',
  HTTP: '\x1b[34m',
  WS: '\x1b[33m',
  SESSION: '\x1b[35m',
  SCENE: '\x1b[32m',
  ERROR: '\x1b[31m',
};

function stamp(): string {
  return new Date().toLocaleTimeString('es-MX', { hour12: false });
}

function line(tag: Tag, message: string, args: unknown[]): void {
  const prefix = args.length > 0 ? ' ' : '';
  console.log(
    `\x1b[90m${stamp()}\x1b[0m ${COLORS[tag]}[${tag}]\x1b[0m ${message}${prefix}`,
    ...args,
  );
}

export const logger = {
  info: (tag: Tag, message: string, ...args: unknown[]): void => line(tag, message, args),
  warn: (tag: Tag, message: string, ...args: unknown[]): void => line(tag, `⚠ ${message}`, args),
  error: (tag: Tag, message: string, ...args: unknown[]): void => line(tag, `✖ ${message}`, args),
};