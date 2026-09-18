import os from 'node:os';

export function getLocalIPv4s(): string[] {
  const nets = os.networkInterfaces();
  const out: string[] = [];
  for (const name of Object.keys(nets)) {
    const list = nets[name];
    if (!list) continue;
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return [...new Set(out)];
}