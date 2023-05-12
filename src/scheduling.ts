import * as batch from '@aws-cdk/aws-batch-alpha';
import { Share } from '@aws-cdk/aws-batch-alpha';
import { IResolvable, Stack, Token } from 'aws-cdk-lib';
import * as cfnBatch from 'aws-cdk-lib/aws-batch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { EventLoop, EventType } from './events';
import { Job } from './job';
import { RouletteWheel } from './random';

export const capacities: Map<string, number> = new Map(Object.entries({
  'a1.2xlarge': 8,
  'a1.4xlarge': 16,
  'a1.large': 2,
  'a1.medium': 1,
  'a1.metal': 16,
  'a1.xlarge': 4,
  'c1.medium': 2,
  'c1.xlarge': 8,
  'c3.2xlarge': 8,
  'c3.4xlarge': 16,
  'c3.8xlarge': 32,
  'c3.large': 2,
  'c3.xlarge': 4,
  'c4.2xlarge': 8,
  'c4.4xlarge': 16,
  'c4.8xlarge': 36,
  'c4.large': 2,
  'c4.xlarge': 4,
  'c5.12xlarge': 48,
  'c5.18xlarge': 72,
  'c5.24xlarge': 96,
  'c5.2xlarge': 8,
  'c5.4xlarge': 16,
  'c5.9xlarge': 36,
  'c5.large': 2,
  'c5.metal': 96,
  'c5.xlarge': 4,
  'c5a.12xlarge': 48,
  'c5a.16xlarge': 64,
  'c5a.24xlarge': 96,
  'c5a.2xlarge': 8,
  'c5a.4xlarge': 16,
  'c5a.8xlarge': 32,
  'c5a.large': 2,
  'c5a.xlarge': 4,
  'c5ad.12xlarge': 48,
  'c5ad.16xlarge': 64,
  'c5ad.24xlarge': 96,
  'c5ad.2xlarge': 8,
  'c5ad.4xlarge': 16,
  'c5ad.8xlarge': 32,
  'c5ad.large': 2,
  'c5ad.xlarge': 4,
  'c5d.12xlarge': 48,
  'c5d.18xlarge': 72,
  'c5d.24xlarge': 96,
  'c5d.2xlarge': 8,
  'c5d.4xlarge': 16,
  'c5d.9xlarge': 36,
  'c5d.large': 2,
  'c5d.metal': 96,
  'c5d.xlarge': 4,
  'c5n.18xlarge': 72,
  'c5n.2xlarge': 8,
  'c5n.4xlarge': 16,
  'c5n.9xlarge': 36,
  'c5n.large': 2,
  'c5n.metal': 72,
  'c5n.xlarge': 4,
  'c6a.12xlarge': 48,
  'c6a.16xlarge': 64,
  'c6a.24xlarge': 96,
  'c6a.2xlarge': 8,
  'c6a.32xlarge': 128,
  'c6a.48xlarge': 192,
  'c6a.4xlarge': 16,
  'c6a.8xlarge': 32,
  'c6a.large': 2,
  'c6a.metal': 192,
  'c6a.xlarge': 4,
  'c6g.12xlarge': 48,
  'c6g.16xlarge': 64,
  'c6g.2xlarge': 8,
  'c6g.4xlarge': 16,
  'c6g.8xlarge': 32,
  'c6g.large': 2,
  'c6g.medium': 1,
  'c6g.metal': 64,
  'c6g.xlarge': 4,
  'c6gd.12xlarge': 48,
  'c6gd.16xlarge': 64,
  'c6gd.2xlarge': 8,
  'c6gd.4xlarge': 16,
  'c6gd.8xlarge': 32,
  'c6gd.large': 2,
  'c6gd.medium': 1,
  'c6gd.metal': 64,
  'c6gd.xlarge': 4,
  'c6gn.12xlarge': 48,
  'c6gn.16xlarge': 64,
  'c6gn.2xlarge': 8,
  'c6gn.4xlarge': 16,
  'c6gn.8xlarge': 32,
  'c6gn.large': 2,
  'c6gn.medium': 1,
  'c6gn.xlarge': 4,
  'c6i.12xlarge': 48,
  'c6i.16xlarge': 64,
  'c6i.24xlarge': 96,
  'c6i.2xlarge': 8,
  'c6i.32xlarge': 128,
  'c6i.4xlarge': 16,
  'c6i.8xlarge': 32,
  'c6i.large': 2,
  'c6i.metal': 128,
  'c6i.xlarge': 4,
  'c6id.12xlarge': 48,
  'c6id.16xlarge': 64,
  'c6id.24xlarge': 96,
  'c6id.2xlarge': 8,
  'c6id.32xlarge': 128,
  'c6id.4xlarge': 16,
  'c6id.8xlarge': 32,
  'c6id.large': 2,
  'c6id.metal': 128,
  'c6id.xlarge': 4,
  'c6in.12xlarge': 48,
  'c6in.16xlarge': 64,
  'c6in.24xlarge': 96,
  'c6in.2xlarge': 8,
  'c6in.32xlarge': 128,
  'c6in.4xlarge': 16,
  'c6in.8xlarge': 32,
  'c6in.large': 2,
  'c6in.metal': 128,
  'c6in.xlarge': 4,
  'c7g.12xlarge': 48,
  'c7g.16xlarge': 64,
  'c7g.2xlarge': 8,
  'c7g.4xlarge': 16,
  'c7g.8xlarge': 32,
  'c7g.large': 2,
  'c7g.medium': 1,
  'c7g.metal': 64,
  'c7g.xlarge': 4,
  'd2.2xlarge': 8,
  'd2.4xlarge': 16,
  'd2.8xlarge': 36,
  'd2.xlarge': 4,
  'd3.2xlarge': 8,
  'd3.4xlarge': 16,
  'd3.8xlarge': 32,
  'd3.xlarge': 4,
  'd3en.12xlarge': 48,
  'd3en.2xlarge': 8,
  'd3en.4xlarge': 16,
  'd3en.6xlarge': 24,
  'd3en.8xlarge': 32,
  'd3en.xlarge': 4,
  'dl1.24xlarge': 96,
  'f1.16xlarge': 64,
  'f1.2xlarge': 8,
  'f1.4xlarge': 16,
  'g2.2xlarge': 8,
  'g2.8xlarge': 32,
  'g3.16xlarge': 64,
  'g3.4xlarge': 16,
  'g3.8xlarge': 32,
  'g3s.xlarge': 4,
  'g4ad.16xlarge': 64,
  'g4ad.2xlarge': 8,
  'g4ad.4xlarge': 16,
  'g4ad.8xlarge': 32,
  'g4ad.xlarge': 4,
  'g4dn.12xlarge': 48,
  'g4dn.16xlarge': 64,
  'g4dn.2xlarge': 8,
  'g4dn.4xlarge': 16,
  'g4dn.8xlarge': 32,
  'g4dn.metal': 96,
  'g4dn.xlarge': 4,
  'g5.12xlarge': 48,
  'g5.16xlarge': 64,
  'g5.24xlarge': 96,
  'g5.2xlarge': 8,
  'g5.48xlarge': 192,
  'g5.4xlarge': 16,
  'g5.8xlarge': 32,
  'g5.xlarge': 4,
  'g5g.16xlarge': 64,
  'g5g.2xlarge': 8,
  'g5g.4xlarge': 16,
  'g5g.8xlarge': 32,
  'g5g.metal': 64,
  'g5g.xlarge': 4,
  'h1.16xlarge': 64,
  'h1.2xlarge': 8,
  'h1.4xlarge': 16,
  'h1.8xlarge': 32,
  'i2.2xlarge': 8,
  'i2.4xlarge': 16,
  'i2.8xlarge': 32,
  'i2.xlarge': 4,
  'i3.16xlarge': 64,
  'i3.2xlarge': 8,
  'i3.4xlarge': 16,
  'i3.8xlarge': 32,
  'i3.large': 2,
  'i3.metal': 72,
  'i3.xlarge': 4,
  'i3en.12xlarge': 48,
  'i3en.24xlarge': 96,
  'i3en.2xlarge': 8,
  'i3en.3xlarge': 12,
  'i3en.6xlarge': 24,
  'i3en.large': 2,
  'i3en.metal': 96,
  'i3en.xlarge': 4,
  'i4i.16xlarge': 64,
  'i4i.2xlarge': 8,
  'i4i.32xlarge': 128,
  'i4i.4xlarge': 16,
  'i4i.8xlarge': 32,
  'i4i.large': 2,
  'i4i.metal': 128,
  'i4i.xlarge': 4,
  'im4gn.16xlarge': 64,
  'im4gn.2xlarge': 8,
  'im4gn.4xlarge': 16,
  'im4gn.8xlarge': 32,
  'im4gn.large': 2,
  'im4gn.xlarge': 4,
  'inf1.24xlarge': 96,
  'inf1.2xlarge': 8,
  'inf1.6xlarge': 24,
  'inf1.xlarge': 4,
  'inf2.24xlarge': 96,
  'inf2.48xlarge': 192,
  'inf2.8xlarge': 32,
  'inf2.xlarge': 4,
  'is4gen.2xlarge': 8,
  'is4gen.4xlarge': 16,
  'is4gen.8xlarge': 32,
  'is4gen.large': 2,
  'is4gen.medium': 1,
  'is4gen.xlarge': 4,
  'm1.large': 2,
  'm1.medium': 1,
  'm1.small': 1,
  'm1.xlarge': 4,
  'm2.2xlarge': 4,
  'm2.4xlarge': 8,
  'm2.xlarge': 2,
  'm3.2xlarge': 8,
  'm3.large': 2,
  'm3.medium': 1,
  'm3.xlarge': 4,
  'm4.10xlarge': 40,
  'm4.16xlarge': 64,
  'm4.2xlarge': 8,
  'm4.4xlarge': 16,
  'm4.large': 2,
  'm4.xlarge': 4,
  'm5.12xlarge': 48,
  'm5.16xlarge': 64,
  'm5.24xlarge': 96,
  'm5.2xlarge': 8,
  'm5.4xlarge': 16,
  'm5.8xlarge': 32,
  'm5.large': 2,
  'm5.metal': 96,
  'm5.xlarge': 4,
  'm5a.12xlarge': 48,
  'm5a.16xlarge': 64,
  'm5a.24xlarge': 96,
  'm5a.2xlarge': 8,
  'm5a.4xlarge': 16,
  'm5a.8xlarge': 32,
  'm5a.large': 2,
  'm5a.xlarge': 4,
  'm5ad.12xlarge': 48,
  'm5ad.16xlarge': 64,
  'm5ad.24xlarge': 96,
  'm5ad.2xlarge': 8,
  'm5ad.4xlarge': 16,
  'm5ad.8xlarge': 32,
  'm5ad.large': 2,
  'm5ad.xlarge': 4,
  'm5d.12xlarge': 48,
  'm5d.16xlarge': 64,
  'm5d.24xlarge': 96,
  'm5d.2xlarge': 8,
  'm5d.4xlarge': 16,
  'm5d.8xlarge': 32,
  'm5d.large': 2,
  'm5d.metal': 96,
  'm5d.xlarge': 4,
  'm5dn.12xlarge': 48,
  'm5dn.16xlarge': 64,
  'm5dn.24xlarge': 96,
  'm5dn.2xlarge': 8,
  'm5dn.4xlarge': 16,
  'm5dn.8xlarge': 32,
  'm5dn.large': 2,
  'm5dn.metal': 96,
  'm5dn.xlarge': 4,
  'm5n.12xlarge': 48,
  'm5n.16xlarge': 64,
  'm5n.24xlarge': 96,
  'm5n.2xlarge': 8,
  'm5n.4xlarge': 16,
  'm5n.8xlarge': 32,
  'm5n.large': 2,
  'm5n.metal': 96,
  'm5n.xlarge': 4,
  'm5zn.12xlarge': 48,
  'm5zn.2xlarge': 8,
  'm5zn.3xlarge': 12,
  'm5zn.6xlarge': 24,
  'm5zn.large': 2,
  'm5zn.metal': 48,
  'm5zn.xlarge': 4,
  'm6a.12xlarge': 48,
  'm6a.16xlarge': 64,
  'm6a.24xlarge': 96,
  'm6a.2xlarge': 8,
  'm6a.32xlarge': 128,
  'm6a.48xlarge': 192,
  'm6a.4xlarge': 16,
  'm6a.8xlarge': 32,
  'm6a.large': 2,
  'm6a.metal': 192,
  'm6a.xlarge': 4,
  'm6g.12xlarge': 48,
  'm6g.16xlarge': 64,
  'm6g.2xlarge': 8,
  'm6g.4xlarge': 16,
  'm6g.8xlarge': 32,
  'm6g.large': 2,
  'm6g.medium': 1,
  'm6g.metal': 64,
  'm6g.xlarge': 4,
  'm6gd.12xlarge': 48,
  'm6gd.16xlarge': 64,
  'm6gd.2xlarge': 8,
  'm6gd.4xlarge': 16,
  'm6gd.8xlarge': 32,
  'm6gd.large': 2,
  'm6gd.medium': 1,
  'm6gd.metal': 64,
  'm6gd.xlarge': 4,
  'm6i.12xlarge': 48,
  'm6i.16xlarge': 64,
  'm6i.24xlarge': 96,
  'm6i.2xlarge': 8,
  'm6i.32xlarge': 128,
  'm6i.4xlarge': 16,
  'm6i.8xlarge': 32,
  'm6i.large': 2,
  'm6i.metal': 128,
  'm6i.xlarge': 4,
  'm6id.12xlarge': 48,
  'm6id.16xlarge': 64,
  'm6id.24xlarge': 96,
  'm6id.2xlarge': 8,
  'm6id.32xlarge': 128,
  'm6id.4xlarge': 16,
  'm6id.8xlarge': 32,
  'm6id.large': 2,
  'm6id.metal': 128,
  'm6id.xlarge': 4,
  'm6idn.12xlarge': 48,
  'm6idn.16xlarge': 64,
  'm6idn.24xlarge': 96,
  'm6idn.2xlarge': 8,
  'm6idn.32xlarge': 128,
  'm6idn.4xlarge': 16,
  'm6idn.8xlarge': 32,
  'm6idn.large': 2,
  'm6idn.metal': 128,
  'm6idn.xlarge': 4,
  'm6in.12xlarge': 48,
  'm6in.16xlarge': 64,
  'm6in.24xlarge': 96,
  'm6in.2xlarge': 8,
  'm6in.32xlarge': 128,
  'm6in.4xlarge': 16,
  'm6in.8xlarge': 32,
  'm6in.large': 2,
  'm6in.metal': 128,
  'm6in.xlarge': 4,
  'm7g.12xlarge': 48,
  'm7g.16xlarge': 64,
  'm7g.2xlarge': 8,
  'm7g.4xlarge': 16,
  'm7g.8xlarge': 32,
  'm7g.large': 2,
  'm7g.medium': 1,
  'm7g.metal': 64,
  'm7g.xlarge': 4,
  'mac1.metal': 12,
  'mac2.metal': 8,
  'p2.16xlarge': 64,
  'p2.8xlarge': 32,
  'p2.xlarge': 4,
  'p3.16xlarge': 64,
  'p3.2xlarge': 8,
  'p3.8xlarge': 32,
  'p3dn.24xlarge': 96,
  'p4d.24xlarge': 96,
  'r3.2xlarge': 8,
  'r3.4xlarge': 16,
  'r3.8xlarge': 32,
  'r3.large': 2,
  'r3.xlarge': 4,
  'r4.16xlarge': 64,
  'r4.2xlarge': 8,
  'r4.4xlarge': 16,
  'r4.8xlarge': 32,
  'r4.large': 2,
  'r4.xlarge': 4,
  'r5.12xlarge': 48,
  'r5.16xlarge': 64,
  'r5.24xlarge': 96,
  'r5.2xlarge': 8,
  'r5.4xlarge': 16,
  'r5.8xlarge': 32,
  'r5.large': 2,
  'r5.metal': 96,
  'r5.xlarge': 4,
  'r5a.12xlarge': 48,
  'r5a.16xlarge': 64,
  'r5a.24xlarge': 96,
  'r5a.2xlarge': 8,
  'r5a.4xlarge': 16,
  'r5a.8xlarge': 32,
  'r5a.large': 2,
  'r5a.xlarge': 4,
  'r5ad.12xlarge': 48,
  'r5ad.16xlarge': 64,
  'r5ad.24xlarge': 96,
  'r5ad.2xlarge': 8,
  'r5ad.4xlarge': 16,
  'r5ad.8xlarge': 32,
  'r5ad.large': 2,
  'r5ad.xlarge': 4,
  'r5b.12xlarge': 48,
  'r5b.16xlarge': 64,
  'r5b.24xlarge': 96,
  'r5b.2xlarge': 8,
  'r5b.4xlarge': 16,
  'r5b.8xlarge': 32,
  'r5b.large': 2,
  'r5b.metal': 96,
  'r5b.xlarge': 4,
  'r5d.12xlarge': 48,
  'r5d.16xlarge': 64,
  'r5d.24xlarge': 96,
  'r5d.2xlarge': 8,
  'r5d.4xlarge': 16,
  'r5d.8xlarge': 32,
  'r5d.large': 2,
  'r5d.metal': 96,
  'r5d.xlarge': 4,
  'r5dn.12xlarge': 48,
  'r5dn.16xlarge': 64,
  'r5dn.24xlarge': 96,
  'r5dn.2xlarge': 8,
  'r5dn.4xlarge': 16,
  'r5dn.8xlarge': 32,
  'r5dn.large': 2,
  'r5dn.metal': 96,
  'r5dn.xlarge': 4,
  'r5n.12xlarge': 48,
  'r5n.16xlarge': 64,
  'r5n.24xlarge': 96,
  'r5n.2xlarge': 8,
  'r5n.4xlarge': 16,
  'r5n.8xlarge': 32,
  'r5n.large': 2,
  'r5n.metal': 96,
  'r5n.xlarge': 4,
  'r6a.12xlarge': 48,
  'r6a.16xlarge': 64,
  'r6a.24xlarge': 96,
  'r6a.2xlarge': 8,
  'r6a.32xlarge': 128,
  'r6a.48xlarge': 192,
  'r6a.4xlarge': 16,
  'r6a.8xlarge': 32,
  'r6a.large': 2,
  'r6a.metal': 192,
  'r6a.xlarge': 4,
  'r6g.12xlarge': 48,
  'r6g.16xlarge': 64,
  'r6g.2xlarge': 8,
  'r6g.4xlarge': 16,
  'r6g.8xlarge': 32,
  'r6g.large': 2,
  'r6g.medium': 1,
  'r6g.metal': 64,
  'r6g.xlarge': 4,
  'r6gd.12xlarge': 48,
  'r6gd.16xlarge': 64,
  'r6gd.2xlarge': 8,
  'r6gd.4xlarge': 16,
  'r6gd.8xlarge': 32,
  'r6gd.large': 2,
  'r6gd.medium': 1,
  'r6gd.metal': 64,
  'r6gd.xlarge': 4,
  'r6i.12xlarge': 48,
  'r6i.16xlarge': 64,
  'r6i.24xlarge': 96,
  'r6i.2xlarge': 8,
  'r6i.32xlarge': 128,
  'r6i.4xlarge': 16,
  'r6i.8xlarge': 32,
  'r6i.large': 2,
  'r6i.metal': 128,
  'r6i.xlarge': 4,
  'r6id.12xlarge': 48,
  'r6id.16xlarge': 64,
  'r6id.24xlarge': 96,
  'r6id.2xlarge': 8,
  'r6id.32xlarge': 128,
  'r6id.4xlarge': 16,
  'r6id.8xlarge': 32,
  'r6id.large': 2,
  'r6id.metal': 128,
  'r6id.xlarge': 4,
  'r6idn.12xlarge': 48,
  'r6idn.16xlarge': 64,
  'r6idn.24xlarge': 96,
  'r6idn.2xlarge': 8,
  'r6idn.32xlarge': 128,
  'r6idn.4xlarge': 16,
  'r6idn.8xlarge': 32,
  'r6idn.large': 2,
  'r6idn.metal': 128,
  'r6idn.xlarge': 4,
  'r6in.12xlarge': 48,
  'r6in.16xlarge': 64,
  'r6in.24xlarge': 96,
  'r6in.2xlarge': 8,
  'r6in.32xlarge': 128,
  'r6in.4xlarge': 16,
  'r6in.8xlarge': 32,
  'r6in.large': 2,
  'r6in.metal': 128,
  'r6in.xlarge': 4,
  'r7g.12xlarge': 48,
  'r7g.16xlarge': 64,
  'r7g.2xlarge': 8,
  'r7g.4xlarge': 16,
  'r7g.8xlarge': 32,
  'r7g.large': 2,
  'r7g.medium': 1,
  'r7g.metal': 64,
  'r7g.xlarge': 4,
  't1.micro': 1,
  't2.2xlarge': 8,
  't2.large': 2,
  't2.medium': 2,
  't2.micro': 1,
  't2.nano': 1,
  't2.small': 1,
  't2.xlarge': 4,
  't3.2xlarge': 8,
  't3.large': 2,
  't3.medium': 2,
  't3.micro': 2,
  't3.nano': 2,
  't3.small': 2,
  't3.xlarge': 4,
  't3a.2xlarge': 8,
  't3a.large': 2,
  't3a.medium': 2,
  't3a.micro': 2,
  't3a.nano': 2,
  't3a.small': 2,
  't3a.xlarge': 4,
  't4g.2xlarge': 8,
  't4g.large': 2,
  't4g.medium': 2,
  't4g.micro': 2,
  't4g.nano': 2,
  't4g.small': 2,
  't4g.xlarge': 4,
  'trn1.2xlarge': 8,
  'trn1.32xlarge': 128,
  'trn1n.32xlarge': 128,
  'u-12tb1.112xlarge': 448,
  'u-18tb1.112xlarge': 448,
  'u-24tb1.112xlarge': 448,
  'u-3tb1.56xlarge': 224,
  'u-6tb1.112xlarge': 448,
  'u-6tb1.56xlarge': 224,
  'u-9tb1.112xlarge': 448,
  'vt1.24xlarge': 96,
  'vt1.3xlarge': 12,
  'vt1.6xlarge': 24,
  'x1.16xlarge': 64,
  'x1.32xlarge': 128,
  'x1e.16xlarge': 64,
  'x1e.2xlarge': 8,
  'x1e.32xlarge': 128,
  'x1e.4xlarge': 16,
  'x1e.8xlarge': 32,
  'x1e.xlarge': 4,
  'x2gd.12xlarge': 48,
  'x2gd.16xlarge': 64,
  'x2gd.2xlarge': 8,
  'x2gd.4xlarge': 16,
  'x2gd.8xlarge': 32,
  'x2gd.large': 2,
  'x2gd.medium': 1,
  'x2gd.metal': 64,
  'x2gd.xlarge': 4,
  'x2idn.16xlarge': 64,
  'x2idn.24xlarge': 96,
  'x2idn.32xlarge': 128,
  'x2idn.metal': 128,
  'x2iedn.16xlarge': 64,
  'x2iedn.24xlarge': 96,
  'x2iedn.2xlarge': 8,
  'x2iedn.32xlarge': 128,
  'x2iedn.4xlarge': 16,
  'x2iedn.8xlarge': 32,
  'x2iedn.metal': 128,
  'x2iedn.xlarge': 4,
  'x2iezn.12xlarge': 48,
  'x2iezn.2xlarge': 8,
  'x2iezn.4xlarge': 16,
  'x2iezn.6xlarge': 24,
  'x2iezn.8xlarge': 32,
  'x2iezn.metal': 48,
  'z1d.12xlarge': 48,
  'z1d.2xlarge': 8,
  'z1d.3xlarge': 12,
  'z1d.6xlarge': 24,
  'z1d.large': 2,
  'z1d.metal': 48,
  'z1d.xlarge': 4,
}));

export interface ExecutionMetrics {
  /**
   * The job that was executed.
   */
  readonly job: Job;

  /**
   * The total time the job execution took, from creation to completion.
   */
  readonly time: number;
}

export interface IComputeEnvironmentListener {
  notify(): void;
}

export interface IComputeEnvironment {
  /**
   * Whether this environment can execute the given job, respecting a
   * reserved capacity ratio.
   *
   * @param job the job to simulate execution for.
   * @param reservedRatio A number in the interval [0, 1] that represents
   * the ratio of reserved capacity to total capacity.
   */
  canExecute(job: Job, reservedRatio: number): boolean;

  execute(job: Job): ExecutionMetrics;

  addListener(listener: IComputeEnvironmentListener): void;
}

export abstract class BaseComputeEnvironment implements IComputeEnvironment {
  protected readonly listeners: IComputeEnvironmentListener[] = [];

  addListener(listener: IComputeEnvironmentListener): void {
    this.listeners.push(listener);
  }

  protected notifyListeners(): void {
    for (const listener of this.listeners) {
      listener.notify();
    }
  }

  abstract canExecute(job: Job, reservedRatio: number): boolean;

  abstract execute(job: Job): ExecutionMetrics;
}

interface FargateEnvironmentProps {
  readonly environment: batch.IFargateComputeEnvironment;
  readonly eventLoop: EventLoop;
}

export class FargateComputeEnvironment extends BaseComputeEnvironment {
  private usedCapacity: number;
  private readonly eventLoop: EventLoop;

  constructor(private readonly props: FargateEnvironmentProps) {
    super();
    this.usedCapacity = 0;
    this.eventLoop = props.eventLoop;
  }

  get maxvCpus(): number {
    return this.props.environment.maxvCpus;
  }

  execute(job: Job): ExecutionMetrics {
    this.usedCapacity += job.vCpus;
    const finishTime = this.eventLoop.currentTime + job.runningTime;

    this.props.eventLoop.put({
      time: finishTime,
      type: EventType.JOB_COMPLETED,
      handler: () => {
        this.usedCapacity -= job.vCpus;
        this.notifyListeners();
      },
    });

    return {
      job,
      time: finishTime - job.insertTime,
    };
  }

  canExecute(job: Job, reservedRatio: number): boolean {
    const actualMaxvCpus = this.maxvCpus * (1 - reservedRatio);
    return this.usedCapacity + job.vCpus <= actualMaxvCpus;
  }
}

interface Ec2ComputeEnvironmentProps {
  readonly environment: batch.ManagedEc2EcsComputeEnvironment | batch.ManagedEc2EksComputeEnvironment;
  readonly eventLoop: EventLoop;
}

interface ComputeSlot {
  readonly instanceType: string;
  capacity: number;
}

export class Ec2ComputeEnvironment extends BaseComputeEnvironment {
  private readonly eventLoop: EventLoop;
  private readonly slots: ComputeSlot[];

  constructor(private readonly props: Ec2ComputeEnvironmentProps) {
    super();
    this.eventLoop = props.eventLoop;
    this.slots = this.extractSlots();
  }

  get maxvCpus(): number {
    return this.props.environment.maxvCpus;
  }

  canExecute(job: Job, reservedRatio: number): boolean {
    const actualMaxvCpus = this.maxvCpus * (1 - reservedRatio);
    return job.vCpus + this.totalUsedCapacity() <= actualMaxvCpus && this.findBestSlot(job) != null;
  }

  execute(job: Job): ExecutionMetrics {
    const slot = this.findBestSlot(job);

    if (slot == null) {
      throw new Error(`No available compute environment that can execute a job that requires ${job.vCpus} vCPUs`);
    }

    slot.capacity -= job.vCpus;

    // TODO Remove the duplication between this and FargateComputeEnvironment
    const finishTime = this.eventLoop.currentTime + job.runningTime;

    this.props.eventLoop.put({
      time: finishTime,
      type: EventType.JOB_COMPLETED,
      handler: () => {
        slot.capacity += job.vCpus;
        this.notifyListeners();
      },
    });

    return {
      time: finishTime - job.insertTime,
      job,
    };
  }

  private extractSlots(): ComputeSlot[] {
    const env = this.props.environment;
    return (this.instanceClasses())
      .map(instanceClassToType)
      .concat((env.instanceTypes ?? []).map(t => t.toString()))
      .map(makeSlot)
      .sort(byCapacity);
  }

  private instanceClasses() {
    const env = this.props.environment;
    const base = env.instanceClasses ?? [];
    return this.usesOptimizedInstanceClasses()
      ? base.concat([ec2.InstanceClass.C4, ec2.InstanceClass.M4, ec2.InstanceClass.R4])
      : base;
  }

  private usesOptimizedInstanceClasses(): boolean {
    const env = this.props.environment.node.defaultChild as cfnBatch.CfnComputeEnvironment;
    if (!isResolvableObject(env.computeResources)) {
      const bar = Token.isUnresolved(env.computeResources?.instanceTypes)
        ? Stack.of(env).resolve(env.computeResources?.instanceTypes)
        : env.computeResources?.instanceTypes;
      return Array.isArray(bar) && bar.includes('optimal');
    }
    // TODO Can we resolve it?
    return false;
  }

  private findBestSlot(job: Job): ComputeSlot | undefined {
    switch (this.props.environment.allocationStrategy) {
      case batch.AllocationStrategy.BEST_FIT:
        const candidate = this.slots.find(slot =>
          capacities.get(slot.instanceType.toString())! >= job.vCpus);

        return candidate != null && candidate.capacity >= job.vCpus
          ? candidate
          : undefined;

      case batch.AllocationStrategy.BEST_FIT_PROGRESSIVE:
        return this.slots.find(slot => slot.capacity >= job.vCpus);

      case batch.AllocationStrategy.SPOT_CAPACITY_OPTIMIZED:
        throw new Error('Environments with spot capacity are not supported yet');

      default:
        throw new Error(`Unknown allocation strategy: ${this.props.environment.allocationStrategy}`);
    }
  }

  private totalUsedCapacity(): number {
    return this.slots.reduce((acc, slot) => acc + used(slot), 0);

    function used(slot: ComputeSlot): number {
      const total = capacities.get(slot.instanceType.toString())!;
      return total - slot.capacity;
    }
  }
}

function instanceClassToType(clazz: ec2.InstanceClass): string {
  const classes = [...capacities.entries()]
    .filter(([name, _]) => name.startsWith(`${clazz}.`))
    .sort((a, b) => a[1] - b[1]);

  // We don't know what size Batch will choose, so we're picking somewhere in the middle
  const mid = Math.floor(classes.length / 2);
  return classes[mid][0];
}

function makeSlot(instanceType: string): ComputeSlot {
  return {
    instanceType,
    capacity: capacities.get(instanceType)!,
  };
}

function byCapacity(a: ComputeSlot, b: ComputeSlot): number {
  return a.capacity - b.capacity;
}

export function isResolvableObject(x: any): x is IResolvable {
  return typeof (x) === 'object' && x !== null && typeof x.resolve === 'function';
}

export interface QueueMetrics {
  readonly time: number;
  readonly size: number;
}

export interface QueueHistory {
  id: string;
  metrics: QueueMetrics[];
}

export interface JobQueueProps {
  readonly computeEnvironments: IComputeEnvironment[];
  readonly schedulingPolicy: ISchedulingPolicy;
  readonly eventLoop: EventLoop;
  readonly queueId: string;
}

export class JobQueue implements IComputeEnvironmentListener {
  private readonly computeEnvironments: IComputeEnvironment[];
  private readonly schedulingPolicy: ISchedulingPolicy;
  private readonly eventLoop: EventLoop;
  private readonly jobs: Job[] = [];

  public readonly executionMetrics: ExecutionMetrics[] = [];
  public readonly queueMetrics: QueueMetrics[] = [];
  public readonly queueId: string;

  constructor(props: JobQueueProps) {
    this.computeEnvironments = props.computeEnvironments;
    props.computeEnvironments.forEach(env => env.addListener(this));
    this.schedulingPolicy = props.schedulingPolicy;
    this.eventLoop = props.eventLoop;
    this.queueId = props.queueId;
  }

  push(job: Job): void {
    this.jobs.push(job);
    this.notify();
  }

  notify() {
    if (this.jobs.length === 0) {
      // Nothing to do
      return;
    }

    const schedulingPolicy = this.schedulingPolicy;
    const reservedRatio = schedulingPolicy.reservedRatio(this.jobs);
    for (const computeEnvironment of this.computeEnvironments) {
      const candidate = schedulingPolicy.pickFrom(this.jobs);
      if (computeEnvironment.canExecute(candidate, reservedRatio)) {
        this.jobs.splice(this.jobs.indexOf(candidate), 1);

        this.queueMetrics.push({
          time: this.eventLoop.currentTime,
          size: this.jobs.length,
        });

        const metrics = computeEnvironment.execute(candidate);
        this.executionMetrics.push(metrics);
        break;
      }
    }
  }
}

export interface ISchedulingPolicy {
  reservedRatio(jobs: Job[]): number;

  pickFrom(jobs: Job[]): Job;
}

export class FifoSchedulingPolicy implements ISchedulingPolicy {
  pickFrom(jobs: Job[]): Job {
    if (jobs.length === 0) {
      throw new Error('No job to select');
    }
    return jobs[0];
  }

  reservedRatio(_jobs: Job[]): number {
    return 0;
  }
}

export class FairShareSchedulingPolicy implements ISchedulingPolicy {
  private readonly computeReservation: number;

  constructor(private readonly policy?: batch.IFairshareSchedulingPolicy) {
    this.computeReservation = (policy?.computeReservation ?? 0) / 100;
  }

  pickFrom(jobs: Job[]): Job {
    const jobsByShareIdentifier: Record<string, Job> = {};

    for (const job of jobs) {
      const identifier = job.shareIdentifier;
      if (jobsByShareIdentifier[identifier] == null) {
        jobsByShareIdentifier[identifier] = job;
      }
    }

    // The actual algorithm is probably deterministic. But I'm assuming that,
    // in the limit, a randomized algorithm will produce the same result.
    const shares = this.extractShares(jobsByShareIdentifier);
    const relativeWeights = shares.map(s => jobsByShareIdentifier[s.shareIdentifier].vCpus / s.weightFactor);
    const index = new RouletteWheel(relativeWeights).run();
    return jobsByShareIdentifier[shares[index].shareIdentifier];
  }

  private extractShares(jobsByShareIdentifier: Record<string, Job>): Share[] {
    const result: Share[] = [];

    Object.keys(jobsByShareIdentifier).forEach(identifier => {
      const share = this.policy?.shares.find(s => s.shareIdentifier === identifier);
      if (share != null) {
        result.push(share);
      } else {
        // Create a ghost share with the default weight factor
        result.push({
          shareIdentifier: identifier,
          weightFactor: 1,
        });
      }
    });

    return result;
  }

  reservedRatio(jobs: Job[]): number {
    const activeShares = new Set(jobs.map(j => j.shareIdentifier)).size;
    return Math.pow(this.computeReservation, activeShares);
  }
}