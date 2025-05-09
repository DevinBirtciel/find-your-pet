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

    const photoUpload = new lambda.Function(this, "PhotoUpload", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "src/lambda/photo-upload.handler",
    });

    const domainName = "api.find-your-pets.com";

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName,
    });

    const certificate = new certificatemanager.Certificate(
      this,
      "ApiGatewayCertificate",
      {
        domainName: `${domainName}`, // Subdomain for the API
        validation:
          certificatemanager.CertificateValidation.fromDns(hostedZone),
      }
    );

    const api = new apigateway.LambdaRestApi(this, "MyApiGateway", {
      handler: photoUpload,
      domainName: {
        domainName: `${domainName}`, // API Gateway's custom domain
        certificate,
      },
    });

    new route53.ARecord(this, "ApiGatewayAliasRecord", {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(api)
      ),
      recordName: `${domainName}`,
    });
  }
}
