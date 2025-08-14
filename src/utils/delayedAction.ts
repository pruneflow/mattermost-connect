export class DelayedAction {
  readonly #action: () => void;
  #timer: number | undefined;

  constructor(action: () => void) {
    this.#action = action;
    this.#timer = undefined;
  }

  fire = (): void => {
    this.#action();
    this.#timer = undefined;
  };

  fireAfter(timeout: number): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
    }
    this.#timer = window.setTimeout(this.fire, timeout);
  }

  cancel(): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
  }
}
