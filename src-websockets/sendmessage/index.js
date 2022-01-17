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
      returnString = await change_room_state(eventBody, ddb, connectionId, room_expiration);
      returnString.connections = JSON.parse(returnString.connections);
      returnString.players = JSON.parse(returnString.players);
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


async function change_room_state(message, ddb, connectionId, room_expiration) {
  var query_params = {
    ExpressionAttributeNames: {
      '#r': 'room_id',
      '#c': 'connections',
      '#p': 'players',
      '#s': 'state',
      '#sp': 'spectators'
    },
    ExpressionAttributeValues: {
      ':r': message.room_id,
    },
    KeyConditionExpression: '#r = :r',
    ProjectionExpression: '#r, #c, #p, #s, #sp',
    TableName: process.env.ROOMS_TABLE_NAME
  };
  try {
    var room = await ddb.query(query_params, function(err, data) {
      if (err) {
          console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
          console.log("Query succeeded.");
          data.Items.forEach(function(item) {
            update_room_state(item,room_expiration,message,ddb);
          });
      }
    }).promise();
  } catch (err) {
    return { statusCode: 500, body: 'Failed to update ddb: ' + JSON.stringify(err) };
  }
  
  return room.Items[0];
}

async function update_room_state(item,room_expiration,message,ddb) {
  var game_state = new Object;
  game_state = await progress_phase(message,message.state,item.state);
  console.log(`game_state after progress_phase: `+ JSON.stringify(game_state));

  //item.connections = JSON.parse(item.connections); // This forms the object type correctly for return
  //item.players = JSON.parse(item.players); // This forms the object type correctly for return
  item.state = game_state;

  // Update room state
  console.log(" New ddb item would be: ", JSON.stringify(item));
  var update_params = {
    TableName: process.env.ROOMS_TABLE_NAME,
    Key: { 
      room_id: item.room_id
    },
    UpdateExpression: "set #C = :c, #S = :s, #E = :e",
    ExpressionAttributeNames: {"#C":"connections","#S":"state","#E":"expiration"},
    ExpressionAttributeValues: { ":c": item.connections, ":s": game_state,":e": room_expiration },
    ReturnValues: "ALL_NEW"
  };

  try {
    console.log("Updating room state..." + JSON.stringify(update_params));
    var updates = await ddb.update(update_params).promise();
    Promise.resolve(updates);
    return game_state;
  } catch (err) {
    console.log("Error", err);
  }
}

async function progress_phase(message,received_state,current_state) {
  var current = current_room_object(message.room_id);
  var prog_game_state = {
    ...current_state,
    ...received_state
  }

  switch(String(prog_game_state.phase)) {
    case 'huddle':
      switch(Boolean(prog_game_state.ready)){
        case true:
          console.log(`Huddle phase progression taken, true - game_state: ` + JSON.stringify(prog_game_state));
          return initialize_game(message,prog_game_state,received_state.phase,current_state.phase);
        case false:
          console.log(`Huddle phase progression taken, false - game_state: ` + JSON.stringify(prog_game_state));
          return prog_game_state;
        default:
          return prog_game_state;
      }
    case 'setup':
      switch(Boolean(prog_game_state.ready)){
        case true:
          console.log(`setup phase progression taken, true - game_state: ` + JSON.stringify(prog_game_state));
          return roll_deck(current,message,prog_game_state,received_state.phase,current_state.phase);
        case false:
          console.log(`setup phase progression taken, false - game_state: ` + JSON.stringify(prog_game_state));
          return prog_game_state;
        default:
          return prog_game_state;
      }
    case 'shuffle':
      break;
    default:
      console.log(`Default phase progression taken, unknown phase: ` + JSON.stringify(prog_game_state));
      return prog_game_state;
  }
}

async function initialize_game(message,prog_game_state,received_phase,current_phase) {
  console.log(`intialize_game() - prog_game_state: ` + JSON.stringify(prog_game_state))
  // huddle => setup
  var init_game_state = {
    phase: 'setup',
    previous_phase: 'huddle',
    ready: 'false',
    theme: 'sith'
  };
  return init_game_state;
}

async function roll_deck(current,message,prog_game_state,received_phase,current_phase) {
  console.log(`roll_deck() - prog_game_state: ` + JSON.stringify(prog_game_state))

  var players_r = players_ready(current.players);
  var deck = prep_deck();
  var hitler = roll_baddie(current.players);
  var allegiances = roll_allegiances(current.players);
  var executions = players_ready(current.players);

  // setup => intro
  var intro_game_state = {
    phase: 'intro',
    previous_phase: 'setup',
    theme: message.state.theme,
    ready: players_r,// object with playerids/readystate
    num_enacted: {
      liberal: 0,
      fascist: 0
    },
    deck: deck,// randomized deck of t/f[]
    removed: 0,
    president: 2,
    refusals: 0,
    hitler: hitler, // has to be determined before this
    allegiance: allegiances,
    execute: executions
  }

  return intro_game_state;
}

function players_ready(players) {
  var map = new Object;
  console.log("typeof players: " + typeof players);
  console.log("typeof JSON.parse(players): " + typeof JSON.parse(players));

  for (const player of players) {
    map[player.id] = false
  }
  return map;
}

function prep_deck() {
  var tf = ['true','false']
  var deck = [];
  for (let card = 0; card < 18; card++) {
    deck[0] = tf[Math.floor(Math.random()*tf.length)];
  }
  return deck;
}

function roll_baddie(players) {
  var baddie = players[Math.floor(Math.random()*players.length)];
  return baddie.id;
}

function roll_allegiances(players) {
  var tf = ['true','false']
  var map = new Object;
  for (const player of players) {
    if (map.filter(x => x.contains(false)).length < 2) {
      map[player.id] = tf[Math.floor(Math.random()*tf.length)];
    }
    else map[player.id] = 'true'
  }
  return map;
}



async function join_room(message, ddb, room_players, connectionId, room_expiration) {
    // Add this connection to message json
    message.connectionId = connectionId;

    if (message.room_id == 'XDXD'){
        // Create new Room
        var new_room_id = random_room_string();
        var xd_room_state = new Object;
        xd_room_state.phase = "huddle";
        xd_room_state.previous_phase = "huddle";
        xd_room_state.ready = "false";
        message.room_id = new_room_id;
        const params = {
            TableName: process.env.ROOMS_TABLE_NAME,
            Item: {
              room_id: new_room_id,
              connections: "[{\"id\":\"" + connectionId + "\"}]",
              owner: JSON.stringify(message.player),
              players: "[" + JSON.stringify(message.player) + "]",
              state: xd_room_state,
              spectators: "[]",
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
        '#s': 'state',
        '#sp': 'spectators'
      },
      ExpressionAttributeValues: {
        ':r': message.room_id,
      },
      KeyConditionExpression: '#r = :r',
      ProjectionExpression: '#r, #c, #p, #s, #sp',
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

  // Build room connections and add this connection if new.
  var game_connections = JSON.parse(item.connections);
  var new_connection = new Object;
  new_connection.id = message.connectionId;
  game_connections.some(x => x.id === new_connection.id) ? console.log("This connection is already in the room.") : game_connections.push(new_connection) ;
  item.connections = game_connections;

  // Build room players - no duplicate ids.
  var game_players = [];
  console.log("item.players: "+JSON.stringify(item.players));
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
  const allowed = ['room_id', 'players','state','spectators'];
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
        console.log(`Error sending to connection: ${e} (Id: ${connectionId})`);
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

async function current_room_object(room_id) {
  var query_params = {
    ExpressionAttributeNames: {
      '#r': 'room_id',
      '#c': 'connections',
      '#p': 'players',
      '#s': 'state',
      '#sp': 'spectators'
    },
    ExpressionAttributeValues: {
      ':r': room_id,
    },
    KeyConditionExpression: '#r = :r',
    ProjectionExpression: '#r, #c, #p, #s, #sp',
    TableName: process.env.ROOMS_TABLE_NAME
  };
  try {
    var room = await ddb.query(query_params, function(err, data) {
      if (err) {
          console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
          console.log("Query succeeded.");
      }
    }).promise();
  } catch (err) {
    return { statusCode: 500, body: 'Failed to update ddb: ' + JSON.stringify(err) };
  }
  Promise.resolve(room);
  console.log("current_room_object() - room: " + JSON.parse(room));
  return room.Items[0];
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
