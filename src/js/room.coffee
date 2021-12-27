# Make jquery results iterable
jQuery.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];

netgames = window.netgames = {}

netgames.has_touch = 'ontouchstart' of window or 'msMaxTouchPoints' of window.navigator

netgames.key_value = (key, value) ->
  object = {}
  object[key] = value
  return object

netgames.to_server_timestamp = (client_timestamp) ->
  return client_timestamp + netgames.time_difference

netgames.to_client_timestamp = (server_timestamp) ->
  return server_timestamp - netgames.time_difference

netgames.player_by_id = (players, player_id) ->
  for player in players
    if player.id == player_id
      return player
  return null

netgames.comma_list = (list, comma = ', ', final_separator = ' and ') ->
  [first..., last] = list
  _.filter([first.join(comma), last]).join(final_separator);

netgames.shame_players = (object, players, shameful) ->
  return players.filter (player) -> object.hasOwnProperty(player.id) and shameful(object[player.id])

netgames.generate_shame_text = (shame_players, no_shame_text = 'Waiting for others...', shame_threshold = 1) ->
  if shame_players.length == 0
    no_shame_text
  else if netgames.player_by_id(shame_players, netgames.player.id)?
    if shame_players.length > 1
      other_num = shame_players.length - 1
      plural = if other_num > 1 then 's' else ''
      "Waiting for you and #{other_num} other#{plural}"
    else
      'Waiting for you!'
  else if shame_players.length <= shame_threshold
    'Waiting for ' + netgames.comma_list(shame_players.map((player) -> player.name))
  else
    'Waiting for ' + shame_players.length + ' others...'

netgames.player_name_or_you = (player, {possessive = false, have_has = false, are_is = false, were_was = false} = {}) ->
  if not player?
    return ''
  if player.id == netgames.player.id
    name = if possessive then 'Your' else 'You'
    if have_has then name += ' have'
    if are_is then name += ' are'
    if were_was then name += ' were'
    return name
  else
    name = player.name
    if possessive then name += "'s"
    if have_has then name += ' has'
    if are_is then name += ' is'
    if were_was then name += ' was'
    return name

netgames.render_list = ($list, $template, values, render) ->
  $list.children("*:nth-child(n+#{values.length + 1})").remove()
  $items = $list.children()

  for value, index in values
    if $items[index]
      render($items.eq(index), value, index)
    else
      $item = $template.clone().removeClass('template')
      render($item, value, index)
      $list.append($item)

netgames.render_players = (state, players, $players, class_predicates) ->
  netgames.render_list $players, $('<li>'), players, ($player, player) =>
    $player.text(player.name)
    $player.addClass('notranslate')
    $player.data('id', player.id)
    for klass, predicate of class_predicates
      $player.toggleClass(klass, predicate(state, players, player))

netgames.render_theme = ($content, theme) ->
  if $content.attr('data-theme') == theme.id
    return
  $content.attr('data-theme', theme.id)

  for key, text of theme.text
    text_class = '.text-' + key.replace(/[^a-z]/g, '-')
    for el in $content.find(text_class)
      $el = $(el)
      if $el.is('.capitalised')
        $el.text(text[0].toUpperCase() + text.slice(1))
      else
        $el.text(text)

KEEP_RECENT_NUM = 50
KEEP_FREQUENT_NUM = 50

safe_localStorage_access = (method) ->
  try
    return method()
  catch error
    if not error instanceof (window.SecurityError ? window.DOMException)
      throw error
  return null

get_player_interactions = ->
  result = safe_localStorage_access ->
    if localStorage.player_interactions?
      return JSON.parse localStorage.player_interactions
  return result ? { time: {}, count: {} }

save_player_interactions = (player_interactions) ->
  safe_localStorage_access ->
    localStorage.player_interactions = JSON.stringify player_interactions

netgames.register_player_interactions = (timestamp, players) ->

  player_interactions = get_player_interactions()

  for player in players
    player_interactions.time[player.id] = timestamp
    player_interactions.count[player.id] = (player_interactions.count[player.id] ? 0) + 1

  lowest_timestamp = _.values(player_interactions.time).sort()[KEEP_RECENT_NUM] ? null
  lowest_count = _.values(player_interactions.count).sort()[KEEP_FREQUENT_NUM] ? null

  if lowest_timestamp?
    for player_id, player_timestamp of player_interactions.time
      if player_timestamp < lowest_timestamp
        delete player_interactions.time[player_id]

  if lowest_count?
    for player_id, player_timestamp of player_interactions.count
      if player_timestamp < lowest_count
        delete player_interactions.count[player_id]

  save_player_interactions(player_interactions)

netgames.change_name_storage = (player_name) ->
  return false if player_name.length == 0
  safe_localStorage_access ->
    localStorage.player_name = player_name
  netgames?.player?.name = player_name
  return true

netgames.change = (state) ->
  netgames.socket.send(JSON.stringify({
    action: 'change',
    room_id: netgames.room_id
    player_id: netgames.player.id
    state: state
    # clock: netgames.room.clock.server
  }

netgames.shuffle = (amount) ->
  netgames.socket.send(JSON.stringify({
    action: 'shuffle',
    room_id: netgames.room_id
    player_id: netgames.player.id
    amount: amount
  }

netgames.join = ->
  netgames.socket.send(JSON.stringify({
    action: 'join',
    room_id: netgames.room_id
    player: netgames.player
    timestamp: Date.now()
  }

netgames.join_midway = ->
  netgames.socket.send(JSON.stringify({
    action: 'join-midway',
    room_id: netgames.room_id
    player_id: netgames.player.id
  }

netgames.change_name = (player_name) ->
  return false unless netgames.change_name_storage(player_name)
  netgames.socket.send(JSON.stringify({
    action: 'change-name',
    room_id: netgames.room_id
    player: netgames.player
  }
  return true

netgames.leave = ->
  netgames.socket.send(JSON.stringify({
    action: 'leave',
    room_id: netgames.room_id
    player_id: netgames.player.id
  }

netgames.boot = (player_ids) ->
  netgames.socket.send(JSON.stringify({
    action: 'boot',
    room_id: netgames.room_id
    player_ids
  }

netgames.restart = ->
  netgames.socket.send(JSON.stringify({
    action: 'restart',
    room_id: netgames.room_id
  }

netgames.measure_time_difference = ->
  netgames.socket.send(JSON.stringify({
    action: 'measure-time-difference',
    timestamp: Date.now()
  }

# Refresh the client once if needed
netgames.refresh_if = (needs_refresh) ->
  safe_localStorage_access ->
    if needs_refresh
      if not localStorage.client_refreshed
        localStorage.client_refreshed = true
        window.location.reload()
    else
      delete localStorage.client_refreshed

netgames.render = (state, players) ->

  console.log("logging from netgames.render room.coffee:228, state: " + state );
  console.log("logging from netgames.render room.coffee:229, state.phase: " + state.phase );
  $section = $('#' + state.phase)
  # If a section is missing, try refreshing the client once
  netgames.refresh_if($section.length == 0)

  if $section.is(':hidden')
    $(document).scrollTop(0)
  $('section').hide()
  $section.show()

  player = netgames.player_by_id(players, netgames.player.id)
  spectator = netgames.player_by_id(netgames.room.spectators, netgames.player.id)

  $content = $('#content')
  $content.toggleClass('host', players[0] == player)
  $content.toggleClass('spectator', spectator?)
  $content.toggleClass('has-spectators', netgames.room.spectators.length > 0)

  $utility_menu = $('#utility-menu')
  $utility_menu.toggleClass('huddle', state.phase == 'huddle')
  $utility_menu.toggleClass('can-leave', player?.can_leave ? false)
  $utility_menu.toggleClass('can-spectate', players.length > 1)
  $utility_menu.toggleClass('can-boot', players.some (player) -> player.can_leave)
  netgames.render_players(state, players, $utility_menu.find('.players'), netgames.utility_menu_player_class_predicates)
  netgames.render_players(state, netgames.room.spectators, $utility_menu.find('.spectators'), {
    'current-player': (state, spectators, spectator) -> spectator.id == netgames.player.id
    'boot-enabled': -> players[0].id == netgames.player.id
  })

  $spectator_base = $('#spectator-base')
  $spectator_base.toggleClass('can-join', true) #  netgames.room.can_join)

  netgames.prerender?(state, players, $section)
  phase = netgames.phases[state.phase]
  if typeof phase == 'function'
    # Backwards compatibility
    phase(state, players, $section)
  else
    phase?.render?(state, players, $section)
    phase?.refresh?(state, players, $section)

  $content.show()

netgames.refresh = ->
  state = netgames.state
  $section = $('#' + state.phase)
  phase = netgames.phases[state.phase]
  phase?.refresh?(state, netgames.players, $section)

netgames.phases = {}
netgames.utility_menu_player_class_predicates = {
  'current-player': (state, players, player) -> player.id == netgames.player.id
  'boot-enabled': (state, players, player) -> players[0].id == netgames.player.id and players[0].id != player.id and player.can_leave
}

netgames.add_phases = (phases) ->
  for name, phase of phases
    netgames.phases[name] = phase
netgames.add_utility_menu_player_class_predicates = (class_predicates) ->
  for klass, predicate of class_predicates
    netgames.utility_menu_player_class_predicates[klass] = predicate


netgames.lib = {}

adjectives = [
  'Alert'
  'Brave'
  'Clean'
  'Dark'
  'Eager'
  'Fast'
  'Good'
  'Huge'
  'Itchy'
  'Jolly'
  'Kind'
  'Large'
  'Mean'
  'Nice'
  'Odd'
  'Pink'
  'Quick'
  'Real'
  'Shy'
  'Tall'
  'Ugly'
  'Vigorous'
  'Warm'
  'Xenophobic'
  'Young'
  'Zesty'
]
nouns = [
  'Ants'
  'Bees'
  'Cats'
  'Dogs'
  'Eagles'
  'Fish'
  'Goats'
  'Hens'
  'Insects'
  'Jellyfish'
  'Koalas'
  'Lions'
  'Mice'
  'Newts'
  'Otters'
  'Pandas'
  'Quails'
  'Rabbits'
  'Sloths'
  'Turtles'
  'Unicorns'
  'Vultures'
  'Wombats'
  'Xylophones'
  'Yaks'
  'Zebras'
]
verbs = [
  'Ache'
  'Bite'
  'Cheer'
  'Dig'
  'Eat'
  'Fail'
  'Give'
  'Help'
  'Itch'
  'Jump'
  'Knit'
  'Lurk'
  'Move'
  'Nod'
  'Order'
  'Party'
  'Quit'
  'Read'
  'Stop'
  'Tease'
  'Unite'
  'Veer'
  'Wish'
  'X-Ray'
  'Yell'
  'Zoom'
]
adverbs = [
  'Angrily'
  'Busily'
  'Calmly'
  'Dryly'
  'Easily'
  'Fearlessly'
  'Grimly'
  'Happily'
  'Illegally'
  'Jokingly'
  'Keenly'
  'Lazily'
  'Madly'
  'Noisily'
  'Openly'
  'Politely'
  'Quietly'
  'Readily'
  'Swiftly'
  'Terribly'
  'Usefully'
  'Vaguely'
  'Weakly'
  'Xenophobically'
  'Yearly'
  'Zealously'
]

silly_sentence = (string) ->
  ordering = [adjectives, nouns, verbs, adverbs]
  return string.split('').map (letter, index) ->
    ordering[index][ letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0) ]
  .join ' '

extend_phase = (phase, additional = {}) ->
  # To be backwards compatible, we fall back to the 'method' property if 'render' doesn't exist
  old_render = phase.render ? phase.method
  old_attach = phase.attach
  old_refresh = phase.refresh
  # To preserve the other random things that might exist on the original phase, we extend the phase object directly
  phase.render = (state, players, $section) ->
    old_render?.call(phase, state, players, $section)
    additional.render?(state, players, $section)
  phase.method = phase.render # backwards compatibility
  phase.refresh = (state, players, $section) ->
    old_refresh?.call(phase, state, players, $section)
    additional.refresh?(state, players, $section)
  phase.attach = ($section) ->
    old_attach?.call(phase, $section)
    additional.attach?($section)
  return phase

netgames.lib.huddle = ({
  players_selector = '.players'
  spectators_selector = '.spectators'
  start_button_selector = '.start'
  leave_button_selector = '.leave'
  up_button_selector = '.up'
  down_button_selector = '.down'
  min_players = 1
  max_players = Infinity
  message = null
  enable_shuffle = false
} = {}, additional = {}) -> extend_phase {

  start: ->
    netgames.change ready: true

  leave: ->
    netgames.leave()

  move_up: ->
    netgames.shuffle -1

  move_down: ->
    netgames.shuffle 1

  attach: ($section) ->
    $section.find(start_button_selector).click @start
    $section.find(leave_button_selector).click @leave
    $section.find(up_button_selector).click @move_up
    $section.find(down_button_selector).click @move_down

  method: (state, players, $section) ->

    is_host = players[0].id == netgames.player.id
    is_second = players[1]?.id == netgames.player.id
    is_last = players[players.length-1].id == netgames.player.id

    $section.find('.room-id').text(netgames.room_id)
    $section.find('.phonetic').text(silly_sentence(netgames.room_id))
    $section.find('.shuffle').toggle(enable_shuffle and not state.booting)
    $section.find(up_button_selector).toggleClass('disabled', is_host or is_second)
    $section.find(down_button_selector).toggleClass('disabled', is_last)

    $message = $section.find('.message')
    $message.toggle(message?)
    if message?
      $message.text(message)

    netgames.render_players(state, players, $section.find(players_selector), {
      highlight: (state, players, player) -> player.id == netgames.player.id
    })
    netgames.render_players(state, netgames.room.spectators, $section.find(spectators_selector), {
      highlight: (state, players, player) -> player.id == netgames.player.id
    })

    $start_game = $section.find(start_button_selector)

    if players.length < min_players
      $start_game.addClass('disabled')
      $start_game.text("Need #{min_players} players...")
    else if players.length > max_players
      $start_game.addClass('disabled')
      $start_game.text('Too many players...')
    else
      $start_game.removeClass('disabled')
      $start_game.text('Start Game')
}, additional

netgames.lib.wait = ({
  selector = '.btn'
  text = 'OK'
  is_disabled = (state, players) -> false
  get_disabled_text = (state, players) -> null
} = {}, additional = {}) -> extend_phase {

  action: ->
    netgames.change ready: true

  attach: ($section) ->
    $section.find(selector).click @action

  method: (state, players, $section) ->
    $button = $section.find(selector)
    disabled = is_disabled(state, players)
    $button.toggleClass('disabled', disabled)
    if disabled
      $button.text(get_disabled_text(state, players))
    else
      $button.text(text)
}, additional

netgames.lib.wait_all = ({
  selector = '.btn',
  text = 'OK',
  is_disabled = (state, players) -> false
  get_disabled_text = (state, players) -> null
  get_no_shame_text = (state, players) -> null
  get_shame_players = (state, players) -> netgames.shame_players(state.ready, players, (ready) -> !ready)
} = {}, additional = {}) -> extend_phase {

  action: ->
    ready = {}
    ready[netgames.player.id] = true
    netgames.change ready: ready

  attach: ($section) ->
    $section.find(selector).click @action

  method: (state, players, $section) ->
    $button = $section.find(selector)
    ready = state.ready[netgames.player.id] ? false
    disabled = is_disabled(state, players)
    $button.toggleClass('disabled', ready || disabled)
    $button.text(
      if disabled
        get_disabled_text(state, players) ? text
      else if not ready
        text
      else
        netgames.generate_shame_text(get_shame_players(state, players), get_no_shame_text(state, players))
    )
}, additional

netgames.lib.pass = ({
  selector = '.btn',
  text = 'Pass',
  get_shame_players = (state, players) -> netgames.shame_players(state.pass, players, (val) -> !val),
} = {}, additional = {}) -> extend_phase {

  action: ->
    pass = {}
    pass[netgames.player.id] = true
    netgames.change pass: netgames.key_value(netgames.player.id, $(this).is('.btn-default'))

  attach: ($section) ->
    $section.find(selector).click @action

  method: (state, players, $section) ->
    $button = $section.find(selector)
    pass = state.pass[netgames.player.id]
    shame_players = get_shame_players(state, players)
    $button.toggleClass('btn-default', not pass)
    $button.toggleClass('btn-warning', pass)
    $button.text(
      if not pass
        text
      else
        netgames.generate_shame_text(shame_players)
    )
}, additional

netgames.lib.select_player = ({
  valid_target = '.enabled a:not(.disabled)'
  target_property = 'target'
  list_selector = '.list-group'
  ok_selector = '.btn'
  $player_template = $('''
    <a class="list-group-item">
      <span class="player-name"></span>
      <span class="label label-default"></span>
    </a>
  ''')
  get_id = (player, index) -> player.id
  get_icons = (state, players, player, index) -> ''
  is_enabled = (state, players) -> false
  is_active = (state, players, player, index) -> state[target_property] == get_id(player, index)
  is_disabled = (state, players, player, index) -> false
  filter = (state, players, player, index) -> true
  button_disabled = (state, players) -> not state[target_property]?
  change = (target_property, $player, id) -> netgames.key_value(target_property, if $player.is('.active') then null else id)
  render_extra = ($player, player, index) -> null
} = {}, additional = {}) -> extend_phase {

  action: ->
    $player = $(this)
    netgames.change change(target_property, $player, $player.data('id'))

  attach: ($section) ->
    $section.on 'click', list_selector + valid_target, @action
    $section.find(ok_selector).on 'click', (event) ->
      netgames.change ready: true

  method: (state, players, $section) ->
    $section.find(ok_selector).toggleClass 'disabled', button_disabled(state, players)

    $players = $section.find(list_selector)
    $players.toggleClass 'enabled', is_enabled(state, players)

    filtered_players = players.filter (player, index) -> filter(state, players, player, index)
    netgames.render_list $players, $player_template, filtered_players, ($player, player, index) ->
      $player.toggleClass('active', is_active(state, players, player, index))
      $player.toggleClass('disabled', is_disabled(state, players, player, index))
      player_id = get_id(player, index)
      $player.attr('data-id', player_id)
      $player.data('id', player_id)  # Backwards compatibility
      $player.find('.player-name').text(player.name)
      $player.find('.label').text(get_icons(state, players, player, index))
      render_extra($player, state, players, player, index)

}, additional

netgames.lib.multiplayer_vote = ({
  yes_selector = '.yes'
  yes_class = 'btn-success'
  no_selector = '.no'
  no_class = 'btn-danger'
  vote_property = 'votes'
  shame_selector = null # if specified, it will list the player who hasn't voted
} = {}, additional = {}) -> extend_phase {

  action: ->
    netgames.change netgames.key_value vote_property, netgames.key_value netgames.player.id, $(this).is(yes_selector)

  attach: ($section) ->
    $section.find(yes_selector).on 'click', @action
    $section.find(no_selector).on 'click', @action

  render: (state, players, $section) ->
    $section.find(yes_selector).toggleClass(yes_class, state[vote_property][netgames.player.id] != false)
    $section.find(yes_selector).toggleClass('btn-default', state[vote_property][netgames.player.id] == false)
    $section.find(no_selector).toggleClass(no_class, state[vote_property][netgames.player.id] != true)
    $section.find(no_selector).toggleClass('btn-default', state[vote_property][netgames.player.id] == true)

    if shame_selector?
      has_voted = state[vote_property][netgames.player.id]?
      shame_players = netgames.shame_players(state[vote_property], players, (val) -> not val?)
      $shame_text = $section.find(shame_selector)
      $shame_text.toggle(has_voted)
      $shame_text.text(netgames.generate_shame_text(shame_players))
}, additional

netgames.lib.choose_word_packs = ({
  pack_selector = '.word-packs .btn'
  confirm_setup_selector = '.confirm-setup'
} = {}, additional = {}) -> extend_phase(

  netgames.lib.wait({
    selector: confirm_setup_selector
    is_disabled: (state) -> _.sum(_.values(state.chosen_packs)) < 1
    get_disabled_text: (state, players) -> 'Select at least one pack'
  }, {

    render: (state, players, $section) ->
      $packs = $section.find(pack_selector)
      for pack in $packs
        $pack = $(pack)
        pack_name = $pack.data('pack-name')
        $pack.toggleClass('selected', state.chosen_packs[pack_name])

    attach: ($section) ->
      $section.find(pack_selector).click (event) ->
        $this = $(this)
        selected = $this.hasClass('selected')
        pack_name = $this.data('pack-name')
        netgames.change chosen_packs: netgames.key_value(pack_name, not selected)
  }),
  additional,
)

netgames.lib.two_teams = ({
  confirm_teams_selector = '.confirm-teams'
  blue_selector = '.btn.blue-team'
  blue_class = 'btn-primary'
  red_selector = '.btn.red-team'
  red_class = 'btn-danger'
  min_team_size = undefined
} = {}, additional = {}) -> extend_phase(

  netgames.lib.wait({
    selector: confirm_teams_selector
    text: 'Confirm teams'
    is_disabled: (state, players) ->
      team_counts = _.countBy(players, (player) => state.team[player.id])
      return Object.values(team_counts).some((count) => count < (min_team_size ? 0))
    get_disabled_text: (state, players) -> "Need at least #{min_team_size} per team..."
  }, {

    attach: ($section) ->
      $section.find(blue_selector).on 'click', ->
        netgames.change team: netgames.key_value netgames.player.id, 'blue'
      $section.find(red_selector).on 'click', ->
        netgames.change team: netgames.key_value netgames.player.id, 'red'

    render: (state, players, $section) ->
      team = state.team[netgames.player.id]
      $section.find(blue_selector)
        .toggleClass(blue_class, team == 'blue')
        .toggleClass('btn-default', team != 'blue')
      $section.find(red_selector)
        .toggleClass(red_class, team == 'red')
        .toggleClass('btn-default', team != 'red')

      player_ids = _.map(players, 'id')
      red_team = player_ids.filter((player_id) => state.team[player_id] == 'red')
      blue_team = player_ids.filter((player_id) => state.team[player_id] == 'blue')

      $section.find('.vs .red.num').text(red_team.length)
      $section.find('.vs .blue.num').text(blue_team.length)

      render_team = (player_ids, $players) ->
        netgames.render_players state, players.filter( (player) -> player.id in player_ids), $players, {
          'current-player': (state, players, player) -> player.id == netgames.player.id
        }

      render_team(red_team, $section.find('.players .red'))
      render_team(blue_team, $section.find('.players .blue'))
  }),
  additional,
)

netgames.lib.terminal = ({
  leave_selector = '.leave'
  restart_selector = '.restart'
  play_again_selector = '.play-again'
} = {}, additional = {}) -> extend_phase {

  leave: ->
    netgames.leave()

  restart: ->
    netgames.restart()

  play_again: ->
    $(this).addClass('disabled').text('Waiting for host...')

  attach: ($section) ->
    $section.find(leave_selector).click @leave
    $section.find(restart_selector).click @restart
    $section.find(play_again_selector).click @play_again
}, additional

netgames.lib.hide_flat = ({
  trigger = -> true
} = {}, additional = {}) ->
  screens = [{
    selector: '#game-content'
    pitch: 90
    default: true
  }, {
    selector: '#hide-flat'
    pitch: 0
  }]
  object = netgames.lib.rotation_screens {
    screens
    trigger
  }, {
    attach: () ->
      $('#hide-flat .show-anyway').on 'click', (event) ->
        object.current_screen = screens[0]
        object.toggle_screens()
  }
  return extend_phase object, additional

to_radians = (degrees) -> Math.PI/180 * degrees
to_degrees = (radians) -> 180/Math.PI * radians

netgames.lib.rotation = ({
  trigger = -> true
  on_change = null
  interval = 100
} = {}, additional = {}) -> extend_phase {

  originalEvent: null
  current:
    alpha: 0
    beta: 0
    gamma: 0
    pitch: 0
    roll: 0
    normal:
      x: 0
      y: 0
      z: 0

  active: false

  render: (state, players) ->
    @active = trigger(state, players)

  attach: ->

    $(window).on 'deviceorientation', ({originalEvent}) =>
      @originalEvent = originalEvent

    setInterval =>
      return unless @originalEvent?.alpha? and @active

      @current.alpha = @originalEvent.alpha
      @current.beta = @originalEvent.beta
      @current.gamma = @originalEvent.gamma

      rad_beta = to_radians @current.beta
      rad_gamma = to_radians @current.gamma
      cos_beta = Math.cos rad_beta
      cos_gamma = Math.cos rad_gamma
      sin_beta = Math.sin rad_beta
      sin_gamma = Math.sin rad_gamma

      @current.normal.x = cos_beta * sin_gamma
      @current.normal.y = sin_beta
      @current.normal.z = cos_beta * cos_gamma

      @current.pitch = to_degrees Math.acos @current.normal.z
      @current.roll = to_degrees Math.atan2 @current.normal.x, @current.normal.y

      on_change?(@)

    , interval
}, additional

dot_product = (a, b) -> a.x * b.x + a.y * b.y + a.z * b.z
vector_length = (a) -> Math.sqrt a.x*a.x + a.y*a.y + a.z*a.z
normalize = (a) ->
  length = vector_length a
  return { x: a.x/length, y: a.y/length, z: a.z/length }

netgames.lib.rotation_screens = ({
  screens = []
  trigger = -> true
  rotation_options = {}
  hysteresis = 0.7
} = {}, additional = {}) ->
  object = {

    # The screen to display
    current_screen: screens[0]
    # The screen which has the closest match to its target orientation
    min_screen: screens[0]

    attach: ->

      rotation_options.trigger = trigger
      rotation_options.on_change = object.on_change
      object.rotation = netgames.lib.rotation(rotation_options)
      object.rotation.attach()

      for screen in screens
        if screen.vector?
          screen.vector = normalize screen.vector
        else
          roll_length = Math.sin to_radians(screen.pitch ? 0)
          screen.vector = {
            x: roll_length * Math.sin to_radians(screen.roll ? 0)
            y: roll_length * Math.cos to_radians(screen.roll ? 0)
            z: Math.cos to_radians(screen.pitch ? 0)
          }

      object.toggle_screens()

    render: (args...) ->

      object.rotation.render args...

      if not object.rotation.active
        for screen in screens
          if screen.default
            object.min_screen = screen
            object.current_screen = screen
            object.toggle_screens()
            break

    toggle_screens: ->
      for screen in screens
        $(screen.selector).toggle screen == object.current_screen

    on_change: ->

      min_angle = hysteresis * Math.acos(dot_product object.rotation.current.normal, object.current_screen.vector) / (object.current_screen.weight ? 1)
      min_screen = object.current_screen
      for screen in screens
        continue if screen == object.current_screen
        angle = Math.acos(dot_product object.rotation.current.normal, screen.vector) / (screen.weight ? 1)
        if angle < min_angle
          min_angle = angle
          min_screen = screen

      if min_screen? and object.min_screen != min_screen
        object.min_screen = min_screen
        object.current_screen = min_screen
        object.toggle_screens()
  }
  return extend_phase(object, additional)

netgames.lib.clock = ({
  clock_selector = '.clock'
  display_selector = '.display'
  front_selector = '.front'
  back_selector = '.back'
  colours = ['#CCC', '#f39c12', '#e74c3c', '#b31a09']
} = {}, additional = {}) -> extend_phase {

  refresh: (state, players) ->
    $clock = $(clock_selector)
    width = +$clock.data('width')
    stroke_width = +$clock.data('stroke-width')

    start_time = netgames.to_client_timestamp(state.start_time)
    elapsed_millis = Math.max(0, Date.now() - start_time)
    elapsed_seconds = Math.floor(elapsed_millis/1000)
    elapsed_minutes = Math.floor(elapsed_seconds/60)

    back_steps = 1
    front_steps = 1
    uncounted_minutes = elapsed_minutes - colours.length + 1
    while uncounted_minutes > 0 and stroke_width*front_steps*2 < width
      ++back_steps
      if stroke_width*back_steps*2 > width
        ++front_steps
        back_steps = front_steps
      --uncounted_minutes
    back_diameter = (width - stroke_width * back_steps)
    front_diameter = (width - stroke_width * front_steps)
    front_circumference = Math.PI * front_diameter

    seconds = elapsed_seconds - elapsed_minutes*60
    circumference_left = (1 - seconds/60 - elapsed_minutes*2) * front_circumference
    seconds_text = if seconds < 10 then "0#{seconds}" else seconds.toString()
    clock_text = if elapsed_minutes
      "#{elapsed_minutes}:#{seconds_text}"
    else
      seconds_text
    colour_index = Math.min(colours.length - 1, elapsed_minutes)

    $clock.find(display_selector).text(clock_text)

    $front = $clock.find(front_selector)
    $front.attr('stroke', colours[colour_index])
    $front.attr('stroke-width', front_steps * stroke_width)
    $front.attr('stroke-dasharray', front_circumference + ' ' + front_circumference)
    $front.attr('stroke-dashoffset', circumference_left)
    $front.attr('r', front_diameter/2)

    $back = $clock.find(back_selector)
    $back.attr('stroke', colours[colour_index])
    $back.attr('stroke-width', back_steps * stroke_width)
    $back.attr('r', back_diameter/2)

    setTimeout(netgames.refresh, 1000 - elapsed_millis % 1000)

}, additional

# Implements a simple Kalman filter that measures a single variable.
#
# It has a fixed process variance, and approximates the measurement variance by taking deltas between adjacent
# measurements and incorporating them into an exponentially decaying average. This means that when the underlying
# measurement suddenly changes, the measurement variance recovers quickly.
#
# The filter will take measurements faster or slower depending on how close its 99% confidence interval is to the
# p99_acceptable_error. While it is not confident enough, it will poll at a period of min_update_interval_ms. When
# confidence is better than the target, it will poll only when the process_variance would bring confidence outside
# the target, or at a period of max_update_interval_ms.
#
# If a measurement has a z_score beyond the z_score_reset, then it's assumed that the underlying value has changed
# and the variance will be reset to a large number.
class ScalarKalmanFilter

  constructor: ({

    # The target confidence. The filter will try to be 99% certain that the difference between the true value and the
    # filter's estimate is no more than p99_acceptable_error.
    p99_acceptable_error

    # When called, it should trigger a call to update() with a new measurement
    @update_callback
    # The min and max interval that update_callback() will be called at, depending on confidence
    @min_update_interval_ms = 1 * 1000
    @max_update_interval_ms = 20 * 1000

    # A constant defined by the user. Indiciates how much the variance of the time difference should increase per second.
    @process_variance
    # An initial guess at the variance in time difference measurements.
    @initial_measurement_variance
    # How many more times the present estimate of measurement variance should weigh into the updated esimate when
    # compared to a new data point.
    @measurement_variance_weight = 4
    # If a measurement has an absolute z-score greater than this, then we assume the hidden variable has changed
    # its value and reset its variance to a large number.
    @z_score_reset = 3.2905  # 0.1% chance that the current measurement came from the previously observed distribution
  } = {}) ->

    @time_difference = 0
    @variance = 1e10

    @measurement_variance = @initial_measurement_variance
    @previous_measurement = null

    @last_update = Date.now()
    @update_timeout = setTimeout(@update_callback, 0)
    @p99_acceptable_variance = Math.pow(p99_acceptable_error/2.575829306, 2)

  update: (measurement, error_bounds = null) =>

    # Incorporate process variance
    now = Date.now()
    time_since_last_update = Math.max(0, now - @last_update)
    @last_update = now
    @variance += @process_variance * time_since_last_update/1000

    # Update measurement variance
    if @previous_measurement?
      measurement_delta = @previous_measurement - measurement
      @measurement_variance = (
        (@measurement_variance * @measurement_variance_weight + Math.pow(measurement_delta, 2)/2 ) /
        (@measurement_variance_weight + 1)
      )

    # Reduce measurement variance to p99 based on absolute error bounds
    measurement_variance = @measurement_variance
    if error_bounds?
      measurement_variance = Math.min(measurement_variance, Math.pow(error_bounds/2.575829306, 2))

    # Reset the hidden variable variance if the last measurement differed significantly from previous ones.
    # This implies that the value of the hidden variable has changed.
    z_score = (measurement - @time_difference) / Math.sqrt(measurement_variance + @variance)
    if Math.abs(z_score) > @z_score_reset
      @variance = 1e10

    # Incorporate measurement using optimal Kalman gain
    measurement_diff = measurement - @time_difference
    optimal_kalman_gain = @variance/(measurement_variance + @variance)
    @time_difference += measurement_diff * optimal_kalman_gain
    @variance = (1-optimal_kalman_gain) * @variance

    # Clamp time_difference based on absolute error bounds
    if error_bounds?
      @time_difference = Math.max(measurement - error_bounds, Math.min(@time_difference, measurement + error_bounds))

    # Schedule next update
    time_until_process_variance_dominates = (@p99_acceptable_variance - @variance)/@process_variance * 1000
    time_until_next_update = Math.min(Math.max(@min_update_interval_ms, time_until_process_variance_dominates), @max_update_interval_ms)
    clearTimeout(@update_timeout)
    @update_timeout = setTimeout(@update_callback, time_until_next_update)

    # Record this measurement for the next update
    @previous_measurement = measurement


update_time_difference_filter = (client_timestamp, server_timestamp) ->
  time_to_return = (Date.now() - client_timestamp)/2
  time_difference = server_timestamp - (client_timestamp + time_to_return)
  netgames.time_difference_filter.update(time_difference, time_to_return)
  netgames.time_difference = netgames.time_difference_filter.time_difference


update_room = (event.data) ->

  ## Check whether the received room is stale. If so, send a recovery message to bring game state back up to date.
  #same_room = netgames.room?.created == room.created
  #clock_difference = (netgames.room?.clock?.server ? 0) - room.clock.server
  #time_difference = (netgames.room?.last_modified ? 0) - room.last_modified
  ## Only recover the room if the clock is ahead of the received room, or if it's the same but was modified afterwards.
  #if same_room and (clock_difference > 0 or (clock_difference == 0 and time_difference > 0))
  #  netgames.socket.send(JSON.stringify({
  #  action: 'recover',
  #  room: netgames.room)}
  #else
  #  netgames.room = room
  netgames.state = event.data.state
  netgames.players = event.data.players
  netgames.room = event.data
  console.log(' inside update_room - room.coffee:1091 - netgames:' + netgames)

  netgames.render(netgames.room.state, netgames.room.players)


join_room = ->

  room_id = netgames.room_id = $('#room-id').val()

  host = window.location.host

  socket = netgames.socket = new WebSocket('wss://' + window.netgames_host + '/socket/');

  socket.onopen = function(event) {
    $('#connecting').hide()
  };

    unless netgames.time_difference_filter?
      netgames.time_difference_filter = new ScalarKalmanFilter({
        p99_acceptable_error: 100
        update_callback: netgames.measure_time_difference
        process_variance: 0.1
        initial_measurement_variance: 1e4
      })
    netgames.join()

  socket.onclose = function(event) {
    if reason == 'io server disconnect'
      $('#disconnected').show()
  };

#  socket.on 'reconnecting', ->
#    $('#connecting').show()
#
#  socket.on 'time-difference', ({client_timestamp, server_timestamp}) ->
#    update_time_difference_filter(client_timestamp, server_timestamp)
#
#  socket.on 'joined', ({client_timestamp, server_timestamp, room}) ->
#    update_time_difference_filter(client_timestamp, server_timestamp)
#    update_room(room)
#
#  socket.on 'left', ->
#    socket.disconnect(true)
#    # Navigate to '..', but retain query params so that the Google translate proxy doesn't break...
#    window.location = window.location.toString().replace(/[^/]*[/][^/?]*($|(?=\?))/, '')
#
#  socket.on 'booted', (player_id) ->
#    if netgames.player.id == player_id
#      $('#content').hide()
#      $('#booted').show()
#      socket.disconnect(true)
#
  socket.onmessage(event) = function(event) {
    if (event.action == 'state') {
      update_room(event.data)
    }
  } 

#  socket.on 'register-player-interactions', ({timestamp, players}) ->
#    netgames.register_player_interactions(timestamp, players)
#    dataLayer.push event: 'register-player-interactions'

  socket.onerror = function(event) {
    $('#error-message').text(event)
    console.error event
  };

$ ->

  for name, phase of netgames.phases
    phase.attach?($('#' + name))

  $create_user = $('#create-user')

  $create_user.find('a').click ->
    $create_user.submit()

  $create_user.submit (event) ->
    event.preventDefault()
    player_name = $('#create-user input').val()
    return unless netgames.change_name_storage(player_name)
    $create_user.hide()
    join_room()

  netgames.player = {}
  netgames.player.id = safe_localStorage_access(-> localStorage.player_id)
  netgames.player.name = safe_localStorage_access -> localStorage.player_name

  safe_localStorage_access ->
    if not localStorage.player_id?
      localStorage.player_id = netgames.player.id

  if netgames.player.name?
    join_room()
  else
    #if URLSearchParams
    #  url_params = new URLSearchParams(window.location.search)
    #  for key in Array.from(url_params.keys())
    #    if key.endsWith('name')
    #      $create_user.find('input').val(url_params.get(key))
    #      break
    $create_user.show()

  $('#booted .join-again').click ->
    window.location.reload()

  # Utility menu

  $utility_menu = $('#utility-menu')
  $change_name = $utility_menu.find('.change-name')
  to_boot = new Set();

  clear_reset_button = ->
    $reset_game = $utility_menu.find('.reset-game')
    $reset_game.removeClass('btn-danger')
    $reset_game.addClass('btn-default')

  open_change_name_form = ->
    $change_name.addClass('open')
    $input = $change_name.find('input')
    $input.val(netgames.player.name)
    $input.focus()

  close_change_name_form = ->
    $change_name.removeClass('open')
    $change_name.find('input').val('')

  render_boot = ->
    booting = $utility_menu.hasClass('booting')

    no_players_selected = booting and to_boot.length == 0
    $boot_players = $utility_menu.find('.boot-players.btn-primary')
    $boot_players.toggleClass('disabled', no_players_selected)
    $boot_players.text(
      if no_players_selected
        'Select players to boot'
      else
        'Boot players'
    )

    for player in $utility_menu.find('.players li, .spectators li')
      $player = $(player)
      player_id = $player.data('id')
      $player.toggleClass('to-boot', to_boot.has(player_id))

  clear_booting = ->
    to_boot.clear()
    $utility_menu.removeClass('booting')
    render_boot()

  open_utility_menu = ->
    $utility_menu.addClass('open')
    clear_booting()
    close_change_name_form()
    clear_reset_button()

  close_utility_menu = ->
    $utility_menu.removeClass('open')
    clear_booting()
    close_change_name_form()
    clear_reset_button()

  $(document).on 'click', '.utility-menu-button', (event) ->
    open_utility_menu()

  $utility_menu.find('.shade, .close-button').click (event) ->
    close_utility_menu()

  $utility_menu.find('.reset-game').click (event) ->
    $this = $(this)
    if $this.is('.btn-default')
      $this.removeClass('btn-default')
      $this.addClass('btn-danger')
    else if $this.is('.btn-danger')
      close_utility_menu()
      netgames.restart()

  $utility_menu.find('.boot-players.btn-default').click (event) ->
    $utility_menu.addClass('booting')
    render_boot()

  $utility_menu.find('.boot-players.btn-primary').click (event) ->
    netgames.boot(Array.from(to_boot))
    close_utility_menu()

  $utility_menu.find('.players, .spectators').on 'click', 'li.boot-enabled', (event) ->
    player_id = $(this).data('id')
    if to_boot.has(player_id)
      to_boot.delete(player_id)
    else
      to_boot.add(player_id)
    render_boot()

  $utility_menu.find('.boot-cancel').click (event) ->
    $utility_menu.removeClass('booting')
    render_boot()

  $utility_menu.find('.spectate').click (event) ->
    close_utility_menu()
    netgames.boot([netgames.player.id])

  $utility_menu.find('.leave-game').click (event) ->
    close_utility_menu()
    netgames.leave()

  $change_name.find('> a').click (event) ->
    open_change_name_form()

  $change_name.find('form a').click (event) ->
    $change_name.find('form').submit()

  $change_name.find('form').submit (event) ->
    event.preventDefault()
    $input = $(this).find('input')
    if netgames.change_name($input.val())
      close_change_name_form()

  # Spectator base

  $spectator_base = $('#spectator-base')

  $spectator_base.find('.join-in').click (event) ->
    netgames.join_midway()

  $spectator_base.find('.leave-game').click (event) ->
    netgames.leave()

  # Info panel

  $info_panel = $('#info')
  $info_menu_button = $('.info-menu-button')

  $info_menu_button.on 'click', (event) ->
    $info_panel.addClass('open')

  $info_panel.find('.shade, .close-button').click (event) ->
    $info_panel.removeClass('open')
