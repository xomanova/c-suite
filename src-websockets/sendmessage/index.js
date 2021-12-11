// Copyright 2018-2020Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');
const actions = require('./actions')
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

exports.handler = async event => {
  let connectionData;
  let returnString;

  console.log(`Websocket GW event is ${JSON.stringify(event)}`);
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  try {
    connectionData = await ddb.scan({ TableName: process.env.CONNECTIONS_TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  
  
  const eventBody = JSON.parse(event.body)

  switch(eventBody.action) {
    case change:
      break;
    case shuffle:
      break;
    case join:
      actions.join(eventBody);
      break;
    case join-midway:
      break;
    case change-name:
      break;
    case leave:
      break;
    case boot:
      break;
    case restart:
      break;
    case measure-time-difference:
      break;
    default:
      returnString = "Request action not implemented."
      break;
  }


  const postData = returnString
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({ endpoint: domainName + '/' + stage });

  try {
    await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(postData) }).promise();
  } catch (e) {
    if (e.statusCode === 410) {
      console.log(`Found stale connection, deleting ${connectionId}`);
      await ddb.delete({ TableName: process.env.CONNECTIONS_TABLE_NAME, Key: { connectionId } }).promise();
    } else {
      throw e;
    }
  }

  return { statusCode: 200, body: 'Data sent.' };
};
