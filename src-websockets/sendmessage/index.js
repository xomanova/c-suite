// Copyright 2018-2020Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

exports.handler = async event => {
  let connectionData;
  console.log(event.toString());

  try {
    connectionData = await ddb.scan({ TableName: process.env.TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  

  

  //const postData = `{"sid":"wtX_tiBPCn6FlIpJAAZC-TEST","upgrades":[],"pingInterval":5000,"pingTimeout":5000}`
  //const apigwManagementApi = new AWS.ApiGatewayManagementApi({
  //  apiVersion: '2018-11-29',
  //  endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  //});
//
  //try {
  //  await apigwManagementApi.postToConnection({ ConnectionId: connectionData, Data: postData }).promise();
  //} catch (e) {
  //  if (e.statusCode === 410) {
  //    console.log(`Found stale connection, deleting ${connectionData}`);
  //    await ddb.delete({ TableName: process.env.TABLE_NAME, Key: { connectionData } }).promise();
  //  } else {
  //    throw e;
  //  }
  //}


  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });

  const postData = JSON.parse(event.body).data;
  
  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    try {
      await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: postData }).promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb.delete({ TableName: process.env.TABLE_NAME, Key: { connectionId } }).promise();
      } else {
        throw e;
      }
    }
  });

  console.log(`Websocket connectionId is "${event.requestContext.connectionId}"`);
  console.log(`Websocket GW event is "${JSON.stringify(event)}"`);
  console.log(`Websocket postData is "${postData}"`);

  try {
    await Promise.all(postCalls);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};
