local_synonyms = {
  # From: words in the candidate nuggets.
  # To: words in the input.
  'expect': ['predict'],
  'flat': ['static'],
  'officer': ['police'],
  'officers': ['police'],
  'predictable': ['predict'],
  'remain': ['remains'],
  'remains': ['remains'],
  'stagnant': ['static'],
}

local_synonyms_excl = {
  'assess': ['tax'],
  'assessed': ['tax'],
  'issue': ['cut'],
}

local_antonyms = {

}

local_hypohyper = {
  'expenses': ['salary'],
  'pension': ['salary'],
  'pensions': ['salary'],

}
local_hypohyper_excl = {
  'grow': ['cut'],
  'growing': ['cut'],
}