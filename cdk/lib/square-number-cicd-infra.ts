import * as cdk from '@aws-cdk/core';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as ecr from '@aws-cdk/aws-ecr';
import * as iam from '@aws-cdk/aws-iam';
import * as pipelines from '@aws-cdk/pipelines';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import { CfnOutput, Construct, StageProps } from '@aws-cdk/core';
import { SquareNumberLambdaStack, LambdaStackProps } from './square-number-lambda-stack';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
// import { LambdaDeploymentStage } from './lambda-deployment'

// export class SquareNumberApplicationsStage extends cdk.Stage {
//     public readonly urlOutput: CfnOutput;

//     constructor(scope: Construct, id: string, props: LambdaStackProps) {
//         super(scope, id);

//         const lambdaStack = new SquareNumberLambdaStack(this, 'SquareNumberLambdaStack', {
//             s3Bucket: props.s3Bucket,
//             s3CodeFile: props.s3CodeFile
//         });
//         this.urlOutput = lambdaStack.urlOutput;
//     }
// }

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

// export class S3WriteStage extends cdk.Stage {

//     constructor(scope: Construct, id: string, props?: StageProps) {
//         super(scope, id);

//         const lambdaBucket = new s3.Bucket(this, 'LambdaZipBucket');
        // new s3deploy.BucketDeployment(this, 'DeployFiles', {
        //     sources: [s3deploy.Source.asset('./lambda.zip')],
        //     destinationBucket: lambdaBucket
        // })
//     }
// }

export class SquareNumberCicdInfraStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

		const sourceArtifact = new codepipeline.Artifact();
        const cdkOutputArtifact = new codepipeline.Artifact();
        
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

		const project = new codebuild.Project(this, 'DockerBuild', {
			role: buildRole,
			environment: {
				buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
				privileged: true
			},
			buildSpec: this.getDockerBuildSpec(repository.repositoryUri)
        });
        
        const buildStage = pipeline.addStage('LambdaBuildAndZip');
		buildStage.addActions(new codepipeline_actions.CodeBuildAction({
			actionName: 'LambdaBuildAndZip',
			input: sourceArtifact,
			project: project
        }));

        // Deploy - Local
        const lambdaBucket = new s3.Bucket(this, 'LambdaZipBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        new s3deploy.BucketDeployment(this, 'DeployFiles', {
            sources: [s3deploy.Source.asset('./lambda.zip')],
            destinationBucket: lambdaBucket
        })

        new SquareNumberLambdaStack(this, 'SquareNumberLambdaStack', {
            s3Bucket: lambdaBucket,
            s3CodeFile: 'lambda.zip'
        });

      
		// const lambdaStage = new LambdaDeploymentStage(this, 'LambdaDeploy', {
        //     s3Bucket: lambdaBucket,
        //     s3CodeFile: 'lambda.zip'
        // });
		// pipeline.addApplicationStage(lambdaStage);

        
        // const s3ZipStage = new S3WriteStage(this, 'S3ZipStage');
        // pipeline.addApplicationStage(s3ZipStage);
        // const lambdaBucket = new s3.Bucket(this, 'LambdaZipBucket', {
        //     bucketName: 'SquareNumberCode'
        // });


        // const s3ZipStage = pipeline.addStage('S3ZipStage');
        // s3ZipStage.addActions(new codepipeline_actions.S3DeployAction({
        //    actionName: 'S3DeployZip',
        //    input: s3Artifact,
        //    bucket: lambdaBucket
        // }));
    
        // let prodEnv = new SquareNumberApplicationsStage(this, 'Prod-env');
        // const prodStage = pipeline.addApplicationStage(prodEnv);
        // // Extra check to be sure that the deployment to Prod was successful
        // prodStage.addActions(new pipelines.ShellScriptAction({
        //   actionName: 'SmokeTest',
        //   useOutputs: {
        //     ENDPOINT_URL: pipeline.stackOutput(prodEnv.urlOutput),
        //   },
        //   commands: ['curl -Ssf $ENDPOINT_URL'],
        // }));
    }


    getDockerBuildSpec(repositoryUri: string): codebuild.BuildSpec {
		return codebuild.BuildSpec.fromObject({
			version: '0.2',
			phases: {
				pre_build: {
					commands: [
						'echo Logging in to Amazon ECR...',
                        '$(aws ecr get-login --no-include-email --region $AWS_DEFAULT_REGION)',
                        'chmod +x scripts/package.sh'
					]
				},
				build: {
					commands: [
						'echo Build started on `date`',
                        'echo Building the Docker image...',
                        `docker run --rm --volume "$(pwd)/:/src" --workdir "/src/" public.ecr.aws/o8l5c1i1/swift:5.3.2-amazonlinux2 swift build --product SquareNumber -c release -Xswiftc -static-stdlib`,
                        `scripts/package.sh SquareNumber`
					]
				},
				post_build: {
					commands: [
                        'echo Build completed on `date`',
                        'echo copy zip file to cdk/',
                        `cp .build/lambda/SquareNumber/lambda.zip cdk/`
					]
				}
			}
		});
	}

}