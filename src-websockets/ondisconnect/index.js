const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

exports.handler = async event => {
  // Delete connection from Connections table
  const deleteParams = {
    TableName: process.env.CONNECTIONS_TABLE_NAME,
    Key: {
      connectionId: event.requestContext.connectionId
    }
  };

  try {
    await ddb.delete(deleteParams).promise();
  } catch (err) {
    return { statusCode: 500, body: 'Failed to disconnect: ' + JSON.stringify(err) };
  }
  // TODO: Delete ConnectionId from each associated room_id

  return { statusCode: 200, body: 'Disconnected.' };
};
