exports.handler = (event, context, callback) => {
  // Get contents of request
  // Request event docs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
  console.log("The raw cloudfront event is <BEGIN>" + event + "<END>");

  var request = event.Records[0].cf.request;
  console.log("The var request is <BEGIN>" + request + "<END>");

  const req_json = JSON.parse(request);
  req_json['uri'] = "/"
  var req_mod = JSON.stringify(req_json);

  console.log("The var req_mod is <BEGIN>" + req_mod + "<END>");
  // Return modified request
  callback(null, req_mod);
};