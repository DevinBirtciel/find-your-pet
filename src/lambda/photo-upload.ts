import { Logger } from "@aws-lambda-powertools/logger";
import { APIGatewayEvent, Context } from "aws-lambda";

const logger = new Logger({ serviceName: "photo-upload" });

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<any> => {
  logger.appendKeys({
    event,
    context,
  });

  logger.info("Received event");

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello World from the 'photo-upload' Lambda function!",
      input: event,
    }),
  };

  logger.info("Response", { response });
  return response;
};
