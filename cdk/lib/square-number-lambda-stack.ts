import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
// import { LambdaProxyIntegration } from '@aws-cdk/aws-apigateway2';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2';

import { CfnOutput } from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as path from 'path';
import { exec } from 'child_process';
import { spawnSync, SpawnSyncOptions } from 'child_process';

export interface LambdaStackProps extends cdk.StackProps {
  s3Bucket: s3.IBucket; // bucket where the code file is located
  s3CodeFile: string; // zip file for the lambda function in the s3Bucket
}

export class SquareNumberLambdaStack extends cdk.Stack {
  // public readonly urlOutput: CfnOutput;
  // readonly s3Bucket: s3.IBucket
  // readonly s3CodeFile: string

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const entry = path.join(__dirname, '../');
    // const environment = {
    //   CGO_ENABLED: '0',
    //   GOOS: 'linux',
    //   GOARCH: 'amd64',
    // };

    // const lambdaBucket = s3.Bucket.fromBucketName(this, 'LambdaZipBucket', 'LambdaZipBucket');

    // this.s3Bucket = new s3.Bucket(this, 'LambdaZipBucket', {
    //   removalPolicy: cdk.RemovalPolicy.DESTROY
    // });
    // this.s3CodeFile = "lambda.zip"

    // const squareNumberLambdaFunction = new lambda.Function(this, 'squareNumberLambdaFunction', {
    //   code: lambda.Code.fr
    //   // code: lambda.Code.fromAsset('./lambda.zip'),
    //   handler: 'SquareNumber.handler',
    //   runtime: lambda.Runtime.PROVIDED,
    //   tracing: lambda.Tracing.ACTIVE
    // })
    const squareNumberLambdaFunction = new lambda.Function(this, 'SquareNumberLambdaFunction', {
      code: lambda.Code.fromAsset(entry, {
        bundling: {
          image: lambda.Runtime.PROVIDED_AL2.bundlingDockerImage, // amazonlinux2
          workingDirectory: '/src',
          command: [
            'bash', '-c', [
              'swift build --product SquareNumber -c release -Xswiftc -static-stdlib',
              'scripts/package.sh SquareNumber',
              'cp .build/lambda/SquareNumber/lambda.zip cdk/'
            ].join(' && ')
          ]
        }
      }),
      handler: 'SquareNumber.handler',
      runtime: lambda.Runtime.PROVIDED,
      tracing: lambda.Tracing.ACTIVE
    });

    // const api = new apigatewayv2.HttpApi(this, 'SquareNumberApi', {
    //   createDefaultStage: true,
    //   corsPreflight: {
    //     allowMethods: [ apigatewayv2.HttpMethod.GET ],
    //     allowOrigins: ['*']
    //   }
    // });

    // api.addRoutes({
    //   path: '/hello',
    //   integration: new apigatewayv2.LambdaProxyIntegration({
    //     handler
    //   }),
    //   methods: [apigatewayv2.HttpMethod.GET]
    // });

    // new cdk.CfnOutput(this, 'ApiUrlOutput', { value: api.url! });
  }
}

