type EventCallback<Args extends any[] = any[]> = (...args: Args) => void;

export interface EventBus<
  Mapping extends { [K in keyof Mapping]: EventCallback } = Record<
    PropertyKey,
    EventCallback
  >,
> {
  on<K extends keyof Mapping>(event: K, callback: Mapping[K]): void;
  off<K extends keyof Mapping>(event: K, callback: Mapping[K]): void;
  emit<K extends keyof Mapping>(
    event: K,
    ...args: Parameters<Mapping[K]>
  ): void;
}

export class SimpleEventBus<
  Mapping extends { [K in keyof Mapping]: EventCallback } = Record<
    PropertyKey,
    EventCallback
  >,
> implements EventBus<Mapping>
{
  private listeners = new Map<keyof Mapping, EventCallback[]>();

  on<K extends keyof Mapping>(event: K, callback: Mapping[K]) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off<K extends keyof Mapping>(event: K, callback: Mapping[K]) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(callback);
    if (idx >= 0) arr.splice(idx, 1);
  }

  emit<K extends keyof Mapping>(event: K, ...args: Parameters<Mapping[K]>) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    for (const cb of arr) {
      cb(...args);
    }
  }
}
