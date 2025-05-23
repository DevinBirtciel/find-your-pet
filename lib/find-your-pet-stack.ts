import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class FindYourPetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const photoUpload = new lambda.Function(this, "FindYourPetsPhotoUpload", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "lambda/photo-upload.handler",
      retryAttempts: 0,
      code: lambda.Code.fromAsset("dist"),
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    const domainName = "find-your-pets.com";

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName,
    });

    const certificate = new certificatemanager.Certificate(
      this,
      "FindYourPetsApiGatewayCertificate",
      {
        domainName: `api.${domainName}`,
        validation:
          certificatemanager.CertificateValidation.fromDns(hostedZone),
      }
    );

    const api = new apigateway.LambdaRestApi(this, "FindYourPetsApi", {
      handler: photoUpload,
      domainName: {
        domainName: `api.${domainName}`,
        certificate,
      },
      proxy: true,
      deployOptions: {
        stageName: "prod",
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        statusCode: 200,
      },
      deploy: true,
      restApiName: "FindYourPetsApi",
      description: "API for Find Your Pets",
    });

    // const getSignedUrlResource = api.root.addResource("get-signed-url");
    // const lambdaIntegration = new apigateway.LambdaIntegration(photoUpload, {
    //   proxy: true,
    // });

    // getSignedUrlResource.addMethod("GET", lambdaIntegration);

    new route53.ARecord(this, "FindYourPetsApiGatewayAliasRecord", {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(api)
      ),
      recordName: `api.${domainName}`,
    });

    // configure s3 bucket for lambda to upload to
    const bucket = new s3.Bucket(this, "FindYourPetsBucket", {
      bucketName: "find-your-pets-bucket",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });
    bucket.grantReadWrite(photoUpload);
    photoUpload.addEnvironment("BUCKET_NAME", bucket.bucketName);
    photoUpload.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
        resources: [bucket.bucketArn],
      })
    );
  }
}
