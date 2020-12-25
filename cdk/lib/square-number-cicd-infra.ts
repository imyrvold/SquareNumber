import * as cdk from '@aws-cdk/core';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as ecr from '@aws-cdk/aws-ecr';
import * as iam from '@aws-cdk/aws-iam';
import * as pipelines from '@aws-cdk/pipelines';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import { CfnOutput, Construct, StageProps } from '@aws-cdk/core';
import { SquareNumberLambdaStack } from './square-number-lambda-stack';

export class SquareNumberApplicationsStage extends cdk.Stage {
    public readonly urlOutput: CfnOutput;

    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id);

        const lambdaStack = new SquareNumberLambdaStack(this, 'SquareNumberLambdaStack');
        this.urlOutput = lambdaStack.urlOutput;
    }
}

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
    
        let prodEnv = new SquareNumberApplicationsStage(this, 'Prod-env');
        const prodStage = pipeline.addApplicationStage(prodEnv);
        // Extra check to be sure that the deployment to Prod was successful
        prodStage.addActions(new pipelines.ShellScriptAction({
          actionName: 'SmokeTest',
          useOutputs: {
            ENDPOINT_URL: pipeline.stackOutput(prodEnv.urlOutput),
          },
          commands: ['curl -Ssf $ENDPOINT_URL'],
        }));
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
						'echo Pushing the Docker image...',
						`docker push ${repositoryUri}:$CODEBUILD_RESOLVED_SOURCE_VERSION`
					]
				}
			}
		});
	}

}