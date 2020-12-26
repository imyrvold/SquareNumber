import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { CfnOutput } from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';

export interface LambdaStackProps extends cdk.StackProps {
  s3Bucket: s3.IBucket; // bucket where the code file is located
  s3CodeFile: string; // zip file for the lambda function in the s3Bucket
}

export class SquareNumberLambdaStack extends cdk.Stack {
  public readonly urlOutput: CfnOutput;
  readonly s3Bucket: s3.IBucket
  readonly s3CodeFile: string

  constructor(scope: cdk.Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // const lambdaBucket = s3.Bucket.fromBucketName(this, 'LambdaZipBucket', 'LambdaZipBucket');

    // this.s3Bucket = new s3.Bucket(this, 'LambdaZipBucket', {
    //   removalPolicy: cdk.RemovalPolicy.DESTROY
    // });
    // this.s3CodeFile = "lambda.zip"

    const squareNumberLambdaFunction = new lambda.Function(this, 'squareNumberLambdaFunction', {
      code: lambda.Code.fromBucket(props.s3Bucket, props.s3CodeFile),
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

