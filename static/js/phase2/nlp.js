define([
  'utils',
], function(
  Utils
) {
  var module = {};

  module.populateSimilarity = function(
    nug, 
    nid,
    existing_claim_words, 
    curr_slot_id, 
    current_used_nuggets,
    chosen_nugget_words,
    claim_words,
    nuggets_metadata
  ) {
    // Consider whether this nugget is in the current draft
    nug['is_already_chosen'] = current_used_nuggets.includes(nid.toString());
    if (nug['is_already_chosen']) {
      nug['reco_score'] = -100000;
      return;
    }

    // TODO: make use of existing claim--nugget relationship. Claims from other people - what nuggets did they use?

    var currUserId = sessionStorage.getItem('user_id');

    // Consider nugget's author info, true if not by me.
    nug['is_not_by_me'] = (nug.author_id != currUserId);

    // Consider nugget's word vector info
    nug['novelty_over_existing_claims'] = getVerbalNovelty(nug['words'], existing_claim_words);
    nug['novelty_over_existing_claims_tfidf'] = getVerbalNoveltyTfidf(nug, existing_claim_words);

    // Consider which question the nugget answers
    nug['same_question'] = (nug['slot_id'] == curr_slot_id);

    // Consider whether this nugget has been used
    nug['used_in'] = nug['used_in_claims'].length;

    // Consider whether this nugget has a high word similarity with chosen nuggets.
    nug['similar_to_chosen'] = 1 - getVerbalNovelty(nug['words'], chosen_nugget_words);
    nug['similar_to_chosen_tfidf'] = getVerbalSimilarityTfidf(nug, chosen_nugget_words);

    let wordBagStemmed = [];
    for (const nid of current_used_nuggets) {
      const nugget = nuggets_metadata[nid];
      for (wordIdx in nugget.syn) {
        const tokenInfo = nugget.syn[wordIdx];
        wordBagStemmed.push(tokenInfo['token_stem']);
      }
    }

    let chosenNuggetMatch = getSynonymCountTfidf(nug, wordBagStemmed);
    nug['similar_to_chosen_synset'] = chosenNuggetMatch.score;
    
    // These words are ready to be highlighted in the chosen nuggets.
    nug['hit_words_chosen_nugget'] = chosenNuggetMatch.hitWords;
    nug['hyperhypo_chosen_nugget'] = chosenNuggetMatch.hyperhypo;
    nug['antowords_chosen_nugget'] = chosenNuggetMatch.antowords;
    nug['dictionary_hits'] = chosenNuggetMatch.dictionaryHits;

    // Consider if the nugget has a high verbal overlap with the claim-in-progress.
    // nug['similar_to_claim_in_progress'] = 1 - getVerbalNovelty(nug['words'], claim_words);
    nug['similar_to_claim_in_progress'] = getOccurrenceCount(nug['words'], claim_words);
    nug['similar_to_claim_in_progress_tfidf'] = getOccurrenceCountTfidf(nug, claim_words);
    
    let draftClaimMatch = getSynonymCountTfidf(nug, claim_words);
    nug['similar_to_claim_in_progress_synset'] = draftClaimMatch.score;

    // These words are ready to be highlighted in the candidate nuggets.
    nug['hit_words'] = draftClaimMatch.hitWords;
    nug['hyperhypo'] = draftClaimMatch.hyperhypo;
    nug['antowords'] = draftClaimMatch.antowords;

    // Consider whether this nugget is from the same docsection with one chosen nugget.
    nug['same_doc_section'] = current_used_nuggets.map(
        nid => nuggets_metadata[nid].docsrc_id
    ).includes(nug.docsrc_id);

    // Consider whether this nugget is from the same author with chosen nuggets.
    nug['same_original_author'] = current_used_nuggets.map(
        nid => nuggets_metadata[nid].docsrc_author
    ).includes(nug.docsrc_author);

    // Consider how far it is in the source documents (only if in same section).
    nug['src_token_distance'] = 0;
    if (nug['same_doc_section']) {
      for (var i = 0; i < current_used_nuggets.length; i ++) {
        var target_nug_id = current_used_nuggets[i];
        if (target_nug_id == nid) continue;

        var distance_to_target = Math.abs(nuggets_metadata[target_nug_id].src_offset - nug['src_offset']);

        if (nug['src_token_distance'] == 0) {
          nug['src_token_distance'] = distance_to_target;
        } else {
          nug['src_token_distance'] = Math.min(
              nug['src_token_distance'], distance_to_target
          );
        }
      }
    }
    nug['reco_score'] =
      // (nug['same_original_author'] ? 1 : 0)

      /* Scenario 1 */
      // + (nug['is_not_by_me'] ? 1: 0)
      // + nug['novelty_over_existing_claims_tfidf'] * 10 // novelty of candidate nugget over existing claims.
      + (nug['same_question'] ? 10: 0)
      // - nug['used_in'] * 4

      /* Scenario 2 - some nuggets are selected */
      // + nug['similar_to_chosen_tfidf'] * 20
      // + (nug['same_doc_section'] ? 10: 0) // source provenance.
      // + (nug['same_doc_section'] ? (Math.pow(1.008, -nug['src_token_distance']) * 80) : 0)  // document context provenance.
      + nug['similar_to_chosen_synset'] * 100

      /* Scenario 3 - claim content is partially written */
      // + nug['similar_to_claim_in_progress'] 
      // + nug['similar_to_claim_in_progress_tfidf'] * 100
      + nug['similar_to_claim_in_progress_synset'] * 100

  };


  return module;
});


/**
 *
 * @param words ['a', 'b', 'c', 'd']
 * @param dictionary ['a', 'b', 'c'] or {'a': 5, 'b': 3}
 * @returns {number} novelty = 1/4.
 */
function getVerbalNovelty(words, dictionary) {
  var size = words.length;
  var difference = 0;
  for (var i = 0; i < size; i ++) {
    if (Array.isArray(dictionary)) {
      if (!dictionary.includes(words[i])) {
        difference ++;
      }
    } else {
      if (!(words[i] in dictionary)) {
        difference ++;
      }
    }
  }
  return difference / size;
};

function getVerbalNoveltyTfidf(nug, dictionary) {
  var score = 0;
  for (let word in nug['tfidf']) {
    if (typeof dictionary == 'object' && !(word in dictionary)) {
      score += nug['tfidf'][word];
    }
  }
  // Normalize by nugget length.
  return score / nug['words'].length;
};

function getVerbalSimilarityTfidf(nug, dictionary) {
  var score = 0;
  for (let word in nug['tfidf']) {
    if (typeof dictionary == 'object' && word in dictionary) {
      score += nug['tfidf'][word];
    }
  }
  // Normalize by nugget length.
  return score / nug['words'].length;
}


/**
 *
 * @param selected nuggets [ 1, 3, 5 ]
 * @param target claim's nugget collection [1, 3, 5, 7]
 * @returns {number} 3 / 4.
 */
function getNuggetOverlap(selected, target) {
  var size = target.length;
  var overlap = 0;
  for (var i = 0; i < size; i ++) {
    if (selected.includes(target[i].toString())) {
      overlap ++;
    }
  }
  return overlap / size;
}

/**
 * Times words from text show up in dictionary.
 */
function getOccurrenceCount(text, dictionary) {
  let hit = 0;
  let wordFreq = {};
  for (var d of dictionary) {
    wordFreq[d] = 0;
  }
  for (var word of text) {
    if (word in wordFreq) {
      hit += 1;
      if (wordFreq[word] == 0) {
        hit += 5;
      } 
      wordFreq[word] ++;
    }      
  }
  return hit;
}

function getOccurrenceCountTfidf(nugget, dictionary) {
  if (dictionary.length == 0) return 0;

  const tfidf = nugget['tfidf'];
  var hit = 0;
  for (var d of dictionary) {
    if (d in tfidf) {
      hit += tfidf[d];
    }
  }
  return hit / dictionary.length;
}

function getSynonymCountTfidf(nugget, dictionary) {
  // All these are raw tokens. Not stemmed.
  let hitWords = [], hyperhypo = [], antowords = [];
  let dictionaryHits = [];

  let score = 0.0;

  const synWeight = 3.0;
  const antoWeight = 1.0;
  const hypWeight = 0.5; 
 
  if (dictionary.length > 0) {
    for (wordIdx in nugget.syn) {
      // Given each word in the candidate nugget, check if its synset/hypohyper has overlap with dictionary.
      const tokenInfo = nugget.syn[wordIdx];
      if (tokenInfo['syn']) {
        let resSyn = overlapCount(tokenInfo['syn'], dictionary);
        if (resSyn.overlaps > 0) {
          dictionaryHits = dictionaryHits.concat(resSyn.words2hit);
          // Is the token already in hitwords? If so, decay the score.
          var decayCoefficient = Math.pow(0.3, hitWords.filter((w) => w == tokenInfo['token']).length);
          hitWords.push(tokenInfo['token']);
          score += synWeight * resSyn.overlaps * nugget.tfidf[tokenInfo.token_stem] * decayCoefficient;
        }

        let resHyp = overlapCount(tokenInfo['hyp'], dictionary);
        if (resHyp.overlaps > 0) {
          dictionaryHits = dictionaryHits.concat(resHyp.words2hit);
          var decayCoefficient = Math.pow(0.3, hyperhypo.filter((w) => w == tokenInfo['token']).length);
                    
          hyperhypo.push(tokenInfo['token']);
          score += hypWeight * resHyp.overlaps * nugget.tfidf[tokenInfo.token_stem] * decayCoefficient;
        }
        let resAnt = overlapCount(tokenInfo['ant'], dictionary);
        if (resAnt.overlaps > 0) {
          dictionaryHits = dictionaryHits.concat(resAnt.words2hit);
          antowords.push(tokenInfo['token']);
          score += antoWeight * resAnt.overlaps * nugget.tfidf[tokenInfo.token_stem];
        }
      }
    }
  }

  // Dedup hitwords.
  hitWords = Array.from(new Set(hitWords))
  hyperhypo = Array.from(new Set(hyperhypo))
  antowords = Array.from(new Set(antowords))
  dictionaryHits = Array.from(new Set(dictionaryHits))
  
  return {
    score: dictionary.length == 0 ? 0 : score / dictionary.length, 
    hitWords: hitWords,
    hyperhypo: hyperhypo,
    antowords: antowords,
    dictionaryHits: dictionaryHits,
  };
}


function overlapCount(words1, words2) {
  const decayFactor = 0.5;

  if (!words1 || !words2 || words1.length == 0 || words2.length == 0) return 0;

  let words1hit = [];
  let words2hit = [];
  let hit = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 == w2) {
        hit ++;
        words1hit.push(w1);
        words2hit.push(w2);
      }
    }
  }
  return {overlaps: hit, words1hit: words1hit, words2hit: words2hit};
}