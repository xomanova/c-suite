// Copyright 2018-2020Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');
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
  const action = eventBody.action

  returnString = "Action function not implemented"
  switch(String(action)) {
    case 'change':
      break;
    case 'shuffle':
      break;
    case 'join':
      returnString = join_room(eventBody, ddb);
      break;
    case 'join-midway':
      break;
    case 'change-name':
      break;
    case 'leave':
      break;
    case 'boot':
      break;
    case 'restart':
      break;
    case 'measure-time-difference':
      break;
    default:
      console.log(`Websocket GW event is ${JSON.stringify(eventBody.action)}`);
      returnString = "Default action taken"
      break;
  }


  const apigwManagementApi = new AWS.ApiGatewayManagementApi({ endpoint: domainName + '/' + stage });

  try {
    await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(returnString) }).promise();
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

async function join_room(message, ddb) {
    if (message.room_id == 'XDXD'){
        // Create new Room
        var new_room_id = random_room_string()
        const params = {
            TableName: process.env.ROOMS_TABLE_NAME,
            Item: {
              room_id: new_room_id,
              owner: JSON.stringify(message.player),
              players: "[" + JSON.stringify(message.player) + "]"
            }
          };
        
          try {
            await ddb.put(params).promise();
          } catch (err) {
            return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
          }
        return params;
    } else {
        var params = {
          ExpressionAttributeNames: {
            '#r': 'room_id' 
          },
          ExpressionAttributeValues: {
            ':s': message.room_id,
          },
          KeyConditionExpression: '#r = :s',
          ProjectionExpression: 'room_id, owner, players',
          TableName: process.env.ROOMS_TABLE_NAME
        };

        ddb.query(params, function(err, data) {
          if (err) {
              console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
          } else {
              console.log("Query succeeded.");
              data.Items.forEach(function(item) {
                  console.log(" -", item.room_id + ": " + item.players);
                  var obj = JSON.parse(item);
                  obj['players'].push({"id": message.player.id, "name": message.player.name})
                  // Update player list for open room
                  console.log(" New ddb item would be: ", JSON.stringify(item));
              });

          }
        });
        // 1. Get DDB data for this room_id
        // 2. Add this player to this room's player ids map
        //      "players" : [{"id" : "guid", "name" : "pname"},{"id" : "guid", "name" : "pname"}]
        // 3. SendMessage to all ConnectionIds from this ROOM with new player list data
    }
}

function random_room_string() {
    const charlist = "ABCDEFGHIJKLMNPQRSTUVWXYZ";
    var randomstring = "";
    for(var i = 0; i < 4; i++) {
        var rnd = Math.floor(Math.random() * charlist.length);
        randomstring = randomstring + charlist.charAt(rnd);
    }
    return randomstring;
}