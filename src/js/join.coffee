get_suggested_rooms = ->

  try
    if not localStorage.player_interactions?
      return Promise.resolve([])
  catch error
    if not error instanceof (window.SecurityError ? window.DOMException)
      throw error
    return Promise.resolve([])

  player_interactions =  JSON.parse localStorage.player_interactions
  players = _.union(_.keys(player_interactions.time), _.keys(player_interactions.count))

  return new Promise( (resolve, reject) ->
    $.ajax('suggested-rooms?player=' + localStorage.player_id + '&players=' + players.join(','))
    .then(resolve, reject)
  )

$ ->

  get_suggested_rooms().then (suggested_rooms) ->
    if suggested_rooms.length == 0
      $('input').attr('autofocus', 'autofocus').focus()
    else
      $('#suggestions').show()
      $games = $('#suggestions .games')
      $games.empty()
      for room in suggested_rooms
        status_text = {
          huddle: 'Getting ready'
          mid: 'Game in progress'
          terminal: 'Game finished'
        }[room.phase_type]
        status_class = (
          if room.can_join and room.phase_type != 'terminal'
            'text-success'
          else
            'text-warning'
        )
        $a = $("""
          <a class='game' href='/games/#{room.game_id}/rooms/#{room.room_id}'>
            <div class='details'>
              <div class='info'>
                <h2>#{room.game_name}</h2>
                <p>Hosted by <strong>#{room.host_player_name}</strong></p>
                <p class="#{status_class}">#{status_text}</p>
              </div>
              <div class='code'><p>#{room.room_id}</p></div>
            </div>
          </a>
        """)
        $games.append($a)
  .catch (error) -> console.error 'Error retrieving room suggestions:', error
  .then ->
    $('#spinner').hide()

  $('a.join').click (event) ->
    $('form').submit()

  $('form').submit (event) ->
    event.preventDefault()
    code = $('input').val().toUpperCase()
    if code
      window.location = 'rooms/' + code
