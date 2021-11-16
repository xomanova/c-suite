// Request event docs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
'use strict';

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    let wssUri;
    wssUri = ''

    // clear request URI for websocket api gateway
    request.uri = wssUri;
    console.log(`Request uri set to "${request.uri}"`);
    callback(null, request);
};