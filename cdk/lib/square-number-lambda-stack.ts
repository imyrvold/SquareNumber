import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { CfnOutput } from '@aws-cdk/core';

export class SquareNumberLambdaStack extends cdk.Stack {
  public readonly urlOutput: CfnOutput;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const squareNumberLambdaFunction = new lambda.Function(this, 'squareNumberLambdaFunction', {
      code: lambda.Code.fromAsset('lambda.zip'),
      handler: 'SquareNumber.handler',
      runtime: lambda.Runtime.PROVIDED,
      tracing: lambda.Tracing.ACTIVE
    })

    const api = new RestApi(this, 'square-number-api', {
      restApiName: 'SquareNumber Service'
    });

    api.root.addMethod('GET', new LambdaIntegration(squareNumberLambdaFunction));
    this.urlOutput = new CfnOutput(this, 'Url', { value: api.url });
  }
}
