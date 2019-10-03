define([
  'utils',
  'doc/qa',
  'phase2/nlp',
  'phase2/testcases',
  'semantic-ui',
], function(
    Utils,
    QA,
    NLP,
    TestCases
) {
  QA.updateQuestionList();

  var module = {};
  module.nuggets_metadata = [];
  module.claims_metadata = [];
  module.current_used_nuggets = [];
  module.claim_words = [];

  module.get_nugget_list = function() {
    return $.ajax({
      url: '/phase2/get_nugget_list/',
      type: 'post',
      data: {},
      success: function(xhr) {
        $('#statement-container').html(xhr.html);
        module.nuggets_metadata = xhr.nuggets_metadata;
        console.log(xhr.nuggets_metadata);
      },
      error: function(xhr) {
        $('#draft-stmt').css('opacity', '1.0');
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  };

  module.get_claim_list = function() {
    var promise = $.ajax({
      url: '/phase2/get_claim_list/',
      type: 'post',
      success: function(xhr) {
        $("#claim-list").html(xhr.html);
        module.claims_metadata = xhr.claims_metadata;
        module.drag_drop_events();
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
    return promise;
  };

  module.drag_drop_events = function() {

    var counter = 0;

    // Dropping into the dropzone of a new claim.
    $('#new-claim-form .dropzone').on('dragover', function(event) {
      event.preventDefault();
      event.stopPropagation();
      counter++;
      $('#slot-overview-claim .droppable').removeClass('dragging');
      $(this).addClass('dragging');
    }).on('dragleave', function(event) {
      event.preventDefault();
      event.stopPropagation();
      counter--;
      if (counter === 0) {
        $('#slot-overview-claim .droppable').removeClass('dragging');
      }
    }).on('drop', function(event) {
      event.preventDefault();
      event.stopPropagation();
      counter = 0;
      $('#slot-overview-claim .droppable').removeClass('dragging');
      module.addNuggetToDropzone();
    });
  };
  module.initEvents = function() {

    $("#claim-list").on("click", ".add-claim", function(e) {
      module.curr_slot_id = $(this).parents('.statement-entry').data('id');
      $('#new-claim-form > div').insertAfter($(this)).show();
      $('.new-claim-area').addClass('full-width');
      module.refreshNuggetReco();
      module.refreshFYIReco();
    });

    $("#claim-list").on("click", ".refresh-recos", function(e) {
      e.preventDefault();

      var content = $('#new-claim-content').val();

      $.ajax({
        url: '/phase2/process_text/',
        type: 'post',
        data: {'content': content.trim()},
        success: function(xhr) {
          module.claim_words = xhr.words;
          module.refreshNuggetReco();
          module.refreshFYIReco();
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    });
    $("#claim-list").on("click", ".concise-recos", function(e) {
      e.preventDefault();
      $('.new-claim-area').toggleClass('concise');
    });

    $('#claim-list').on('click', '.use-reco', function(e) {
        e.preventDefault();
        const nug_id = $(this).parents('.item').attr('data-nug-id');

        var src_nugget = $(`#statement-container .src_claim[data-id=${nug_id}] .content`);
        if (src_nugget.length == 0) return;
    
        module.current_used_nuggets.push(nug_id);
        $('#nugget-area .placeholder').remove();
        $('#nugget-area .list').append(src_nugget.first()
            .clone().removeClass('content').addClass('item').attr('data-id', nug_id));
    });

    $('#new-claim-form .submit.button').on('click', function(e) {
      e.preventDefault();
      if (!module.current_used_nuggets || !module.curr_slot_id) return;
      $.ajax({
        url: '/phase2/put_claim/',
        type: 'post',
        data: {
          content: $('#new-claim-content').val(),
          slot_id: module.curr_slot_id,
          nugget_ids: module.current_used_nuggets,
        },
        success: function() {
          module.get_claim_list();
        }
      });
    });

    $("#claim-list").on("click", ".comment-claim", function(e) {
      var claim_id = $(this).closest(".src_claim").attr('data-id');
      showClaimCommentModal(claim_id);
    });

    var showClaimCommentModal = function(claim_id) {
      $.ajax({
        url: '/phase2/get_claim_comment_list/',
        type: 'post',
        data: {
          'claim_id': claim_id,
        },
        success: function(xhr) {
          $('#claim-comment-highlight').html(xhr.claim_comment_highlight);
          $('#claim-comment-list').html(xhr.claim_comment_list);
          $('#claim-comment-modal').modal('show');
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    };

    var updateClaimCommentList = function() {
      var container = $("#claim-comment-highlight").find(".workbench-claim");
      var claim_id = container.attr('data-claim-id');
      $.ajax({
        url: '/phase2/get_claim_comment_list/',
        type: 'post',
        data: {
          'claim_id': claim_id,
        },
        success: function(xhr) {
          $('#claim-comment-list').html(xhr.claim_comment_list);
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    };

    // Post a top-level comment.
    $("#claim-comment-modal").on("click", ".claim-comment-post", function() {
      var text = $(this).closest("form").find("textarea").val();
      var claim_id = $("#claim-comment-modal").find(".workbench-claim").attr("data-claim-id");
      var textarea = $(this).closest("form").find("textarea");
      $.ajax({
        url: '/phase2/put_claim_comment/',
        type: 'post',
        data: {
          'text': text,
          'parent_id': "",
          'claim_id': claim_id,
        },
        success: function(xhr) {
          textarea.val("");
          updateClaimCommentList();
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    })
    // Post a reply comment.
        .on("click", ".claim-comment-reply-save", function() {
          var text = $(this).closest("form").find("textarea").val();
          var parent_id = $(this).closest(".comment").attr("comment-id");
          var claim_id = $("#claim-comment-modal").find(".workbench-claim").attr("data-claim-id");
          var textarea = $(this).closest("form").find("textarea");
          $.ajax({
            url: '/phase2/put_claim_comment/',
            type: 'post',
            data: {
              'text': text,
              'parent_id': parent_id,
              'claim_id': claim_id,
            },
            success: function(xhr) {
              textarea.val("");
              textarea.closest(".form").hide();
              updateClaimCommentList();
            },
            error: function(xhr) {
              if (xhr.status == 403) {
                Utils.notify('error', xhr.responseText);
              }
            }
          });
        }).on("click", ".claim-comment-reply-cancel", function() {
      var textarea = $(this).closest("form").find("textarea");
      textarea.val("");
      textarea.closest(".form").hide();
    }).on("click", ".claim-comment-reply", function() {
      $(this).closest(".content").find(".form").show()
    });

  };

  module.initLayout = function() {
    $.when(
        module.get_nugget_list(),
        module.get_claim_list()
    ).done(function(promise1, promise2) {
      module.initEvents();
    });

    $('#slot-overview-claim').on('click', '.category-tab', function() {
      $('#slot-overview-claim').find('.category-tab').removeClass("active");
      $(this).addClass("active");
      $('#slot-overview-claim').find('.category-list').hide();
      var category = $(this).attr("data-id");
      $('#slot-overview-claim').find('.category-list[data-list-type=' + category + ']').show();
    });
    $('#slot-overview').on('click', '.category-tab', function() {
      $('#slot-overview').find('.category-tab').removeClass("active");
      $(this).addClass("active");
      $('#slot-overview').find('.category-list').hide();
      var category = $(this).attr("data-id");
      $('#slot-overview').find('.category-list[data-list-type=' + category + ']').show();
    });

    $('.auto-eval').on('click', () => {
      module.auto_eval();
    });

    window.onDragStart = function(event) {
      window.draggedElementId = event.target.getAttribute('data-id');
    };
  };

  module.mergeNuggetToClaim = function(claim_id) {
    if (!window.draggedElementId) {
      return;
    }
    var src_nugget = $(`#statement-container .src_claim[data-id=${window.draggedElementId}] .content`).html();
    $('#claim-merge-nugget-modal .nugget-content').html(src_nugget);
    var dest_claim = $(`#claim-list .src_claim[data-id=${claim_id}] .content`).html();
    $('#claim-merge-nugget-modal .claim-content').html(dest_claim);
    $('#claim-merge-nugget-modal').modal({
      onApprove: function() {
        $.ajax({
          url: '/phase2/add_nugget_to_claim/',
          type: 'post',
          data: {
            content: $('#claim-nugget-merge').val(),
            claim_id: claim_id,
            nugget_id: window.draggedElementId,
          },
          success: function() {
            module.get_claim_list();
          }
        });
      }
    }).modal('show');
  };

  module.addNuggetToDropzone = function() {
    var src_nugget = $(`#statement-container .src_claim[data-id=${window.draggedElementId}] .content`);
    if (src_nugget.length == 0) return;

    if (!window.draggedElementId) return;

    module.current_used_nuggets.push(window.draggedElementId);
    $('#nugget-area .placeholder').remove();
    $('#nugget-area .list').append(src_nugget.first()
        .clone().removeClass('content').addClass('item'));

    module.refreshNuggetReco();
    module.refreshFYIReco();
  };

  module.initLayout();

  module.refreshNuggetReco = function(update_ui = true, metrics_to_use = null) {
    var existing_claim_words = module.getExistingClaimWords();
    var chosen_nugget_words = module.getChosenNuggetWords();

    for (var nid in module.nuggets_metadata) {
      if (!module.nuggets_metadata.hasOwnProperty(nid)) continue;

      var nug = module.nuggets_metadata[nid];

      NLP.populateSimilarity(
        nug, 
        nid,
        existing_claim_words, 
        module.curr_slot_id,
        module.current_used_nuggets,
        chosen_nugget_words,
        module.claim_words,
        module.nuggets_metadata,
        metrics_to_use
      );
    }

    // Collect words that are used in currently chosen nuggets.
    let wordBag = [];
    let wordBagStemmed = [];
    for (const nid of module.current_used_nuggets) {
      const nugget = module.nuggets_metadata[nid];
      for (wordIdx in nugget.syn) {
        const tokenInfo = nugget.syn[wordIdx];
        if (tokenInfo['syn']) {
          wordBag.push(tokenInfo['token']);
          wordBagStemmed.push(tokenInfo['token_stem']);
        }
      }
    }

    if (!update_ui) return;  // Do nothing if this is auto evaluation mode.

    // Find out top N in recommendation.
    var items = Object.keys(module.nuggets_metadata)
        .map(k => [k, module.nuggets_metadata[k]])
        .sort((first, second) => (second[1]['reco_score'] - first[1]['reco_score']))
        .slice(0, 10);

    $('#rec-to-use').html('');
    for (var i=0; i < items.length; i++) {
      var nid = items[i][0];
      var nug = items[i][1];
      var score = nug['reco_score'];
      var $src_nugget = $(`#statement-container .src_claim[data-id=${nid}] .content`);
      
      var tags = '';
      tags += `<span><div class="ui circular label">${i+1}</div>[${nid}]</span>`;
      tags += `<span class="candidate-label">Score=${score.toPrecision(3)}</span>`;
      tags += `<span class="candidate-label">Nov=${nug['novelty_over_existing_claims_tfidf'].toPrecision(3)}</span>`;
      if (nug['same_question']) { tags += `<span class="candidate-label">Same Question</span>`; }
      // if (nug['is_not_by_me']) { tags += `<span class="candidate-label">Not by Me</span>`; }
      if (nug['used_in'] > 0) { tags += `<span class="candidate-label">Used=${nug['used_in']}</span>`; }
      else { tags += `<span class="candidate-label">Unused</span>`; }
      
      var sim = nug['similar_to_chosen_tfidf'] + nug['similar_to_claim_in_progress_tfidf'];
      if (sim != 0) { tags += `<span class="candidate-label">Sim=${sim.toPrecision(3)}</span>`; }

      var simsyn = nug['similar_to_claim_in_progress_synset']  ;
      if (simsyn != 0) { tags += `<span class="candidate-label">SimSyn=${simsyn.toPrecision(3)}</span>`; }
      
      /* Overall Tags */
      if (nug['novelty_over_existing_claims_tfidf'] > 0.09) { tags += `<span class="candidate-label">Novel</span>`; }
      if (sim > 0.01) { tags += `<span class="candidate-label">Similar</span>`; }

      // Find all hitWords from $src_nugget.html(), and stylize them.
      // Order matters!
      var nugContent = Utils.highlightKeywords(
        $src_nugget,
        nug['hit_words'].concat(nug['hit_words_chosen_nugget']),
        nug['hyperhypo'].concat(nug['hyperhypo_chosen_nugget']),
        nug['antowords'].concat(nug['antowords_chosen_nugget'])
      );


      $(`#nugget-area .item`).each((idx, el) => {
        // For each word in dictionary hits, highlight it in the chosen nuggets.
        var nugContent = $(el).html().trim();
        
        for (const stem of nug['dictionary_hits']) {
          for (var i = 0; i < wordBag.length; i ++) {
            if (wordBagStemmed[i] == stem) {
              // Highlight wordBag[i]
              var regex = new RegExp(`\\b(${wordBag[i]})\\b`, 'gi');
              nugContent = nugContent.replace(regex, '<span class="hitword">$1</span>');
              $(el).html(nugContent);
            }
          }
        }
      });

      // Find all dictionary hits from the chosen nuggets, and stylize them.
      var $item = $(`<div class="item" data-nug-id="${nid}">`)
      .html(nugContent + `<div class="label-container">${tags}</div>`
      +`<a class="use-reco" href="#">Useful</a>`);
      $('#rec-to-use').append($item);
    }
  };

  module.refreshFYIReco = function() {
    $('#rec-fyi').parent().hide();
    var fyi_claims = [];

    // Check each existing claim, and see if there's overlap with current draft.
    for (var cid in module.claims_metadata) {
      if (!module.claims_metadata.hasOwnProperty(cid)) continue;

      var claim = module.claims_metadata[cid];

      // Consider if this claim's source nuggets overlaps with the currently chosen
      // nuggets.
      claim['dup_by_nugget_collection'] = getNuggetOverlap(module.current_used_nuggets, claim.src_nuggets);

      // TODO: add TF-IDF and concept mapping to getVerbalNovelty.
      claim['draft_novelty_over_this_claim'] = NLP.getVerbalNovelty(module.claim_words, claim['words']);

      if (claim['draft_novelty_over_this_claim'] < 0.5) {
        fyi_claims.push(cid);
      }
    }

    $('#rec-fyi').html('');
    for (var i = 0; i < fyi_claims.length; i++) {
      var cid = fyi_claims[i];
      var src_claim = $(`#claim-list .src_claim[data-id=${cid}] .content`);
      var $item = $('<div class="item">')
          .html(
              src_claim.html()
          );
      $('#rec-fyi').append($item);
      $('#rec-fyi').parent().show();
    }
  };

  module.getExistingClaimWords = function() {
    var words = {};
    for (var cid in module.claims_metadata) {
      var w = module.claims_metadata[cid].words;
      for (var i = 0; i < w.length; i ++) {
        if (!words[w[i]]) {
          words[w[i]] = 0
        }
        words[w[i]] ++
      }
    }
    return words;
  };

  module.getChosenNuggetWords = function() {
    var words = {};
    module.current_used_nuggets.forEach(nid => {
      var w = module.nuggets_metadata[nid].words;
      for (var i = 0; i < w.length; i++) {
        if (!words[w[i]]) {
          words[w[i]] = 0
        }
        words[w[i]]++
      }
    });
    return words;
  };

  module.auto_eval = async function() {
    console.log("Start auto eval.");
    for (let method of TestCases.methods) {

      let avg_top_5 = 0, avg_top_10 = 0;
      for (let tc of TestCases.ground_truth) {
        const result = await eval_tc(tc);
        module.claim_words = result.words;
        module.refreshNuggetReco(false, method.metrics_to_use);
  
        var top_results = Object.keys(module.nuggets_metadata)
        .map(k => [k, module.nuggets_metadata[k]])
        .sort((first, second) => (second[1]['reco_score'] - first[1]['reco_score']))
        .map(k => parseInt(k[0]));
  
        var top_5_correct = correctCount(top_results.slice(0, 5), tc.nuggets);
        tc['top_5_accu'] = (1 + top_5_correct) / (1 + Math.min(5, tc.nuggets.length));
        tc['top_5_recl'] = (1 + top_5_correct) / (1 + tc.nuggets.length);
        tc['top_5_fmeasure'] = (tc['top_5_accu'] + tc['top_5_recl'] == 0) ? 0 : (2*tc['top_5_accu']*tc['top_5_recl']/(tc['top_5_accu'] + tc['top_5_recl']));
        avg_top_5 += tc['top_5_fmeasure']
  
        var top_10_correct = correctCount(top_results.slice(0, 10), tc.nuggets);
        tc['top_10_accu'] = (1 + top_10_correct) / (1 + Math.min(10, tc.nuggets.length));
        tc['top_10_recl'] = (1 + top_10_correct) / (1 + tc.nuggets.length);
        tc['top_10_fmeasure'] = (tc['top_10_accu'] + tc['top_10_recl'] == 0) ? 0 : (2*tc['top_10_accu']*tc['top_10_recl']/(tc['top_10_accu'] + tc['top_10_recl']));
        avg_top_10 += tc['top_10_fmeasure']
  
        // console.log(`method=${method.name}, q=${tc.input}: avgtop5=${avg_top_5} top10=${avg_top_10}`);  
      }
      avg_top_5 /= TestCases.ground_truth.length;
      avg_top_10 /= TestCases.ground_truth.length;
  
      console.log(`method=${method.name}: avgtop5=${avg_top_5.toPrecision(3)} avgtop10=${avg_top_10.toPrecision(3)}`);
    }
    console.log("End auto eval.");
  };
  return module;
});

async function eval_tc(tc) {
  let result;
  try {
    result = await $.ajax({
      url: '/phase2/process_text/',
      type: 'post',
      data: {'content': tc.input.trim()}
    });
    return result;
  } catch (error) {
    console.error(error);
  }
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

function correctCount(results, ground_truth) {
  var hit = 0;
  for (var i = 0; i < results.length; i ++) {
    if (ground_truth.includes(results[i])) {
      hit ++;
    }
  }
  return hit;
}