const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });
const connection_expiration = Math.floor(new Date().getTime() / 1000) + (12*60*60) // Now + 12h*60m*60s - allow persistent connections for 12 hrs

exports.handler = async event => {
  const putParams = {
    TableName: process.env.CONNECTIONS_TABLE_NAME,
    Item: {
      connectionId: event.requestContext.connectionId,
      expiration: connection_expiration
    }
  };

  console.log(`Websocket connectionId is ${event.requestContext.connectionId}`);
  console.log(`Websocket GW event is ${JSON.stringify(event)}`);

  try {
    await ddb.put(putParams).promise();
  } catch (err) {
    return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
  }

  var eventText = JSON.stringify(event, null, 2);
  console.log("Received event:", eventText);
  var sns = new AWS.SNS();
  var params = {
      Message: JSON.stringify(event), 
      Subject: "From onconnect lambda",
      TopicArn: process.env.WEBSOCKET_TOPIC_ARN
  };
  try {
    sns.publish(params, function(err, data) {
      if (err) console.log(err, err.stack);
      else     console.log(data);
    });
    console.log(`SNS message published for new connection to ${process.env.WEBSOCKET_TOPIC_ARN}`);
  } catch (err) {
    return { statusCode: 500, body: `Failed to publish to ${process.env.WEBSOCKET_TOPIC_ARN}. Error: ` + JSON.stringify(err) };
  }

  return { statusCode: 200, body: 'Connected.' };
};
