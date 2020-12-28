import * as cdk from '@aws-cdk/core';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ecr from '@aws-cdk/aws-ecr';
import * as iam from '@aws-cdk/aws-iam';
import * as pipelines from '@aws-cdk/pipelines';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import { LambdaDeploymentStage } from './lambda-deployment';

class s3BucketStack extends cdk.Stack {
    public bucket: s3.IBucket;

    constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
        super(scope, id, props)

      this.bucket = new s3.Bucket(this, 'LambdaZipBucket', {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      new s3deploy.BucketDeployment(this, 'DeployFiles', {
        sources: [s3deploy.Source.asset('./lambda.zip')],
        destinationBucket: this.bucket
    })

    }
  }

export class SquareNumberCicdInfraStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

		const sourceArtifact = new codepipeline.Artifact();
        const cdkOutputArtifact = new codepipeline.Artifact();
        const buildArtifact = new codepipeline.Artifact();
        
        const pipeline = new pipelines.CdkPipeline(this, 'CdkPipeline', {
            crossAccountKeys: false,
            pipelineName: 'square-number-pipeline',
            cloudAssemblyArtifact: cdkOutputArtifact,

            sourceAction: new codepipeline_actions.GitHubSourceAction({
                actionName: 'DownloadSources',
                owner: 'imyrvold',
                repo: 'SquareNumber',
                branch: 'main',
				oauthToken: cdk.SecretValue.secretsManager('github-token'),
				output: sourceArtifact
            }),

            synthAction: pipelines.SimpleSynthAction.standardNpmSynth({
				sourceArtifact: sourceArtifact,
                cloudAssemblyArtifact: cdkOutputArtifact,
                subdirectory: 'cdk'
            })
        });

        const repository = new ecr.Repository(this, 'Repository', { repositoryName: 'cdk-cicd/square-number'});
		const buildRole = new iam.Role(this, 'DockerBuildRole', {
			assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
		});
		repository.grantPullPush(buildRole);
        
        const lambdaStage = new LambdaDeploymentStage(this, 'LambdaDeploymentStage');
        pipeline.addApplicationStage(lambdaStage);
    }
}