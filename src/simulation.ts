import * as batch from '@aws-cdk/aws-batch-alpha';
import { IJobDefinition } from '@aws-cdk/aws-batch-alpha';
import { Aspects, IAspect } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { EventLoop, EventType } from './events';
import { Job } from './job';
import { Distribution, IDistribution } from './random';
import {
  Ec2ComputeEnvironment,
  ExecutionMetrics,
  FairShareSchedulingPolicy,
  FargateComputeEnvironment,
  FifoSchedulingPolicy,
  IComputeEnvironment,
  ISchedulingPolicy,
  JobQueue,
  QueueHistory,
} from './scheduling';

const DEFAULT_NUMBER_OF_JOBS: number = 20000;

export interface StochasticModel {
  readonly interArrivalTimeDistribution: IDistribution;
  readonly serviceTimeDistribution: IDistribution;
  readonly jobDefinition: batch.IJobDefinition;
  readonly weightFactorProbabilities?: { [id: string]: number };
  readonly successProbability?: number;
}

export interface MarkovModel {
  readonly arrivalRate: number;
  readonly meanServiceTime: number;
  readonly jobDefinition: batch.IJobDefinition;
  readonly weightFactorProbabilities?: { [id: string]: number };
  readonly successProbability?: number;
}

interface RandomNumberGenerator {
  runningTime: () => number;
  insertTime: () => number;
  shareIdentifier: () => string;
}

export interface Backlog {
  readonly jobs: Job[];
  readonly queue: JobQueue;
}

function cpusFrom(jobDefinition: batch.IJobDefinition): number {
  if (isEcs(jobDefinition)) {
    return jobDefinition.container.cpu;
  }

  if (isMultiNode(jobDefinition)) {
    return jobDefinition.containers
      .map(c => c.container.cpu)
      .reduce((a, b) => a + b, 0);
  }

  if (isEks(jobDefinition)) {
    // Validation on the JobDefinition guarantees that it will never fall back to 0
    return jobDefinition.container.cpuLimit ?? jobDefinition.container.cpuReservation ?? 0;
  }

  throw new Error(`Job definition ${jobDefinition.jobDefinitionName} is of an unsupported type.`);

  function isMultiNode(def: any): def is batch.MultiNodeJobDefinition {
    return def.hasOwnProperty('containers');
  }

  function isEks(def: any): def is batch.EksJobDefinition {
    return def.hasOwnProperty('container') &&
      (def.container.hasOwnProperty('cpuLimit')
        || def.container.hasOwnProperty('cpuReservation'));
  }

  function isEcs(def: any): def is batch.EcsJobDefinition {
    return def.hasOwnProperty('container') && def.container.hasOwnProperty('cpu');
  }
}


export class JobGenerator {
  private readonly rngs: RandomNumberGenerator[];

  constructor(private readonly models: StochasticModel[]) {
    validateConfigs(models);
    this.rngs = models.map(config => ({
      runningTime: () => {
        return config.serviceTimeDistribution.nextTime();
      },
      insertTime: () => {
        return config.interArrivalTimeDistribution.nextTime();
      },
      shareIdentifier: (): string => {
        if (config.weightFactorProbabilities == null) return 'default';

        // TODO Use the RouletteWheel
        const probabilities = config.weightFactorProbabilities ?? {};
        let n = Math.random();
        const entries = Object.entries(probabilities);
        for (const [id, p] of entries) {
          if (n < p) return id;
          n -= p;
        }
        return entries[entries.length - 1][0];
      },
    }));
  }

  generate(queues: batch.IJobQueue[], eventLoop: EventLoop): Backlog[] {
    const converter = new ConstructConverter(eventLoop);
    return queues
      .map(q => converter.convertJobQueue(q))
      .map(q => ({
        queue: q,
        jobs: this.generateRandomJobs(),
      }));
  }

  private generateRandomJobs(): Job[] {
    let time = 0;
    const jobs: Job[] = new Array<Job>(DEFAULT_NUMBER_OF_JOBS);
    for (let i = 0; i < DEFAULT_NUMBER_OF_JOBS; i++) {
      const c = Math.floor(Math.random() * this.models.length);
      const jobDefinition: IJobDefinition = this.models[c].jobDefinition;
      const rng: RandomNumberGenerator = this.rngs[c];
      const successProbability = this.models[c].successProbability ?? 1;
      time += rng.insertTime();
      jobs[i] = {
        runningTime: generateRunningTime(successProbability, jobDefinition, rng),
        insertTime: time,
        vCpus: cpusFrom(jobDefinition),
        shareIdentifier: rng.shareIdentifier(),
        definitionId: jobDefinition.node.path,
      };
    }
    return jobs;

    function generateRunningTime(successProbability: number, jobDefinition: IJobDefinition, rng: RandomNumberGenerator): number {
      const retryStrategies = jobDefinition.retryStrategies;
      const retries = retryStrategies.some(s => s.action === batch.Action.RETRY)
        ? jobDefinition.retryAttempts ?? 1
        : 0;

      const r = geometric(successProbability);
      const trials = Math.min(r, retries + 1);
      return rng.runningTime() * trials;
    }
  }
}

/**
 * Generates a random number from a geometric distribution
 */
function geometric(successProbability: number): number {
  if (successProbability === 1) return 1;
  return Math.ceil(Math.log(Math.random()) / Math.log(1 - successProbability));
}

function validateConfigs(configs: StochasticModel[]) {
  // TODO test this
  if (configs.some(c => c.weightFactorProbabilities != null
    && Object.values(c.weightFactorProbabilities).reduce((a, b) => a + b, 0) !== 1)) {
    throw new Error('Weight factor probabilities must sum to 1');
  }
}
interface SimulationResult {
  readonly timesBySI: TimeDistribution[];
  readonly timesByJD: TimeDistribution[];
  readonly queueHistories: QueueHistory[];
}

interface TimeDistribution {
  name: string;
  data: number[];
  mean: number;
}

export interface IBatchSimulator<M> {
  simulate(models: M[]): SimulationReport;
}

abstract class BaseBatchSimulator<M> implements IBatchSimulator<M> {
  private queues: batch.JobQueue[] = [];

  protected constructor(private readonly scope: IConstruct) {
    const queues: batch.JobQueue[] = this.queues;
    Aspects.of(this.scope).add(new class implements IAspect {
      visit(node: IConstruct): void {
        if (isJobQueue(node)) {
          queues.push(node);
        }
      }
    });

    function isJobQueue(x: any): x is batch.JobQueue {
      return x.hasOwnProperty('jobQueueArn');
    }
  }

  simulate(models: M[]): SimulationReport {
    return this.simulator(models).simulate(this.queues);
  }

  protected abstract simulator(models: M[]): Simulator;
}

class GeneralBatchSimulator extends BaseBatchSimulator<StochasticModel> {
  constructor(scope: IConstruct) {
    super(scope);
  }

  protected simulator(models: StochasticModel[]): Simulator {
    return new Simulator(models);
  }
}

class MarkovBatchSimulator extends BaseBatchSimulator<MarkovModel> {
  constructor(scope: IConstruct) {
    super(scope);
  }

  protected simulator(models: MarkovModel[]): Simulator {
    return new Simulator(models.map(c => ({
      successProbability: c.successProbability,
      jobDefinition: c.jobDefinition,
      weightFactorProbabilities: c.weightFactorProbabilities,
      interArrivalTimeDistribution: Distribution.exponential(c.arrivalRate),
      serviceTimeDistribution: Distribution.exponential(1 / c.meanServiceTime),
    })));
  }
}

export class BatchSimulator {
  static general(scope: IConstruct): IBatchSimulator<StochasticModel> {
    return new GeneralBatchSimulator(scope);
  }

  static markov(scope: IConstruct): IBatchSimulator<MarkovModel> {
    return new MarkovBatchSimulator(scope);
  }
}

export class Simulator {
  constructor(private readonly models: StochasticModel[]) {
  }

  simulate(queues: batch.IJobQueue[]): SimulationReport {
    const eventLoop = new EventLoop();
    const jobGenerator = new JobGenerator(this.models);
    const backlogs = jobGenerator.generate(queues, eventLoop);

    backlogs.forEach(backlog => {
      const queue: JobQueue = backlog.queue;
      backlog.jobs.forEach(job => {
        eventLoop.put({
          type: EventType.JOB_SUBMITTED,
          time: job.insertTime,
          handler: () => queue.push(job),
        });
      });
    });

    eventLoop.start();

    const metrics: ExecutionMetrics[] = backlogs.flatMap(b => b.queue.executionMetrics);
    const queueHistories: QueueHistory[] = backlogs.map(b => ({
      id: b.queue.queueId,
      metrics: b.queue.queueMetrics,
    }));
    const map: Map<Job, number> = new Map(metrics.map(m => [m.job, m.time]));

    const timesBySI = this.foo(map, j => j.shareIdentifier);
    const timesByJD = this.foo(map, j => j.definitionId);

    return new SimulationReport({
      queueHistories,
      timesBySI,
      timesByJD,
    });
  }

  private foo(times: Map<Job, number>, classifier: (job: Job) => string): TimeDistribution[] {
    const byShareIdentifier: Record<string, number[]> = {};

    times.forEach((time, job) => {
      const shareIdentifier = classifier(job);
      if (byShareIdentifier[shareIdentifier] == null) {
        byShareIdentifier[shareIdentifier] = [];
      }
      byShareIdentifier[shareIdentifier].push(time);
    });

    return Object.entries(byShareIdentifier).map(([id, ts]) => ({
      name: id,
      data: ts,
      mean: mean(ts),
    }));
  }
}

function mean(data: number[]): number {
  return data.reduce((a, b) => a + b, 0) / data.length;
}

/**
 * Converts CDK constructs into their simulation counterparts.
 */
class ConstructConverter {
  private envCache: Map<batch.IComputeEnvironment, IComputeEnvironment> = new Map();

  constructor(private readonly eventLoop: EventLoop) {
  }

  convertJobQueue(queue: batch.IJobQueue): JobQueue {
    return new JobQueue({
      schedulingPolicy: this.convertSchedulingPolicy(queue.schedulingPolicy),
      computeEnvironments: queue.computeEnvironments.map(e => this.convertComputeEnvironment(e.computeEnvironment)),
      eventLoop: this.eventLoop,
      queueId: queue.node.path,
    });
  }

  private convertSchedulingPolicy(policy?: batch.ISchedulingPolicy): ISchedulingPolicy {
    return isFairShareSchedulingPolicy(policy)
      ? new FairShareSchedulingPolicy(policy)
      : new FifoSchedulingPolicy();

    function isFairShareSchedulingPolicy(p?: batch.ISchedulingPolicy): p is batch.FairshareSchedulingPolicy {
      return p != null && p.hasOwnProperty('shares');
    }
  }

  private convertComputeEnvironment(environment: batch.IComputeEnvironment): IComputeEnvironment {
    if (!isManaged(environment)) {
      throw new Error('Only managed compute environments are supported');
    }

    if (this.envCache.has(environment)) {
      return this.envCache.get(environment)!;
    }

    const result = isEc2(environment)
      ? new Ec2ComputeEnvironment({
        environment: environment,
        eventLoop: this.eventLoop,
      })
      : new FargateComputeEnvironment({
        environment: environment,
        eventLoop: this.eventLoop,
      });

    this.envCache.set(environment, result);

    return result;

    function isManaged(e: batch.IComputeEnvironment): e is batch.IManagedComputeEnvironment {
      return e != null && e.hasOwnProperty('maxvCpus');
    }

    function isEc2(e: batch.IManagedComputeEnvironment): e is batch.ManagedEc2EksComputeEnvironment | batch.ManagedEc2EcsComputeEnvironment {
      return e != null && e.hasOwnProperty('images');
    }
  }
}

export class SimulationReport {

  constructor(private readonly simulationResult: SimulationResult) {
  }

  toHtml(): string {
    const generateDivs = (prefix: string, dists: TimeDistribution[]) =>
      dists.map(dist => `<div id="${prefix}-${dist.name}" style="width: 900px; height: 500px;"></div>`);

    const generateQueueDivs = () => {
      const result: string[] = [];
      this.simulationResult.queueHistories.forEach(history => {
        result.push(`<div id="q-${history.id}"></div>`);
      });
      return result;
    };

    const generateCalls = () => [
      ...drawDistributions('si', this.simulationResult.timesBySI),
      ...drawDistributions('jd', this.simulationResult.timesByJD),
      ...generateQueueHistories(),
    ].join('\n');

    function drawDistributions(prefix: string, dists: TimeDistribution[]) {
      const calls: string[] = [];
      const header: [any, any][] = [['Time', '']];
      dists.forEach(dist => {
        const name = dist.name;
        const table = withFakeIds(dist.data);
        calls.push(`drawChart('${prefix}-${name}', '${name} (μ = ${dist.mean})', ${JSON.stringify(header.concat(table))});`);
      });
      return calls;

      function withFakeIds(data: number[]): [string, number][] {
        let id = 0;
        return data.map(d => [String(++id), d]);
      }
    }

    const generateQueueHistories = () => {
      return this.simulationResult.queueHistories.map(history => {
        const header: [any, any][] = [['Time', 'Number of jobs']];
        const data: [number, number][] = history.metrics.map(p => ([p.time, p.size]));
        const sortedData: [number, number][] = data
          .sort((a, b) => a[0] - b[0])
          .filter((_, i) => i % 10 === 0);
        return `drawChart('q-${history.id}', '${history.id}', ${JSON.stringify(header.concat(sortedData))}, 'Line');`;
      });
    };
    return `
<html>
<head>
  <link href="https://unpkg.com/blueprint-css@3.1.3/dist/blueprint.min.css" rel="stylesheet" />
  <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
  <script type="text/javascript">
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawCharts);

    function drawChart(id, title, table, type) {
      var data = google.visualization.arrayToDataTable(table);
      var options = {
        title: title,
        hAxis: {
          title: 'Time',
          titleTextStyle: {
            italic: false
          }
        },
      };
      var chart = type === 'Line' ? new google.visualization.LineChart(document.getElementById(id)) : new google.visualization.Histogram(document.getElementById(id));
      chart.draw(data, options);
    }

    function drawCharts() {
      ${generateCalls()}

    }
  </script>
</head>
<body>
<h1>Batch simulation report</h1>
<h2>Service time distributions by share identifier</h2>

<div bp="grid 3">
${generateDivs('si', this.simulationResult.timesBySI).join('')}
</div>

<h2>Service time distributions by job definition</h2>
<div bp="grid 3">
${generateDivs('jd', this.simulationResult.timesByJD).join('')}
</div>

<h2>Queue histories</h2>
<div bp="full-width">
 ${generateQueueDivs().join('')}
</div>

</body>
</html>`;
  }
}


