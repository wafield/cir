define([
  'utils',
], function(
  Utils
) {
  let config = {};

  config.methods = [
    {
      'name': 'KS         ',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      }]
    },{
      'name': 'KS+Text    ',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'similar_to_claim_in_progress',
        'weight': 1
      }]
    },{
      'name': 'KS+TFIDF   ',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'similar_to_claim_in_progress_tfidf',
        'weight': 100
      }]
    },{
      'name': 'KS+TCIDF   ',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'similar_to_claim_in_progress_tcidf',
        'weight': 100
      }]
    },{
      'name': 'KS+Synsets ',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'similar_to_claim_in_progress_synset',
        'weight': 100
      }]
    },{
      'name': 'KS+SynTCIDF',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'similar_to_claim_in_progress_synset_tcidf',
        'weight': 100
      }]
    },{
      'name': 'KS+Onto',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'extra_hits',
        'weight': 100
      }]
    },{
      'name': 'KS+SynTCIDF+Onto',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'similar_to_claim_in_progress_synset_tcidf',
        'weight': 100
      },{
        'name': 'extra_hits',
        'weight': 300
      }]
    }
  ];
  config.ground_truth = [
    { // TC1
      'input': 'borough revenue remains static',
      'nuggets': [34, 36, 38, 70, 72, 76, 78, 82, 84, 
                  94, 122, 124, 126, 130, 154, 182, 
                  216, 226],
      'slot_id': 3,
      'extra_hits': ['property tax', 'lst', 'local service tax', 'expenditure', 'eit', 'earned income tax', 'visitor', 'transfer tax'],
    }, { // TC2
      'input': 'police services are cut',
      'nuggets': [86, 150, 170],
      'slot_id': 3,
      'extra_hits': [],
    }, { // TC3
      'input': 'property tax remains static',
      'nuggets': [94, 96, 102, 104, 106, 114, 116, 
                  118, 132, 198],
      'slot_id': 3,
      'extra_hits': ['assessment', 'reassessment', 'sell', 'landlock', 'landlocked', 'development', 'expansion'],
    },{ // TC4
      'input': 'employee salaries are increasing',
      'nuggets': [140, 202, 204, 206],
      'slot_id': 3,
      'extra_hits': ['benefits', 'health care', 'retirement benefits', 'pension plan'],
    }, { //TC5
      'input': 'appealing to homeowner',
      'nuggets': [90, 162, 208, 220],
      'slot_id': 6,
      'extra_hits': [],
    }, { // TC6
      'input': 'fixed income',
      'nuggets': [80, 110, 166],
      'slot_id': 7,
    }
  ];

  return config;
});