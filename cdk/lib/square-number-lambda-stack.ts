import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
// import { LambdaProxyIntegration } from '@aws-cdk/aws-apigateway2';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2';

import { CfnOutput } from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as path from 'path';

export class SquareNumberLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dockerfile = '../';

    const squareNumberLambdaFunction = new lambda.DockerImageFunction(this, 'SquareNumberLambdaFunction', {
      functionName: 'SquareNumber',
      code: lambda.DockerImageCode.fromImageAsset(dockerfile)
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

