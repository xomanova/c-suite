async function join(message) {
    if (message.room_id = 'XDXD'){
        // Create new Room
        var new_room_id = random_room_string()
        const newRoomParams = {
            TableName: process.env.ROOMS_TABLE_NAME,
            Item: {
              room_id: new_room_id,
              owner: JSON.stringify(message.player),
              players: "[" + JSON.stringify(message.player) + "]"
            }
          };
        
          try {
            await ddb.put(newRoomParams).promise();
          } catch (err) {
            return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
          }
    } else {
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

