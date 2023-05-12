const { typescript } = require('projen');
const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'aws-batch-simulator',
  deps: [
  ],
  description: 'A client-side tool to simulate the behavior of an AWS Batch application',
  devDeps: ['aws-cdk-lib', 'constructs', 'ts-node'],
  packageName: 'aws-batch-simulator',
  gitignore: ['.idea'],
  peerDeps: ['aws-cdk-lib', '@aws-cdk/aws-batch-alpha', 'constructs'],
  releaseToNpm: true,
  repository: 'https://github.com/otaviomacedo/aws-batch-simulator.git',
  keywords: ['aws', 'batch', 'simulation', 'queueing', 'cdk', 'stochastic', 'markov'],
});
project.synth();