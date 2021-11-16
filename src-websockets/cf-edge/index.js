exports.handler = (event, context, callback) => {
  // Get contents of request
  // Request event docs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
  var request = event.Records[0].cf.request;
  const req_json = JSON.parse(request);
  req_json['uri'] = "/"
  var req_mod = JSON.stringify(req_json);
  // Return modified request
  callback(null, req_json);
};