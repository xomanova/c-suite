const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

exports.handler = async event => {
  let returnString;
  var room_players = [];

  console.log(`Websocket GW event is ${JSON.stringify(event)}`);
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  
  const room_expiration = Math.floor(new Date().getTime() / 1000) + (6*60*60); // Now + 6h*60m*60s - allow rooms to persist for 6hrs unused

  const eventBody = JSON.parse(event.body);
  const action = eventBody.action;
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({ endpoint: domainName + '/' + stage });

  returnString = "Action function not implemented";
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
      return { statusCode: 200, body: 'Data sent.' };
    default:
      console.log(`Websocket GW event is ${JSON.stringify(eventBody.action)}`);
      returnString = "Default action taken";
      break;
  }

  console.log(returnString);

  await publish_room_change(apigwManagementApi,returnString);
  
  return { statusCode: 200, body: 'Data sent.' };
};

async function join_room(message, ddb, room_players, connectionId, room_expiration) {
    // Add this connection to message json
    message.connectionId = connectionId;

    if (message.room_id == 'XDXD'){
        // Create new Room
        var new_room_id = random_room_string();
        message.room_id = new_room_id;
        const params = {
            TableName: process.env.ROOMS_TABLE_NAME,
            Item: {
              room_id: new_room_id,
              connections: "[{\"id\":\"" + connectionId + "\"}]",
              owner: JSON.stringify(message.player),
              players: "[" + JSON.stringify(message.player) + "]",
              state: {"phase":"huddle"},
              expiration: room_expiration
            }
          };
        
          try {
            await ddb.put(params).promise();
          } catch (err) {
            return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
          }
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

    return room.Items[0];
}

async function update_room_players(item,room_players,room_expiration,message,ddb) {
  console.log(" -", item.room_id + ": " + JSON.stringify(item));
  console.log(" - room_players: " + JSON.stringify(room_players));
  console.log(" - room_expiration: " + JSON.stringify(room_expiration));
  console.log(" - message: " + JSON.stringify(message));


  // Build room connections and add this connection if new.
  var game_connections = JSON.parse(item.connections);
  var new_connection = new Object;
  new_connection.id = message.connectionId;
  game_connections.some(x => x.id === new_connection.id) ? console.log("This connection is already in the room.") : game_connections.push(new_connection) ;
  item.connections = game_connections;

  // Build room players - no duplicate ids.
  var game_players = [];
  for (var p in JSON.parse(item.players)) 
    game_players.push(JSON.parse(item.players)[p]);
  game_players.some(x => x.id === message.player.id) ? console.log("This player is already in the room.") : game_players.push(message.player) ;
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
    var updates = await ddb.update(update_params).promise();
    Promise.resolve(updates);
    return updates;
  } catch (err) {
    console.log("Error", err);
  }
}

async function publish_room_change(apigwManagementApi,returnString) {
  const allowed = ['room_id', 'players','state'];
  const data = Object.keys(returnString).filter(key => allowed.includes(key)).reduce((obj, key) => {
      obj[key] = returnString[key];
      return obj;
    }, {});

  for ( const connection of returnString.connections) {
    var connectionId = connection.id;
    try {
      await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(data) }).promise();
    } catch (e) {
      //if (e.statusCode === 410) {
        console.log(`Found stale connection: ${connectionId}`);
      //  await ddb.delete({ TableName: process.env.CONNECTIONS_TABLE_NAME, Key: { connectionId } }).promise();
      //} else {
      //  throw e;
      //}
      // TODO: uncomment this when ondisconnect function is improved to cleanup this table
      continue;
    }
  }
  return;
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