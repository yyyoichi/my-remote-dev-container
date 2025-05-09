import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface DevelopmentInstanceCdkStackProps extends cdk.StackProps {
  // like 10.11.11.0/16
  cidr: string;
}

export class WireGuardVpnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DevelopmentInstanceCdkStackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'DevelpmentIncetanceVpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.cidr),
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // セキュリティグループの作成
    const securityGroup = new ec2.SecurityGroup(this, 'WireGuardSG', {
      vpc,
      description: 'Allow SSH and WireGuard',
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(51820), 'Allow WireGuard');
    const noSshsecurityGroup = new ec2.SecurityGroup(this, 'NoSshWireGuardSG', {
      vpc,
      description: 'Allow WireGuard',
      allowAllOutbound: true,
    });
    noSshsecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(51820), 'Allow WireGuard');

    const keyPair = new ec2.KeyPair(this, 'DevelopInstanceKeyPair', {
      type: ec2.KeyPairType.RSA,
      format: ec2.KeyPairFormat.PEM,
    });
    keyPair.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    // EC2 インスタンスの作成
    const instance = new ec2.Instance(this, 'WireGuardInstance', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.genericLinux({
        // Ubuntu Server 24.04 LTS (HVM) 64 ビット (Arm)
        [props.env?.region!]: 'ami-038e94aea55c0f480',
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup,
      keyPair: keyPair,
    });

    // Elastic IP の作成
    const eip = new ec2.CfnEIP(this, 'WireGuardEIP');
    // Elastic IP を EC2 インスタンスに関連付け
    new ec2.CfnEIPAssociation(this, 'EIPAssociation', {
      allocationId: eip.attrAllocationId,
      instanceId: instance.instanceId,
    });

    // UserData で WireGuard インストールスクリプトを取得
    instance.addUserData(
      '#!/bin/bash',
      'apt update && apt install -y curl',
    );

    new cdk.CfnOutput(this, 'InstancePublicDns', {
      value: instance.instancePublicDnsName,
      description: 'Public DNS of the WireGuard instance',
    });
    new cdk.CfnOutput(this, 'GetWireGuardSSHKeyCommand', {
      value: `aws ssm get-parameter --name /ec2/keypair/${keyPair.keyPairId} --region ${this.region} --with-decryption --query Parameter.Value --output text`,
    });
    new cdk.CfnOutput(this, 'AllowedIps', {
      value: `10.66.66.0/24,${vpc.vpcCidrBlock}`,
      description: 'Allowed IPs list for generated clients: ',
    });
    new cdk.CfnOutput(this, 'WireGuardInstanceId', {
      value: instance.instanceId,
      description: 'Instance ID of the WireGuard instance',
    });
    new cdk.CfnOutput(this, 'GetBlockSSHCommand', {
      value: `aws ec2 modify-instance-attribute --instance-id ${instance.instanceId} --groups ${noSshsecurityGroup.securityGroupId} --region ${this.region}`,
    });
    new cdk.CfnOutput(this, 'GetAllowSSHCommand', {
      value: `aws ec2 modify-instance-attribute --instance-id ${instance.instanceId} --groups ${securityGroup.securityGroupId} --region ${this.region}`,
    });
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
    });
  }
}
