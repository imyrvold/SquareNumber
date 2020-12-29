import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { CloudFrontWebDistribution } from '@aws-cdk/aws-cloudfront';

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

    const httpApiIntegration = new LambdaProxyIntegration({
      handler: squareNumberLambdaFunction,
    });

    const api = new apigatewayv2.HttpApi(this, 'SquareNumberApi', {
      createDefaultStage: true,
      corsPreflight: {
        allowMethods: [ apigatewayv2.HttpMethod.ANY ],
        allowOrigins: ['*']
      }
    });

    api.addRoutes({
      path: '/number',
      integration: httpApiIntegration,
      methods: [apigatewayv2.HttpMethod.POST],
      
    });

    // new cdk.CfnOutput(this, 'ApiUrlOutput', { value: api.url! });

    const feCf = new CloudFrontWebDistribution(this, "MyCf", {
      defaultRootObject: "/",
      originConfigs: [{
        customOriginSource: {
          domainName: `${api.httpApiId}.execute-api.${this.region}.${this.urlSuffix}`,
        },
        behaviors: [{
          isDefaultBehavior: true,
        }],
      }],
      enableIpV6: true,
    });

    new cdk.CfnOutput(this, "myOut", {
      value: feCf.distributionDomainName,
    });
  }
}

