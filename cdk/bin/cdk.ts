#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SquareNumberCicdInfraStack } from '../lib/square-number-cicd-infra';

const app = new cdk.App();
new SquareNumberCicdInfraStack(app, 'SquareNumberCicdInfraStack');

app.synth();