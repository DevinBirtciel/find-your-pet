import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";

export class FindYourPetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const photoUpload = new lambda.Function(this, "FindYourPetsPhotoUpload", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "lambda.find-your-pet.handler",
      code: lambda.Code.fromAsset("src"),
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
      proxy: false,
    });

    const uploadResource = api.root.addResource("upload");
    const lambdaIntegration = new apigateway.LambdaIntegration(photoUpload, {
      proxy: false,
    });

    uploadResource.addMethod("POST", lambdaIntegration);

    new route53.ARecord(this, "FindYourPetsApiGatewayAliasRecord", {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(api)
      ),
      recordName: `api.${domainName}`,
    });
  }
}
