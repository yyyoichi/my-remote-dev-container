#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DevelopmentInstanceCdkStack } from '../lib/development-instance-cdk-stack';
import { WireGuardVpnStack } from '../lib/wire-guard-cdk-stack';

const CIDR = process.env.CIDR || '10.11.11.0/16';

const app = new cdk.App();
new WireGuardVpnStack(app, 'WireGuardVpnStack', {
  env: {region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT},
  cidr: CIDR,
});
new DevelopmentInstanceCdkStack(app, 'DevelopmentInstanceCdkStack', {
  env: {region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT}
});