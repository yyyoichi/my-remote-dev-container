#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DevelopmentInstanceCdkStack } from '../lib/development-instance-cdk-stack';

const app = new cdk.App();
new DevelopmentInstanceCdkStack(app, 'DevelopmentInstanceCdkStack', {
  env: {region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT}
});