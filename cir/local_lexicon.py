local_synonyms = {
  # From: words in the candidate nuggets.
  # To: words in the input.
  'assessment': ['assess', 'assessed'],
  'expect': [u'predict'],
  'flat': [u'static'],
  'officer': [u'police'],
  'officers': [u'police'],
  'predictable': [u'predict'],
  'remain': [u'remains'],
  'remains': [u'remains'],
  'stagnant': [u'static'],
}

local_synonyms_excl = {
  'assess': [u'tax'],
  'assessed': [u'tax'],
  'issue': [u'cut'],
  'define': ['fix', 'fixed']
}

local_antonyms = {
  'unattractive': [u'appealing', u'appeal'],
  'change': ['static', 'stagnant'],
  'changed': ['static', 'stagnant'],
  'deter': ['attract', 'appeal', 'appealing', 'attractive'],
  'deterring': ['attract', 'appeal', 'appealing', 'attractive'],
}

local_hypohyper = {
  'expenses': [u'salary'],
  'pension': [u'salary'],
  'pensions': [u'salary'],
  'personnel': ['employee'],
  'benefits': ['salary', 'salaries'],

}
local_hypohyper_excl = {
  'grow': [u'cut'],
  'growing': [u'cut'],
  'sales': [u'fair'],
  'sale': [u'fair'],
}