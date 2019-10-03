define([
  'utils',
], function(
  Utils
) {
  let config = {};

  config.methods = [
    {
      'name': 'KS',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      }]
    },{
      'name': 'KS+Text',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'similar_to_claim_in_progress',
        'weight': 1
      }]
    },{
      'name': 'KS+TFIDF',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'similar_to_claim_in_progress_tfidf',
        'weight': 100
      }]
    },{
      'name': 'KS+Synsets',
      'metrics_to_use': [{
        'name': 'same_question',
        'weight': 10
      },{
        'name': 'similar_to_claim_in_progress_synset',
        'weight': 100
      }]
    },
  ];
  config.ground_truth = [
    {
      'input': 'police services are cut',
      'nuggets': [86, 150, 170],
      'slot_id': 3
    },{
      'input': 'borough revenue remains static',
      'nuggets': [34, 42, 70, 72, 76, 82, 94, 122, 130, 154, 182],
      'slot_id': 3
    },{
      'input': 'property tax remains static',
      'nuggets': [94, 96, 102, 104, 106, 114, 116, 118, 132, 198],
      'slot_id': 3
    },{
      'input': 'fixed income',
      'nuggets': [80, 110, 166],
      'slot_id': 7
    },{
      'input': 'employee salaries are increasing',
      'nuggets': [140, 202, 204, 206],
      'slot_id': 3
    },{
      'input': 'appealing to homeowner',
      'nuggets': [90, 162, 168, 208, 216, 220],
      'slot_id': 6
    }
  ];

  return config;
});