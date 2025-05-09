import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface DevInstanceCdkStackProps extends cdk.StackProps {
  vpcId: string;
  cidr: string;
  ec2InstanceProps?: Omit<ec2.InstanceProps, 'vpc' | 'vpcSubnets' | 'securityGroup' | 'keyPair'>;
}

export class DevInstanceCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DevInstanceCdkStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'DevVpc', {
      vpcId: props.vpcId,
    });

    const securityGroup = new ec2.SecurityGroup(this, 'DevInstanceSG', {
      vpc,
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.ipv4(props.cidr), ec2.Port.tcp(22), 'Allow SSH from VPC CIDR');

    const keyPair = new ec2.KeyPair(this, 'DevInstanceKeyPair', {
      type: ec2.KeyPairType.RSA,
      format: ec2.KeyPairFormat.PEM,
    });
    keyPair.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    const instance = new ec2.Instance(this, 'DevInstance', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: securityGroup,
      keyPair: keyPair,
      requireImdsv2: true,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(20),
        },
      ],
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.G4DN, ec2.InstanceSize.XLARGE),
      machineImage: ec2.MachineImage.genericLinux({
        // Deep Learning AMI GPU PyTorch 1.13.1 (Ubuntu 20.04) 20230518
        [props.env?.region!]: 'ami-00e3e6712b8609e0d',
      }),
    });

    new cdk.CfnOutput(this, 'DevInstanceId', {
      value: instance.instanceId,
      description: 'Instance ID of the Dev instance',
    });
    new cdk.CfnOutput(this, 'GetDevInstanceSSHKeyCommand', {
      value: `aws ssm get-parameter --name /ec2/keypair/${keyPair.keyPairId} --region ${this.region} --with-decryption --query Parameter.Value --output text`,
    });
  }
}
