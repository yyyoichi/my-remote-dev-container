#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DevInstanceCdkStack } from '../lib/dev-instance-cdk-stack';
import { WireGuardVpnStack } from '../lib/wire-guard-cdk-stack';
import * as dotenv from 'dotenv';
import { IamCdkStack } from '../lib/access-iam-cdk-stack';
dotenv.config();

const CIDR = process.env.CIDR || '10.11.11.0/16';
const UDP_PORT = parseInt(process.env.UDP_PORT || '51820', 10);

const app = new cdk.App();
new WireGuardVpnStack(app, 'WireGuardVpnStack', {
  env: { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT },
  cidr: CIDR,
  udpPort: UDP_PORT,
});

const vpcId = process.env.VPC_ID;
if (!vpcId) {
  console.warn('VPC_ID is not set. Skipping DevInstanceCdkStack.');
}
new DevInstanceCdkStack(app, 'DevInstanceCdkStack', {
  env: { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT },
  vpcId: vpcId!,
  cidr: CIDR,
});

const wireGuardInstanceId = process.env.WIREGUARD_INSTANCE_ID;
if (!wireGuardInstanceId) {
  console.warn('WIREGUARD_INSTANCE_ID is not set. Skipping IamCdkStack.');
}
const devInstanceId = process.env.DEV_INSTANCE_ID;
if (!devInstanceId) {
  console.warn('DEV_INSTANCE_ID is not set. Skipping IamCdkStack.');
}
new IamCdkStack(app, 'IamCdkStack', {
  env: { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT },
  wireGuardInstanceId: wireGuardInstanceId!,
  devInstanceId: devInstanceId!,
});