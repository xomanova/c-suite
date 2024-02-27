// Generated by CoffeeScript 1.12.7
(function() {
  var create_policy_cards, data, get_icons, get_theme, hide_flat, huddle, is_chancellor, is_president, key_value, multiplayer_vote, games, render_player_list, render_policy_board, render_previous_vote, select_chancellor, select_next_president, select_to_execute, select_to_investigate, setup_policy_board, terminal, wait, wait_all;

  games = window.games;

  data = games.data;

  key_value = games.key_value;

  huddle = games.lib.huddle({
    min_players: data.min_players,
    max_players: data.max_players,
    enable_shuffle: true,
    message: ''
  });

  wait_all = games.lib.wait_all();

  wait = games.lib.wait();

  terminal = games.lib.terminal();

  multiplayer_vote = games.lib.multiplayer_vote({
    yes_selector: '.ja',
    no_selector: '.nein',
    shame_selector: '.shame-text'
  });

  select_chancellor = games.lib.select_player({
    target_property: 'chancellor'
  });

  select_to_execute = games.lib.select_player({
    target_property: 'to_execute'
  });

  select_to_investigate = games.lib.select_player({
    target_property: 'to_investigate'
  });

  select_next_president = games.lib.select_player({
    target_property: 'next_president'
  });

  hide_flat = games.lib.hide_flat({
    trigger: function(state, players) {
      var ref, ref1;
      return ((ref = state.phase) === 'identify' || ref === 'vote') || (state.phase === 'president' && is_president(state, players)) || (state.phase === 'chancellor' && is_chancellor(state, players)) || (((ref1 = state.phase) === 'policy_peek' || ref1 === 'investigation_result') && is_president(state, players));
    }
  });

  get_theme = function(state) {
    return data.themes.find(function(theme) {
      return theme.id === state.theme;
    });
  };

  create_policy_cards = function($policies, policies, size, theme) {
    var $existing_policies, $icon, $policy, i, index, len, policy, results;
    $existing_policies = $policies.find('.policy');
    results = [];
    for (index = i = 0, len = policies.length; i < len; index = ++i) {
      policy = policies[index];
      if ($existing_policies.length <= index) {
        $policy = $("<li class=\"policy w" + size + "\">\n  <span class=\"glyphicon-large\"></span>\n  <h1></h1>\n  <div class=\"text\"></div>\n</li>");
        $policies.append($policy);
      } else {
        $policy = $($existing_policies[index]);
      }
      $policy.toggleClass('liberal', policy);
      $policy.toggleClass('fascist', !policy);
      $policy.data('index', index);
      $policy.find('h1').text(policy ? theme.text.liberal_card : theme.text.fascist_card);
      $icon = $policy.find('.glyphicon-large');
      $icon.toggleClass('glyphicon-bank', policy);
      results.push($icon.toggleClass('glyphicon-skull', !policy));
    }
    return results;
  };

  render_player_list = function($players, players, arg) {
    var active, disabled, get_icons, get_id, i, index, is_active, is_disabled, len, player, ref, ref1, ref2, ref3, ref4, results;
    ref = arg != null ? arg : {}, is_active = (ref1 = ref.is_active) != null ? ref1 : function() {
      return false;
    }, is_disabled = (ref2 = ref.is_disabled) != null ? ref2 : function() {
      return false;
    }, get_id = (ref3 = ref.get_id) != null ? ref3 : function(player) {
      return player.id;
    }, get_icons = (ref4 = ref.get_icons) != null ? ref4 : function() {
      return '';
    };
    $players.empty();
    results = [];
    for (index = i = 0, len = players.length; i < len; index = ++i) {
      player = players[index];
      active = is_active(player, index) ? 'active' : '';
      disabled = is_disabled(player, index) ? 'disabled' : '';
      results.push($players.append("<a class=\"list-group-item " + active + " " + disabled + "\" data-id=\"" + (get_id(player, index)) + "\">\n  " + player.name + "\n  <span class=\"label label-default\">" + (get_icons(player, index)) + "</span>\n</a>"));
    }
    return results;
  };

  get_icons = function(state, players) {
    return function(player) {
      var president_icon, skull_icon;
      skull_icon = state.executed[player.id] ? '💀' : '';
      president_icon = player.id === players[state.president].id ? '👑' : '';
      return skull_icon + president_icon;
    };
  };

  games.add_phases({
    huddle: huddle.method,
    setup: function(state, players, $section) {
      var $a, a, i, len, ref, results;
      $section.find('.themes').toggleClass('disabled', games.player.id !== players[0].id);
      ref = $section.find('.themes a');
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        a = ref[i];
        $a = $(a);
        results.push($a.toggleClass('active', $a.attr('data-id') === state.theme));
      }
      return results;
    },
    intro: function(state, players, $section) {
      var $ol, fascist_num, i, len, player, results, theme;
      wait_all.method(state, players, $section);
      theme = get_theme(state);
      fascist_num = Math.floor(data.fascist_ratio * players.length);
      $section.find('.fascist.num').text(fascist_num);
      $section.find('.liberal.num').text(players.length - fascist_num);
      $section.find('.liberal.target-policy-num').text(data.liberal_target_policies + " " + theme.text.policies);
      $section.find('.fascist.target-policy-num').text(data.fascist_target_policies + " " + theme.text.policies);
      $section.find('.hitler-policy-num').text(data.hitler_win_min_policies + " " + theme.text.policies);
      $section.find('.blind-hitler').toggle(players.length >= data.blind_hitler_min_players);
      $section.find('.liberal.policy-num').text(data.num_liberal_policies + " " + theme.text.liberal + " " + theme.text.policies);
      $section.find('.fascist.policy-num').text(data.num_fascist_policies + " " + theme.text.fascist + " " + theme.text.policies);
      $section.find('.no-president').toggle(players.length > data.reelect_president_max_players);
      $section.find('.max-refusals').text("" + data.max_refusals);
      $section.find('.fascist.veto-min-policies').text(data.veto_min_policies + " " + theme.text.fascist + " " + theme.text.policies);
      $ol = $section.find('ol');
      $ol.empty();
      results = [];
      for (i = 0, len = players.length; i < len; i++) {
        player = players[i];
        results.push($ol.append("<li>" + player.name + "</li>"));
      }
      return results;
    },
    identify: function(state, players, $section) {
      var $allegiance, $fascists, $ul, fascists_to_display, i, is_hitler, is_hitler_blind, is_liberal, len, player, role, show_hitler, theme;
      wait_all.method(state, players, $section);
      theme = get_theme(state);
      is_liberal = state.allegiance[games.player.id];
      is_hitler = state.hitler === games.player.id;
      is_hitler_blind = players.length >= data.blind_hitler_min_players;
      role = is_hitler ? theme.text.hitler : is_liberal ? theme.text.of_liberal_allegiance : theme.text.of_fascist_allegiance;
      $allegiance = $section.find('.allegiance');
      $allegiance.text(role);
      $allegiance.toggleClass('liberal', is_liberal);
      $allegiance.toggleClass('fascist', !is_liberal);
      $section.find('.blind-hitler').toggle(!is_liberal && is_hitler_blind);
      show_hitler = !is_liberal && !is_hitler;
      $section.find('.hitler').toggle(show_hitler);
      if (show_hitler) {
        $section.find('.hitler .name').text(games.player_by_id(players, state.hitler).name);
      }
      if (!is_liberal && (!is_hitler || !is_hitler_blind)) {
        $ul = $section.find('.fascists ul');
        $ul.empty();
        fascists_to_display = 0;
        for (i = 0, len = players.length; i < len; i++) {
          player = players[i];
          if (!(!state.allegiance[player.id] && player.id !== games.player.id && player.id !== state.hitler)) {
            continue;
          }
          $ul.append("<li>" + player.name + "</li>");
          ++fascists_to_display;
        }
        $fascists = $section.find('.fascists');
        $fascists.toggle(fascists_to_display > 0);
        $fascists.find('.plural').toggle(fascists_to_display !== 1);
        return $fascists.find('.singular').toggle(fascists_to_display === 1);
      } else {
        return $section.find('.fascists').hide();
      }
    },
    propose: function(state, players, $section) {
      var $players, president;
      president = players[state.president];
      $section.find('.btn').toggleClass('disabled', state.chancellor == null);
      $players = $section.find('.list-group');
      $players.toggleClass('enabled', is_president(state, players));
      return render_player_list($players, players, {
        is_active: function(player) {
          return player.id === state.chancellor;
        },
        is_disabled: function(player) {
          var ref, ref1;
          return ((ref = player.id) === state.previous_chancellor || ref === president.id) || (player.id === ((ref1 = players[state.previous_president]) != null ? ref1.id : void 0) && players.filter((function(_this) {
            return function(player) {
              return !state.executed[player.id];
            };
          })(this)).length > data.reelect_president_max_players) || state.executed[player.id];
        },
        get_icons: get_icons(state, players)
      });
    },
    vote: function(state, players, $section) {
      return multiplayer_vote.render(state, players, $section);
    },
    president: function(state, players, $section) {
      var $policies, president;
      president = players[state.president];
      $section.find('.btn').toggleClass('disabled', state.to_discard == null);
      $policies = $section.find('.policies');
      create_policy_cards($policies, state.policy_options, 125, get_theme(state));
      return $policies.find('.policy').each(function(index, element) {
        return $(element).toggleClass('discard', index === state.to_discard);
      });
    },
    chancellor: function(state, players, $section) {
      var $policies;
      $section.find('.veto').toggle(state.num_enacted.fascist >= data.veto_min_policies && state.veto !== false);
      $section.find('.enact').toggleClass('disabled', state.to_enact == null);
      $policies = $section.find('.policies');
      create_policy_cards($policies, state.policy_options, 175, get_theme(state));
      return $policies.find('.policy').each(function(index, element) {
        $(element).toggleClass('discard', (state.to_enact != null) && index !== state.to_enact);
        return $(element).toggleClass('enact', (state.to_enact != null) && index === state.to_enact);
      });
    },
    confirm_veto: function(state, players, $section) {},
    check_outcome: function(state, players, $section) {
      var $policies, is_populace;
      is_populace = state.refusals >= data.max_refusals;
      $section.find('.populace').toggle(is_populace);
      $section.find('.not-populace').toggle(!is_populace);
      $policies = $section.find('.policies');
      return create_policy_cards($policies, [state.last_enacted], 250, get_theme(state));
    },
    policy_peek: function(state, players, $section) {
      var $policies;
      $policies = $section.find('.policies');
      return create_policy_cards($policies, state.deck.slice(state.removed, state.removed + 3), 125, get_theme(state));
    },
    investigation: function(state, players, $section) {
      var $players, president;
      president = players[state.president];
      $section.find('.btn').toggleClass('disabled', state.to_investigate == null);
      $players = $section.find('.list-group');
      $players.toggleClass('enabled', is_president(state, players));
      return render_player_list($players, players, {
        is_active: function(player) {
          return player.id === state.to_investigate;
        },
        is_disabled: function(player) {
          return player.id === president.id || state.executed[player.id];
        },
        get_icons: get_icons(state, players)
      });
    },
    investigation_result: function(state, players, $section) {
      var $result, player, result, theme;
      theme = get_theme(state);
      player = games.player_by_id(players, state.to_investigate);
      result = state.allegiance[player.id];
      $section.find('.player-name').text(games.player.id === player.id ? 'You' : player.name);
      $result = $section.find('.result');
      $result.text(result ? theme.text.of_liberal_allegiance : theme.text.of_fascist_allegiance);
      $result.toggleClass('liberal', result);
      return $result.toggleClass('fascist', !result);
    },
    special_election: function(state, players, $section) {
      var $players, president;
      president = players[state.president];
      $section.find('.btn').toggleClass('disabled', state.next_president == null);
      $players = $section.find('.list-group');
      $players.toggleClass('enabled', is_president(state, players));
      return render_player_list($players, players, {
        is_active: function(player) {
          var ref;
          return player.id === ((ref = players[state.next_president]) != null ? ref.id : void 0);
        },
        is_disabled: function(player) {
          return player.id === president.id || state.executed[player.id];
        },
        get_id: function(player, index) {
          return index;
        },
        get_icons: get_icons(state, players)
      });
    },
    execution: function(state, players, $section) {
      var $players, president;
      president = players[state.president];
      $players = $section.find('.list-group');
      $players.toggleClass('enabled', is_president(state, players));
      render_player_list($players, players, {
        is_active: function(player) {
          return player.id === state.to_execute;
        },
        is_disabled: function(player) {
          return player.id === president.id || state.executed[player.id];
        },
        get_icons: get_icons(state, players)
      });
      return $section.find('.btn').toggleClass('disabled', state.to_execute == null);
    },
    execution_result: function(state, players, $section) {
      var executee, is_executee;
      executee = games.player_by_id(players, state.to_execute);
      is_executee = games.player.id === executee.id;
      return $section.find('.executee-name').text(is_executee ? 'You' : executee.name);
    },
    fascist_victory: function(state, players, $section) {
      var theme;
      $section.find('.outcome').text(state.allegiance[games.player.id] ? 'You lose' : 'You win!');
      theme = get_theme(state);
      return $section.find('.reason').text(state.num_enacted.fascist >= data.fascist_target_policies ? "Enough " + theme.text.fascist + " " + theme.text.policies + " have been enacted" : theme.text.hitler + " was elected " + theme.text.chancellor);
    },
    liberal_victory: function(state, players, $section) {
      var theme;
      $section.find('.outcome').text(state.allegiance[games.player.id] ? 'You win!' : 'You lose');
      theme = get_theme(state);
      return $section.find('.reason').text(state.executed[state.hitler] ? theme.text.hitler + " was executed" : "Enough " + theme.text.liberal + " " + theme.text.policies + " have been enacted");
    }
  });

  is_president = function(state, players) {
    var ref;
    return ((ref = players[state.president]) != null ? ref.id : void 0) === games.player.id;
  };

  is_chancellor = function(state, players) {
    return state.chancellor === games.player.id;
  };

  games.prerender = function(state, players, $section) {
    var $content, $policy_board, $previous_vote, $result, $veto_result, display_board, display_previous_vote, display_veto, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, theme;
    $content = $('#content');
    $content.toggleClass('president', is_president(state, players));
    $content.toggleClass('chancellor', is_chancellor(state, players));
    $content.toggleClass('executee', state.to_execute === games.player.id);
    $content.toggleClass('executed', ((ref = (ref1 = state.executed) != null ? ref1[games.player.id] : void 0) != null ? ref : false) && !state.phase.endsWith('_victory'));
    $content.toggleClass('hitler', state.hitler === games.player.id);
    $content.toggleClass('fascist', ((ref2 = state.allegiance) != null ? ref2[games.player.id] : void 0) === false);
    $content.toggleClass('liberal', ((ref3 = state.allegiance) != null ? ref3[games.player.id] : void 0) === true);
    $content.toggleClass('hide-content-ads', state.phase === 'identify');
    $section.find('.president-name').text((ref4 = players[state.president]) != null ? ref4.name : void 0);
    $section.find('.chancellor-name').text((ref5 = games.player_by_id(players, state.chancellor)) != null ? ref5.name : void 0);
    display_board = (ref6 = state.phase) !== 'huddle' && ref6 !== 'setup' && ref6 !== 'identify';
    $policy_board = $('#policy-board');
    $policy_board.toggle(display_board);
    if (display_board) {
      render_policy_board(state, players);
    }
    $veto_result = $('#veto-result');
    display_veto = state.previous_phase === 'confirm_veto';
    $veto_result.toggle(display_veto);
    $result = $veto_result.find('.veto-result');
    $result.text(state.veto ? 'accepted' : 'denied');
    $result.toggleClass('text-success', state.veto);
    $result.toggleClass('text-danger', !state.veto);
    display_previous_vote = (ref7 = state.previous_phase) === 'vote' || ref7 === 'uprising';
    $previous_vote = $('#previous-vote');
    $previous_vote.toggle(display_previous_vote);
    if (display_previous_vote) {
      render_previous_vote(state, players);
    }
    hide_flat.render(state, players, $section);
    theme = get_theme(state);
    if (theme != null) {
      return games.render_theme($content, theme);
    }
  };

  setup_policy_board = function() {
    var $container, $policy_board, $span, a, num, ref, results, selector;
    $policy_board = $('#policy-board');
    ref = {
      '.fascist': data.fascist_target_policies,
      '.liberal': data.liberal_target_policies,
      '.refusals': data.max_refusals
    };
    results = [];
    for (selector in ref) {
      num = ref[selector];
      $container = $policy_board.find(selector);
      results.push((function() {
        var i, ref1, results1;
        results1 = [];
        for (a = i = 0, ref1 = num; 0 <= ref1 ? i < ref1 : i > ref1; a = 0 <= ref1 ? ++i : --i) {
          $span = $('<span>');
          $container.append($span);
          if (selector === '.fascist') {
            if (a >= data.hitler_win_min_policies) {
              results1.push($span.addClass('danger'));
            } else {
              results1.push(void 0);
            }
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      })());
    }
    return results;
  };

  render_policy_board = function(state, players) {
    var $container, $policy_board, fascist_powers, icons, num, ref, results, selector;
    icons = {
      policy_peek: 'glyphicon-eye-open',
      execution: 'glyphicon-skull',
      investigation: 'glyphicon-search',
      special_election: 'glyphicon-star'
    };
    fascist_powers = data.fascist_powers[Math.max(5, Math.min(9, 1 + 2 * Math.floor((players.length - 1) / 2)))];
    $policy_board = $('#policy-board');
    $policy_board.find('.deck-num').text(state.deck.length - state.removed);
    ref = {
      '.fascist': state.num_enacted.fascist,
      '.liberal': state.num_enacted.liberal,
      '.refusals': state.refusals
    };
    results = [];
    for (selector in ref) {
      num = ref[selector];
      $container = $policy_board.find(selector);
      results.push($container.find('span').each(function(index, element) {
        var $element, power;
        $element = $(element);
        $element.toggleClass('active', (selector !== '.liberal' && index < num) || (selector === '.liberal' && data.liberal_target_policies - index <= num));
        if (selector === '.fascist') {
          for (power in icons) {
            $element.toggleClass(icons[power], fascist_powers[index] === power);
          }
          $element.toggleClass('glyphicon', (fascist_powers[index] != null) && fascist_powers[index] !== 'execution');
          return $element.toggleClass('glyphicon-large', fascist_powers[index] === 'execution');
        }
      }));
    }
    return results;
  };

  render_previous_vote = function(state, players) {
    var $ja, $li, $nein, $outcome, $previous_vote, i, len, outcome, player, results;
    $previous_vote = $('#previous-vote');
    outcome = state.vote_pass ? 'passed' : 'failed';
    $outcome = $previous_vote.find('.outcome');
    $outcome.text(outcome);
    $outcome.toggleClass('text-success', state.vote_pass);
    $outcome.toggleClass('text-danger', !state.vote_pass);
    $ja = $previous_vote.find('.ja');
    $ja.empty();
    $nein = $previous_vote.find('.nein');
    $nein.empty();
    results = [];
    for (i = 0, len = players.length; i < len; i++) {
      player = players[i];
      $li = $("<li>" + player.name + "</li>");
      if (state.votes[player.id] === true) {
        results.push($ja.append($li));
      } else if (state.votes[player.id] === false) {
        results.push($nein.append($li));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  $(function() {
    setup_policy_board();
    hide_flat.attach();
    huddle.attach($('#huddle'));
    wait.attach($('#setup'));
    wait_all.attach($('#intro'));
    wait_all.attach($('#identify'));
    wait.attach($('#president'));
    wait.attach($('#check_outcome'));
    wait.attach($('#policy_peek'));
    wait.attach($('#execution_result'));
    wait.attach($('#investigation_result'));
    multiplayer_vote.attach($('#vote'));
    select_chancellor.attach($('#propose'));
    select_to_execute.attach($('#execution'));
    select_to_investigate.attach($('#investigation'));
    select_next_president.attach($('#special_election'));
    terminal.attach($('#fascist_victory'));
    terminal.attach($('#liberal_victory'));
    $('#setup').on('click', '.themes a', function(event) {
      return games.change({
        theme: $(this).data('id')
      });
    });
    $('#president .policies').on('click', '.policy', function(event) {
      return games.change({
        to_discard: +$(this).data('index')
      });
    });
    $('#chancellor .policies').on('click', '.policy', function(event) {
      return games.change({
        to_enact: +$(this).data('index')
      });
    });
    $('#chancellor .enact').on('click', wait.action);
    $('#chancellor .veto').on('click', function(event) {
      return games.change({
        ready: true,
        to_enact: null
      });
    });
    $('#confirm_veto .permit').on('click', function(event) {
      return games.change({
        veto: true,
        ready: true
      });
    });
    return $('#confirm_veto .deny').on('click', function(event) {
      return games.change({
        veto: false,
        ready: true
      });
    });
  });

}).call(this);

//# sourceMappingURL=room.js.map
