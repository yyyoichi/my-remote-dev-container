import {
  Stack,
  StackProps,
  aws_ec2 as ec2,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface DevelopmentInstanceCdkStackProps extends StackProps {
}

export class DevelopmentInstanceCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: DevelopmentInstanceCdkStackProps) {
    super(scope, id, props);

    // 既存のVPCを参照
    const vpc = new ec2.Vpc(this, 'DevelpmentIncetanceVpc', {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });


    // NATインスタンス用セキュリティグループ
    const natSg = new ec2.SecurityGroup(this, 'NatInstanceSG', {
      vpc,
      description: 'Security group for NAT instance',
      allowAllOutbound: true,
    });

    natSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    natSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

    // NAT用のロール
    const natRole = new iam.Role(this, 'NatInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'),
      ],
    });

    // NAT用AMI
    const natAmi = ec2.MachineImage.latestAmazonLinux2023();

    // NATインスタンス
    const natInstance = new ec2.Instance(this, 'NatInstance', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.NANO),
      machineImage: natAmi,
      securityGroup: natSg,
      role: natRole,
      sourceDestCheck: false, // NATには無効化が必要
    });

    // Debian EC2インスタンスのセキュリティグループ
    const ec2Sg = new ec2.SecurityGroup(this, 'Ec2InstanceSG', {
      vpc,
      allowAllOutbound: true,
    });
    ec2Sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH from anywhere');

    // Debian用AMI
    const debianAmi = ec2.MachineImage.genericLinux({
      [props.env?.region!]: 'ami-00a7d6f3b78d70c5a',
    });

    // Debian EC2インスタンス（Dockerインストール前提）
    const instance = new ec2.Instance(this, 'DebianEc2ContainerHost', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: debianAmi,
      securityGroup: ec2Sg,
      keyPair: new ec2.KeyPair(this, 'DevelopmentKey'),
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(20),
        },
      ],
    });

    // ルートテーブルの更新（Private SubnetからNATへ）
    vpc.privateSubnets.forEach((subnet, index) => {
      // 新しいルートテーブルを作成
      const routeTable = new ec2.CfnRouteTable(this, `PrivateRouteTable-${index}`, {
        vpcId: vpc.vpcId,
      });

      // サブネットとルートテーブルを関連付け
      new ec2.CfnSubnetRouteTableAssociation(this, `PrivateSubnetAssoc-${index}`, {
        subnetId: subnet.subnetId,
        routeTableId: routeTable.ref,
      });

      // ルートテーブルにNATインスタンスへのルートを追加
      new ec2.CfnRoute(this, `PrivateRoute-${index}`, {
        routeTableId: routeTable.ref,
        destinationCidrBlock: '0.0.0.0/0',
        instanceId: natInstance.instanceId,
      });
    });
  }
}
