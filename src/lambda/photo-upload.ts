import { Logger } from "@aws-lambda-powertools/logger";
import { APIGatewayEvent, Context } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const logger = new Logger({ serviceName: "photo-upload" });
const s3 = new S3Client({ region: process.env.region });

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<any> => {
  logger.appendKeys({
    event,
    context,
  });
  logger.info("Received event");

  if (!event.queryStringParameters?.key) {
    logger.error("Missing key in query string parameters");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing key in query string parameters" }),
      headers: { "Content-Type": "application/json" },
    };
  }
  if (!event.queryStringParameters?.contentType) {
    logger.error("Missing contentType in query string parameters");
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing contentType in query string parameters",
      }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const approvedContentTypes = ["image/jpeg", "image/png"];
  if (!approvedContentTypes.includes(event.queryStringParameters.contentType)) {
    logger.error("Invalid contentType in query string parameters");
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid contentType in query string parameters",
      }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const bucketName = process.env.BUCKET_NAME ?? "your-bucket-name";
  const key = event.queryStringParameters?.key ?? "uploads/example.jpg";

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: event.queryStringParameters?.contentType ?? "image/jpg",
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiry

  const response = {
    statusCode: 200,
    body: JSON.stringify({ url }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://find-your-pets.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  };

  logger.info("Response", { response });
  return response;
};
