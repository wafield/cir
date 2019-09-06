define([
  'utils',
  'doc/qa',
  'semantic-ui',
], function(
    Utils,
    QA
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
        // module.nugget_claim_usage = xhr.nugget_claim_usage;
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
      $('#new-claim-area').addClass('full-width');
      module.refreshNuggetReco();
      // module.refreshFYIReco();
    });

    $('#new-claim-content').on('keyup', function(e) {
      clearTimeout(module.keyPressTimeout);
      var content = $('#new-claim-content').val();
      if (content.trim().length == 0) return;

      $('#rec-to-use').parent().addClass('loading');
      $('#rec-fyi').parent().addClass('loading');

      module.keyPressTimeout = setTimeout(function() {
        $.ajax({
          url: '/phase2/process_text/',
          type: 'post',
          data: {'content': content.trim()},
          success: function(xhr) {
            module.claim_words = xhr.words;
            module.refreshNuggetReco();
            // module.refreshFYIReco(true);
          },
          error: function(xhr) {
            if (xhr.status == 403) {
              Utils.notify('error', xhr.responseText);
            }
          }
        });
      }, 2000);
    });

    $('#new-claim-form .button').on('click', function(e) {
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

  module.refreshNuggetReco = function() {
    $('#rec-to-use').parent().addClass('loading');

    var currUserId = sessionStorage.getItem('user_id');
    var existing_claim_words = module.getExistingClaimWords();
    var chosen_nugget_words = module.getChosenNuggetWords();

    for (var nid in module.nuggets_metadata) {
      if (!module.nuggets_metadata.hasOwnProperty(nid)) continue;

      var nug = module.nuggets_metadata[nid];

      // Consider nugget's author info, true if not by me.
      nug['is_not_by_me'] = (nug.author_id != currUserId);

      // Consider nugget's word vector info
      nug['novelty_over_existing_claims'] = module.getVerbalNovelty(nug['words'], existing_claim_words);
      nug['novelty_over_existing_claims_tfidf'] = module.getVerbalNoveltyTfidf(nug, existing_claim_words);

      // Consider which question the nugget answers
      nug['same_question'] = (nug['slot_id'] == module.curr_slot_id);

      // Consider whether this nugget has been used
      nug['used_in'] = nug['used_in_claims'].length;

      // Consider whether this nugget is in the current draft
      nug['is_already_chosen'] = module.current_used_nuggets.includes(nid.toString());

      // Consider whether this nugget has a high word similarity with chosen nuggets.
      nug['similar_to_chosen'] = 1 - module.getVerbalNovelty(nug['words'], chosen_nugget_words);
      nug['similar_to_chosen_tfidf'] = module.getVerbalSimilarityTfidf(nug, chosen_nugget_words);

      // Consider if the nugget has a high verbal overlap with the claim-in-progress.
      // nug['similar_to_claim_in_progress'] = 1 - module.getVerbalNovelty(nug['words'], module.claim_words);
      nug['similar_to_claim_in_progress'] = module.getOccurrenceCount(nug['words'], module.claim_words);
      nug['similar_to_claim_in_progress_tfidf'] = module.getOccurrenceCountTfidf(nug, module.claim_words);

      // Consider whether this nugget is from the same docsection with one chosen nugget.
      nug['same_doc_section'] = module.current_used_nuggets.map(
          nid => module.nuggets_metadata[nid].docsrc_id
      ).includes(nug.docsrc_id);

      // Consider whether this nugget is from the same author with chosen nuggets.
      nug['same_original_author'] = module.current_used_nuggets.map(
          nid => module.nuggets_metadata[nid].docsrc_author
      ).includes(nug.docsrc_author);

      // Consider how far it is in the source documents (only if in same section).
      nug['src_token_distance'] = 0;
      if (nug['same_doc_section']) {
        for (var i = 0; i < module.current_used_nuggets.length; i ++) {
          var target_nug_id = module.current_used_nuggets[i];
          if (target_nug_id == nid) continue;

          var distance_to_target = Math.abs(
              module.nuggets_metadata[target_nug_id].src_offset - nug['src_offset']);

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
          + (nug['same_question'] ? 1: 0)
          // - nug['used_in'] * 4

          /* Scenario 2 - some nuggets are selected */
          + nug['similar_to_chosen_tfidf'] * 20
          // + (nug['same_doc_section'] ? 10: 0) // source provenance.
          // + (nug['same_doc_section'] ? (Math.pow(1.008, -nug['src_token_distance']) * 80) : 0)  // document context provenance.

          /* Scenario 3 - claim content is partially written */
          // + nug['similar_to_claim_in_progress'] 
          + nug['similar_to_claim_in_progress_tfidf'] * 100


          // Exclude nuggets already chosen.
          - (nug['is_already_chosen'] ? 100000 : 0);
    }

    // Find out top 5 in recommendation.
    var items = Object.keys(module.nuggets_metadata)
        .map(k => [k, module.nuggets_metadata[k]])
        .sort((first, second) => (second[1]['reco_score'] - first[1]['reco_score']))
        .slice(0, 10);
    $('#rec-to-use').html('');
    for (var i=0; i < items.length; i++) {
      var nid = items[i][0];
      var score = items[i][1]['reco_score'];
      var src_nugget = $(`#statement-container .src_claim[data-id=${nid}] .content`);
      // var tags = `<div class="ui blue circular label">${score.toPrecision(3)}</div>`;
      var tags = '';
      tags += `<div class="ui circular label">Nov=${items[i][1]['novelty_over_existing_claims_tfidf'].toPrecision(3)}</div>`;
      if (items[i][1]['same_question']) {
        tags += `<div class="ui circular teal label">Same Q</div>`;
      }
      if (items[i][1]['is_not_by_me']) {
        tags += `<div class="ui circular label">Not by Me</div>`;
      }
      if (items[i][1]['used_in'] > 0) {
        tags += `<div class="ui circular label">Used=${items[i][1]['used_in']}</div>`;
      }
      var sim = items[i][1]['similar_to_chosen_tfidf'] +
          items[i][1]['similar_to_claim_in_progress_tfidf'];
      if (sim != 0) {
        tags += `<div class="ui circular label">Sim=${sim.toPrecision(3)}</div>`;
      }
      
      /* Overall Tags */
      if (items[i][1]['novelty_over_existing_claims_tfidf'] > 0.09) {
        tags += `<div class="ui red circular label">Novel</div>`;
      }
      if (sim > 0.01) {
        tags += `<div class="ui green circular label">Similar</div>`;
      }

      var $item = $('<div class="item">').html(src_nugget.html() + tags);
      $('#rec-to-use').append($item);
    }
    setTimeout(() => $('#rec-to-use').parent().removeClass('loading'), 0);
  };

  module.refreshFYIReco = function() {
    $('#rec-fyi').parent().addClass('loading');

    var recommendable_claims = [];

    for (var cid in module.claims_metadata) {
      if (!module.claims_metadata.hasOwnProperty(cid)) continue;

      var claim = module.claims_metadata[cid];

      // Consider if this claim's source nuggets overlaps with the currently chosen
      // nuggets.
      claim['dup_by_nugget_collection'] = module.getNuggetOverlap(module.current_used_nuggets, claim.src_nuggets);

      claim['dup_by_claim_in_progress'] = module.getVerbalNovelty(claim['words'], module.claim_words);

      if (claim['dup_by_nugget_collection'] > 0.5) {
        claim['fyi_reason'] = 'Dup';
        recommendable_claims.push(cid);
      }
    }

    $('#rec-fyi').html('');
    for (var i = 0; i < recommendable_claims.length; i++) {
      var cid = recommendable_claims[i];
      var reason = module.claims_metadata[cid]['fyi_reason'];
      var src_claim = $(`#claim-list .src_claim[data-id=${cid}] .content`);
      var $item = $('<div class="item">')
          .html(
              src_claim.html() +
              `<div class="ui blue circular label">${reason}</div>`
          );
      $('#rec-fyi').append($item);
    }
    setTimeout(() => $('#rec-fyi').parent().removeClass('loading'), 500);
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

  /**
   *
   * @param words ['a', 'b', 'c', 'd']
   * @param dictionary ['a', 'b', 'c'] or {'a': 5, 'b': 3}
   * @returns {number} novelty = 1/4.
   */
  module.getVerbalNovelty = function(words, dictionary) {
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

  module.getVerbalNoveltyTfidf = function(nug, dictionary) {
    var score = 0;
    for (let word in nug['tfidf']) {
      if (typeof dictionary == 'object' && !(word in dictionary)) {
        score += nug['tfidf'][word];
      }
    }
    // Normalize by nugget length.
    return score / nug['words'].length;
  };

  module.getVerbalSimilarityTfidf = function(nug, dictionary) {
    var score = 0;
    for (let word in nug['tfidf']) {
      if (typeof dictionary == 'object' && word in dictionary) {
        score += nug['tfidf'][word];
      }
    }
    // Normalize by nugget length.
    return score / nug['words'].length;
  };

  /**
   *
   * @param selected nuggets [ 1, 3, 5 ]
   * @param target claim's nugget collection [1, 3, 5, 7]
   * @returns {number} 3 / 4.
   */
  module.getNuggetOverlap = function(selected, target) {
    var size = target.length;
    var overlap = 0;
    for (var i = 0; i < size; i ++) {
      if (selected.includes(target[i].toString())) {
        overlap ++;
      }
    }
    return overlap / size;
  };

  /**
   * Times words from text show up in dictionary.
   */
  module.getOccurrenceCount = function(text, dictionary) {
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
  };

  module.getOccurrenceCountTfidf = function(nugget, dictionary) {
    if (dictionary.length == 0) return 0;

    const tfidf = nugget['tfidf'];
    var hit = 0
    for (var d of dictionary) {
      if (d in tfidf) {
        hit += tfidf[d];
      }
    }
    return hit / dictionary.length;
  };
  return module;
});

