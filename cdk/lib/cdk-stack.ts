import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { Duration } from '@aws-cdk/core';

export class SquareNumberStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const squareNumberLambdaFunction = new lambda.Function(this, 'squareNumberLambdaFunction', {
      code: lambda.Code.fromAsset('lambda.zip'),
      handler: 'SquareNumber.handler',
      runtime: lambda.Runtime.PROVIDED,
      tracing: lambda.Tracing.ACTIVE
    })
  }
}
