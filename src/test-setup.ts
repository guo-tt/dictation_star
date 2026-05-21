/**
 * Vitest global setup: provide a proper in-memory localStorage mock
 * so storage tests work in the Node.js environment (Node 25 ships
 * a file-backed localStorage that is missing .clear()).
 */

class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
}

// Override the global localStorage with our mock
Object.defineProperty(globalThis, 'localStorage', {
  value: new LocalStorageMock(),
  writable: true,
});
