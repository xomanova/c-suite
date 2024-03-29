// Generated by CoffeeScript 1.12.7
(function() {
  var get_suggested_rooms;

  get_suggested_rooms = function() {
    var error, player_interactions, players, ref;
    try {
      if (localStorage.player_interactions == null) {
        return Promise.resolve([]);
      }
    } catch (error1) {
      error = error1;
      if (!error instanceof ((ref = window.SecurityError) != null ? ref : window.DOMException)) {
        throw error;
      }
      return Promise.resolve([]);
    }
    player_interactions = JSON.parse(localStorage.player_interactions);
    players = _.union(_.keys(player_interactions.time), _.keys(player_interactions.count));
    return new Promise(function(resolve, reject) {
      return $.ajax('suggested-rooms?player=' + localStorage.player_id + '&players=' + players.join(',')).then(resolve, reject);
    });
  };

  $(function() {
    get_suggested_rooms().then(function(suggested_rooms) {
      var $a, $games, i, len, results, room, status_class, status_text;
      if (suggested_rooms.length === 0) {
        return $('input').attr('autofocus', 'autofocus').focus();
      } else {
        $('#suggestions').show();
        $games = $('#suggestions .games');
        $games.empty();
        results = [];
        for (i = 0, len = suggested_rooms.length; i < len; i++) {
          room = suggested_rooms[i];
          status_text = {
            huddle: 'Getting ready',
            mid: 'Game in progress',
            terminal: 'Game finished'
          }[room.phase_type];
          status_class = (room.can_join && room.phase_type !== 'terminal' ? 'text-success' : 'text-warning');
          $a = $("<a class='game' href='/games/" + room.game_id + "/rooms/" + room.room_id + "'>\n  <div class='details'>\n    <div class='info'>\n      <h2>" + room.game_name + "</h2>\n      <p>Hosted by <strong>" + room.host_player_name + "</strong></p>\n      <p class=\"" + status_class + "\">" + status_text + "</p>\n    </div>\n    <div class='code'><p>" + room.room_id + "</p></div>\n  </div>\n</a>");
          results.push($games.append($a));
        }
        return results;
      }
    })["catch"](function(error) {
      return console.error('Error retrieving room suggestions:', error);
    }).then(function() {
      return $('#spinner').hide();
    });
    $('a.join').click(function(event) {
      return $('form').submit();
    });
    return $('form').submit(function(event) {
      var code;
      event.preventDefault();
      code = $('input').val().toUpperCase();
      if (code) {
        localStorage.room = code
        return window.location = 'room.html';
      }
    });
  });

}).call(this);

//# sourceMappingURL=join.js.map
