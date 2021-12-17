const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

exports.handler = async event => {
  let connectionData;
  let returnString;
  var room_players = [];

  console.log(`Websocket GW event is ${JSON.stringify(event)}`);
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  
  const room_expiration = Math.floor(new Date().getTime() / 1000) + (6*60*60) // Now + 6h*60m*60s - allow rooms to persist for 6hrs unused

  const eventBody = JSON.parse(event.body)
  const action = eventBody.action
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({ endpoint: domainName + '/' + stage });

  returnString = "Action function not implemented"
  switch(String(action)) {
    case 'change':
      break;
    case 'shuffle':
      break;
    case 'join':
      returnString = await join_room(eventBody, ddb, room_players, connectionId, room_expiration);
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

  console.log(returnString);
  // const apigwManagementApi = new AWS.ApiGatewayManagementApi({ endpoint: domainName + '/' + stage });

  try {
    await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: returnString }).promise();
  } catch (e) {
    if (e.statusCode === 410) {
      console.log(`Found stale connection, deleting ${connectionId}`);
      await ddb.delete({ TableName: process.env.CONNECTIONS_TABLE_NAME, Key: { connectionId } }).promise();
    } else {
      throw e;
    }
  }

  // Get ConnectionIds
  //const params = {
  //  ExpressionAttributeNames: {
  //    '#r': 'room_id',
  //    '#c': 'connections'
  //  },
  //  ExpressionAttributeValues: {
  //    ':s': eventBody.room_id,
  //  },
  //  KeyConditionExpression: '#r = :s',
  //  ProjectionExpression: '#c',
  //  TableName: process.env.ROOMS_TABLE_NAME
  //};
  //
  //
  //try {
  //  await ddb.query(params, function(err, data) {
  //    if (err) {
  //        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
  //    } else {
  //        console.log("Connections query succeeded. Data: " + JSON.stringify(data));
  //        data.Items.forEach(function(item){
  //          var connections_arr = JSON.parse(item.connections);
  //          for (var i=0; i < connections_arr.length; i++) {
  //            try {
  //              apigwManagementApi.postToConnection({ ConnectionId: connections_arr[i], Data: JSON.stringify(returnString) }).promise();
  //            } catch (e) {
  //              if (e.statusCode === 410) {
  //                console.log(`Found stale connection, ${item.connections[i]}`);
  //              } else {
  //                throw e;
  //              }
  //            }
  //          }
  //        })
  //    }
  //  }).promise();
  //} catch (err) {
  //  return { statusCode: 500, body: 'Failed to update ddb: ' + JSON.stringify(err) };
  //}
  

  return { statusCode: 200, body: 'Data sent.' };
};

async function join_room(message, ddb, room_players, connectionId, room_expiration) {
    // Add this connection to message json
    message.connectionId = connectionId;

    if (message.room_id == 'XDXD'){
        // Create new Room
        var new_room_id = random_room_string()
        const params = {
            TableName: process.env.ROOMS_TABLE_NAME,
            Item: {
              room_id: new_room_id,
              connections: "[{\"id\":\"" + connectionId + "\"}]",
              owner: JSON.stringify(message.player),
              players: "[" + JSON.stringify(message.player) + "]",
              state: "{}",
              expiration: room_expiration
            }
          };
        
          try {
            await ddb.put(params).promise();
          } catch (err) {
            return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
          }
        //return params;
    } else {
        // Update players and connections for existing Room
        const params = {
          ExpressionAttributeNames: {
            '#r': 'room_id',
            '#c': 'connections',
            '#p': 'players'
          },
          ExpressionAttributeValues: {
            ':s': message.room_id,
          },
          KeyConditionExpression: '#r = :s',
          ProjectionExpression: '#r, #c, #p',
          TableName: process.env.ROOMS_TABLE_NAME
        };
        
        try {
          await ddb.query(params, function(err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            } else {
                console.log("Query succeeded.");
                data.Items.forEach(function(item) {
                  update_room_players(item,room_players,room_expiration,message,ddb);
                });
            }
          }).promise();
        } catch (err) {
          return { statusCode: 500, body: 'Failed to update ddb: ' + JSON.stringify(err) };
        }
    }
    var query_params = {
      ExpressionAttributeNames: {
        '#r': 'room_id',
        '#c': 'connections',
        '#p': 'players',
        '#s': 'state'
      },
      ExpressionAttributeValues: {
        ':r': message.room_id,
      },
      KeyConditionExpression: '#r = :r',
      ProjectionExpression: '#r, #c, #p, #s',
      TableName: process.env.ROOMS_TABLE_NAME
    };
    try {
      var room = await ddb.query(query_params, function(err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            data.Items.forEach(function(item) {
              update_room_players(item,room_players,room_expiration,message,ddb);
            });
        }
      }).promise();
    } catch (err) {
      return { statusCode: 500, body: 'Failed to update ddb: ' + JSON.stringify(err) };
    }
    var room_push = [];
    room_push.room_id = message.room_id;
    console.log(JSON.stringify(room.Items));
    //room_push.players = room.Items[0].players;
    //room_push.state = room.Items[0].state;

    return JSON.stringify(room_push);
}

async function update_room_players(item,room_players,room_expiration,message,ddb) {
  console.log(" -", item.room_id + ": " + JSON.stringify(item));
  console.log(" - room_players: " + JSON.stringify(room_players));
  console.log(" - room_expiration: " + JSON.stringify(room_expiration));
  console.log(" - message: " + JSON.stringify(message));


  // Build room connections
  var game_connections = JSON.parse(item.connections);
  var new_connection = new Object;
  new_connection.id = message.connectionId
  game_connections.push(new_connection);
  item.connections = game_connections;

  // Build room players
  var game_players = [];
  for (var p in JSON.parse(item.players)) 
    game_players.push(JSON.parse(item.players)[p]);
  game_players.push(message.player);
  item.players = game_players;

  // Update players and connections for open room
  console.log(" New ddb item would be: ", JSON.stringify(item));
  room_players = game_players;
  var update_params = {
    TableName: process.env.ROOMS_TABLE_NAME,
    Key: { 
      room_id: item.room_id
    },
    UpdateExpression: "set #C = :c, #P = :p, #E = :e",
    ExpressionAttributeNames: {"#C":"connections","#P":"players","#E":"expiration"},
    ExpressionAttributeValues: { ":c": JSON.stringify(item.connections),":p": JSON.stringify(game_players), ":e": room_expiration },
    ReturnValues: "ALL_NEW"
  };

  try {
    console.log("Updating room players...");
    await ddb.update(update_params).promise();
    Promise.all();
  } catch (err) {
    console.log("Error", err);
  }
}

async function update_room_change(apigwManagementApi,returnString) {

}

function random_room_string() {
    const charlist = "ABCDEFGHIJKLMNPQRSTUVWXYZ";
    do {
      var randomstring = "";
      for(var i = 0; i < 4; i++) {
          var rnd = Math.floor(Math.random() * charlist.length);
          randomstring = randomstring + charlist.charAt(rnd);
      }
    } while (randomstring == 'XDXD');
    return randomstring;
}