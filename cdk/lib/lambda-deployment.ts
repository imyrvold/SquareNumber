import * as cdk from '@aws-cdk/core';
import { SquareNumberLambdaStack, LambdaStackProps } from './square-number-lambda-stack';

export class LambdaDeploymentStage extends cdk.Stage {
	constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);
		
		const lambdaStack = new SquareNumberLambdaStack(this, 'SquareNumberLambdaStack');
	}
}
