export interface PriorityQueue<T> {
  size: number;

  enqueue(item: T): void;

  dequeue(): T;

  isEmpty(): boolean;
}

export function compareEvents(a: Event, b: Event): number {
  return a.time - b.time;
}

export class HeapPriorityQueue<T> implements PriorityQueue<T> {
  private _size: number = 0;
  private readonly heap: T[] = [];

  constructor(private readonly comparator: (a: T, b: T) => number) {
  }

  dequeue(): T {
    if (this._size < 0) {
      throw new Error('Head underflow');
    }
    const head: T = this.heap[0];
    this.heap[0] = this.heap[this._size - 1];
    this._size--;
    this.minHeapify();
    return head;
  }

  enqueue(item: T): void {
    if (this._size === this.heap.length) {
      this.heap.push(item);
    } else {
      this.heap[this._size] = item;
    }
    this._size++;

    let c = this._size - 1;
    let p = this.parent(this._size - 1);
    while (p >= 0 && this.comparator(this.heap[c], this.heap[p]) < 0) {
      const temp = this.heap[p];
      this.heap[p] = this.heap[c];
      this.heap[c] = temp;
      c = p;
      p = this.parent(c);
    }
  }

  isEmpty(): boolean {
    return this._size === 0;
  }

  private parent(i: number): number {
    return Math.floor((i - 1) / 2);
  }

  private minHeapify() {
    let i = 0;
    while (i < this._size) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < this._size && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < this._size && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest !== i) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[smallest];
        this.heap[smallest] = temp;
        i = smallest;
      } else {
        break;
      }
    }
  }

  get size(): number {
    return this._size;
  }
}
export class EventQueue implements PriorityQueue<Event> {
  private readonly queue = new HeapPriorityQueue<Event>(compareEvents);

  public enqueue(event: Event) {
    this.queue.enqueue(event);
  }

  public dequeue(): Event {
    return this.queue.dequeue();
  }

  public isEmpty(): boolean {
    return this.queue.isEmpty();
  }

  public get size(): number {
    return this.queue.size;
  }
}

export class EventLoop {
  private _currentTime: number = 0;
  private eventQueue = new EventQueue();

  put(event: Event) {
    this.eventQueue.enqueue(event);
  }

  start() {
    while (!this.eventQueue.isEmpty()) {
      const event = this.eventQueue.dequeue();
      this.tick(event);
      event.handler();
    }
  }

  private tick(event: Event): void {
    if (event.time >= this._currentTime) {
      this._currentTime = event.time;
    }
  }

  get currentTime(): number {
    return this._currentTime;
  }

  set currentTime(time: number) {
    if (time < this._currentTime) {
      throw new Error('Cannot set current time to a value in the past');
    }
  }
}

export interface Event {
  readonly type: EventType;
  readonly time: number;
  readonly handler: () => void;
}

export enum EventType {
  JOB_SUBMITTED = 'JOB_SUBMITTED',
  JOB_COMPLETED = 'JOB_COMPLETED',
}
