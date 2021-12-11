(function () {
  'use strict';

  const data = {
      min_players: 3,
      locations: [
          'Airplane',
          'Bank',
          'Beach',
          'Cathedral',
          'Circus Tent',
          'Corporate Party',
          'Crusader Army',
          'Casino',
          'Day Spa',
          'Embassy',
          'Hospital',
          'Hotel',
          'Military Base',
          'Movie Studio',
          'Ocean Liner',
          'Passenger Train',
          'Pirate Ship',
          'Polar Station',
          'Police Station',
          'Restaurant',
          'School',
          'Service station',
          'Space station',
          'Submarine',
          'Supermarket',
          'Theater',
          'University',
          'World War II Squad',
      ],
  };

  /// <reference lib="DOM" />
  const netgames = window.netgames;
  let clock_timeout = null;
  const reveal_spy = (state, players, $section) => {
      const player = netgames.player_by_id(players, state.the_spy);
      $section.find('.spy-name').text(player.name);
  };
  netgames.add_phases({
      huddle: netgames.lib.huddle({ min_players: data.min_players }),
      identify: netgames.lib.wait_all({}, {
          render: (state, players, $section) => {
              const role = state.roles[netgames.player.id];
              $section.find('.role').text(role);
              $section.find('.location').text(state.location);
          },
      }),
      question: {
          render: (state, players, $section) => {
              const $clock = $section.find('.clock');
              const now = netgames.to_server_timestamp(Date.now());
              const millis_left = Math.max(0, state.deadline - now);
              const seconds_left = Math.floor(millis_left / 1000);
              const minutes_left = Math.floor(seconds_left / 60);
              const seconds = ('0' + (seconds_left - minutes_left * 60)).slice(-2);
              $clock.text(`${minutes_left}:${seconds}`);
              const timeout = millis_left > 0 ? millis_left % 1000 : 1000;
              clock_timeout = setTimeout(() => {
                  netgames.render(state, players);
              }, timeout);
              const $ul = $section.find('ul');
              $ul.empty();
              for (const location of data.locations) {
                  $ul.append(`<li>${location}</li>`);
              }
          },
      },
      vote: {
          render: (state, players, $section) => {
              var _a, _b;
              const tally = {};
              for (const player_id of _.values(state.votes)) {
                  if (!player_id)
                      continue;
                  tally[player_id] = ((_a = tally[player_id]) !== null && _a !== void 0 ? _a : 0) + 1;
              }
              const $buttons = $section.find('.list-group');
              $buttons.empty();
              for (const player of players) {
                  const disabled = player.id === netgames.player.id ? 'disabled' : '';
                  const colour = tally[player.id] + 2 >= players.length ? 'label-danger' : 'label-warning';
                  const active = player.id === state.votes[netgames.player.id] ? 'active' : '';
                  $buttons.append(`
        <a class="list-group-item ${active} ${disabled}" data-id='${player.id}'>
          ${player.name}
          <span class="label ${colour}">${(_b = tally[player.id]) !== null && _b !== void 0 ? _b : ''}</span>
        </a>
      `);
              }
          },
          attach: ($section) => {
              $section.find('.list-group').on('click', 'a', function () {
                  const player_id = $(this).data('id');
                  if (player_id === netgames.player.id)
                      return;
                  const vote = $(this).is('.active') ? null : player_id;
                  netgames.change({ votes: { [netgames.player.id]: vote } });
              });
          },
      },
      'spy-guess': netgames.lib.terminal({}, {
          render: (state, players, $section) => {
              reveal_spy(state, players, $section);
              const $buttons = $section.find('.buttons');
              $buttons.empty();
              for (const location of data.locations) {
                  $buttons.append(`<a class='btn btn-default'>${location}</a>`);
              }
          },
          attach: ($section) => {
              $section.find('.buttons').on('click', 'a', function () {
                  netgames.change({ spy_guess: $(this).text() });
              });
          },
      }),
      'spy-win': netgames.lib.terminal({}, {
          render: (state, players, $section) => {
              reveal_spy(state, state.players, $section);
              $section.find('.location').text(state.location);
          },
      }),
      'spy-win-location': netgames.lib.terminal(),
      'others-win': netgames.lib.terminal({}, {
          render: (state, players, $section) => {
              var _a;
              $section.find('.spy-guess').text((_a = state.spy_guess) !== null && _a !== void 0 ? _a : '');
              $section.find('.location').text(state.location);
          },
      }),
  });
  netgames.prerender = (state) => {
      if (clock_timeout)
          clearTimeout(clock_timeout);
      const $content = $('#content');
      $content.toggleClass('spy', netgames.player.id === state.the_spy);
      $content.toggleClass('hide-content-ads', state.phase === 'identify');
  };

}());
