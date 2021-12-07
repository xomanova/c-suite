// Copyright 2018-2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

exports.handler = async event => {
  const connectionId = event.requestContext.connectionId
  const putParams = {
    TableName: process.env.TABLE_NAME,
    Item: {
      connectionId: event.requestContext.connectionId
    }
  };

  console.log(`Websocket connectionId is "${event.requestContext.connectionId}"`);
  console.log(`Websocket GW event is "${JSON.stringify(event)}"`);

  try {
    await ddb.put(putParams).promise();
  } catch (err) {
    return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
  }

  var eventText = JSON.stringify(event, null, 2);
  console.log("Received event:", eventText);
  var sns = new AWS.SNS();
  var params = {
      Message: event, 
      Subject: "From onconnect lambda",
      TopicArn: process.env.TOPIC_ARN
  };
  sns.publish(params, context.done);

  return { statusCode: 200, body: 'Connected.' };
};
