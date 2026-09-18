export interface WsClientOptions {
  url: string;
  onOpen: () => void;
  onClose: () => void;
  onError: (message: string) => void;
  onMessage: (data: string) => void;
}

const BACKOFF_DELAYS_MS = [1000, 2000, 5000, 10000, 20000, 30000];

export class ReconnectingWs {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private userClosed = false;
  private timer: number | undefined;

  constructor(private readonly opts: WsClientOptions) {}

  connect(): void {
    this.userClosed = false;
    this.open();
  }

  private open(): void {
    if (this.userClosed) return;
    try {
      const ws = new WebSocket(this.opts.url);
      this.ws = ws;

      ws.onopen = () => {
        this.attempt = 0;
        this.opts.onOpen();
      };

      ws.onmessage = (ev) => {
        this.opts.onMessage(String(ev.data));
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        this.opts.onError('Error de conexión WebSocket');
      };

      ws.onclose = () => {
        this.ws = null;
        this.opts.onClose();
        this.scheduleReconnect();
      };
    } catch {
      this.opts.onError('No se pudo crear el WebSocket');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.userClosed) return;
    const delay = BACKOFF_DELAYS_MS[Math.min(this.attempt, BACKOFF_DELAYS_MS.length - 1)];
    this.attempt += 1;
    this.timer = window.setTimeout(() => this.open(), delay);
  }

  reconnectNow(): void {
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = undefined;
    this.attempt = 0;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
    this.open();
  }

  send(data: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(data);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  close(): void {
    this.userClosed = true;
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = undefined;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
  }
}