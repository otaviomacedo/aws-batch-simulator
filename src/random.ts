export class RouletteWheel {
  constructor(private readonly list: number[]) {
  }

  run(): number {
    const sum = this.list.reduce((a, b) => a + b, 0);
    const random = Math.random() * sum;
    let acc = 0;
    for (const [index, value] of this.list.entries()) {
      acc += value;
      if (acc >= random) {
        return index;
      }
    }
    throw new Error('Should not happen');
  }
}

export interface IDistribution {

  /**
   * How long until the next event
   */
  nextTime(): number;
}

export class Distribution {
  static deterministic(value: number): IDistribution {
    if (value <= 0) {
      throw new Error(`The deterministic time must be positive. Got ${value}`);
    }

    return new class implements IDistribution {
      nextTime(): number {
        return value;
      }
    };
  }

  static exponential(lambda: number): IDistribution {
    if (lambda <= 0) {
      throw new Error(`The parameter of the exponential distribution must be positive. Got ${lambda}`);
    }

    return this.erlang(1, lambda);
  }

  static erlang(k: number, lambda: number): IDistribution {
    if (lambda <= 0) {
      throw new Error(`The rate parameter (λ) of the Erlang distribution must be positive. Got ${lambda}`);
    }

    if (!(Number.isInteger(k) && k > 0)) {
      throw new Error(`The shape parameter (k) of the Erlang distribution must be a positive integer. Got ${k}`);
    }

    return new class implements IDistribution {
      nextTime(): number {
        let sum = 0;
        for (let i = 0; i < k; i++) {
          sum += Math.log(Math.random());
        }
        return -sum / lambda;
      }
    };
  }

  private constructor() {
  }
}
