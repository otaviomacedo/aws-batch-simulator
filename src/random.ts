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
    return new class implements IDistribution {
      nextTime(): number {
        return value;
      }
    };
  }

  static exponential(lambda: number): IDistribution {
    return new class implements IDistribution {
      nextTime(): number {
        return -Math.log(Math.random()) / lambda;
      }
    };
  }

  private constructor() {
  }
}
