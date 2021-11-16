index.handler = (event, context, callback) => {
  // Get contents of request
  // Request event docs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
  const request = event.Records[0].cf.request;
  const path = request.uri;
  path = "/"
  // Return modified request
  callback(null, request);
};