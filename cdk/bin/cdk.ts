#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SquareNumberStack } from '../lib/cdk-stack';

const app = new cdk.App();
new SquareNumberStack(app, 'SquareNumberStack');
