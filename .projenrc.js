const { typescript } = require('projen');
const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'aws-batch-simulator',
  deps: [
    '@aws-cdk/aws-batch-alpha@^2.74.0-alpha.0',
    'constructs',
  ],
  description: 'A client-side tool to simulate the behavior of an AWS Batch application',
  devDeps: ['aws-cdk-lib', 'constructs', 'ts-node'],
  packageName: 'aws-batch-simulator',
  gitignore: ['.idea'],
  peerDeps: ['aws-cdk-lib'],
  releaseToNpm: true,
  repository: 'https://github.com/otaviomacedo/aws-batch-simulator.git',
  keywords: ['aws', 'batch', 'simulation', 'queueing', 'cdk', 'stochastic', 'markov'],
});
project.synth();