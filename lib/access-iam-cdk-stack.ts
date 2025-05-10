import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface IamCdkStackProps extends cdk.StackProps {
  wireGuardInstanceId: string;
  devInstanceId: string;
}

export class IamCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IamCdkStackProps) {
    super(scope, id, props);

    const accountId = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    const ec2PolicyStatement = new iam.PolicyStatement({
      actions: ['ec2:DescribeInstances', 'ec2:StartInstances', 'ec2:StopInstances'],
      resources: [
        `arn:aws:ec2:${region}:${accountId}:instance/${props.wireGuardInstanceId}`,
        `arn:aws:ec2:${region}:${accountId}:instance/${props.devInstanceId}`,
      ],
    });
    const ec2AccessPolicy = new iam.Policy(this, 'DevelopmentInstanceAccessPolicy', {
      statements: [ec2PolicyStatement],
    });
    const cliUser = new iam.User(this, 'DevelopmentInstanceAccessUser');
    cliUser.attachInlinePolicy(ec2AccessPolicy);

  }
}
