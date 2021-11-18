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


  const postData = `{"sid":"wtX_tiBPCn6FlIpJAAZC-TEST","upgrades":[],"pingInterval":5000,"pingTimeout":5000}`

  try {
    await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: postData }).promise();
  } catch (e) {
    if (e.statusCode === 410) {
      console.log(`Found stale connection, deleting ${connectionId}`);
      await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
    } else {
      throw e;
    }
  }

  return { statusCode: 200, body: 'Connected.' };
};
