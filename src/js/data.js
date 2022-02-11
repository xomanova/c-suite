// Generated by CoffeeScript 1.12.7
(function() {
  var data;

  data = {
    fascist_powers: {
      5: [null, null, 'policy_peek', 'execution', 'execution'],
      7: [null, 'investigation', 'special_election', 'execution', 'execution'],
      9: ['investigation', 'investigation', 'special_election', 'execution', 'execution']
    },
    min_players: 5,
    max_players: 10,
    fascist_ratio: 0.45,
    fascist_target_policies: 6,
    liberal_target_policies: 5,
    max_refusals: 3,
    num_liberal_policies: 6,
    num_fascist_policies: 11,
    veto_min_policies: 5,
    hitler_win_min_policies: 3,
    blind_hitler_min_players: 7,
    reelect_president_max_players: 5,
    themes: [
      {
        id: 'sith',
        name: 'Secret Sith',
        text: {
          hitler: 'Palpatine',
          liberal: 'Loyalist',
          liberals: 'Loyalists',
          liberal_card: 'LOYALIST',
          crush_the_liberal_regime: 'Crush the Loyalist regime',
          of_liberal_allegiance: 'Loyalist',
          fascist: 'Separatist',
          fascists: 'Separatists',
          fascist_card: 'SEPARATIST',
          prevent_the_fascist_regime: 'Prevent the Separatist regime',
          of_fascist_allegiance: 'Separatist',
          ja: 'Yes',
          nein: 'No',
          policy: 'mandate',
          a_policy: 'a mandate',
          policies: 'mandates',
          president: 'Vice Chair',
          president_s: 'Vice Chair\'s',
          presidential: 'Vice Chair',
          chancellor: 'Supreme Chancellor',
          a_politician: 'a senator',
          relieved_of_your_political_duties: 'relieved of your senatorial duties',
          relieved_of_their_political_duties: 'relieved of their senatorial duties',
          state: 'Republic'
        }
      }, {
        id: 'hitler',
        name: 'Secret Hitler',
        text: {
          hitler: 'Hitler',
          liberal: 'Liberal',
          liberals: 'Liberals',
          liberal_card: 'LIBERAL',
          crush_the_liberal_regime: 'Crush the Liberal regime',
          of_liberal_allegiance: 'Liberal',
          fascist: 'Fascist',
          fascists: 'Fascists',
          fascist_card: 'FASCIST',
          prevent_the_fascist_regime: 'Prevent the Fascist regime',
          of_fascist_allegiance: 'Fascist',
          ja: 'Ja!',
          nein: 'Nein!',
          policy: 'policy',
          a_policy: 'a policy',
          policies: 'policies',
          president: 'President',
          president_s: 'President\'s',
          presidential: 'Presidential',
          chancellor: 'Chancellor',
          a_politician: 'a politician',
          relieved_of_your_political_duties: 'relieved of your political duties',
          relieved_of_their_political_duties: 'relieved of their political duties',
          state: 'state'
        }
      }, {
        id: 'voldemort',
        name: 'Secret Voldemort',
        text: {
          hitler: 'Voldemort',
          liberal: 'Order of the Phoenix',
          liberals: 'Order of the Phoenix members',
          liberal_card: 'ORDER',
          crush_the_liberal_regime: 'Crush The Order of the Phoenix',
          of_liberal_allegiance: 'in The Order of the Phoenix',
          fascist: 'Death Eater',
          fascists: 'Death Eaters',
          fascist_card: 'DEATH',
          prevent_the_fascist_regime: 'Put an end to the Death Eaters',
          of_fascist_allegiance: 'a Death Eater',
          ja: 'Yes',
          nein: 'No',
          policy: 'decree',
          a_policy: 'a decree',
          policies: 'decrees',
          president: 'Minister for Magic',
          president_s: 'Minister for Magic\'s',
          presidential: 'Ministerial',
          chancellor: 'Chief Warlock',
          a_politician: 'an employee',
          relieved_of_your_political_duties: 'relieved of your ministerial employment',
          relieved_of_their_political_duties: 'relieved of their ministerial employment',
          state: 'wizarding world'
        }
      }
    ]
  };

  if (typeof window !== "undefined" && window !== null) {
    window.games.data = data;
  }

  if (typeof module !== "undefined" && module !== null) {
    module.exports.data = data;
  }

}).call(this);
