define([
  'utils',
  'doc/qa',
  'semantic-ui',
  'realtime/socket',
  'feed/activity-feed'
], function(
    Utils,
    QA
) {
  QA.updateQuestionList();

  var module = {};
  module.nuggets_metadata = [];
  module.claims_metadata = [];
  module.current_used_nuggets = [];

  module.get_nugget_list = function() {
    return $.ajax({
      url: '/phase2/get_nugget_list/',
      type: 'post',
      data: {},
      success: function(xhr) {
        $('#statement-container').html(xhr.html);
        // module.nugget_claim_usage = xhr.nugget_claim_usage;
        module.nuggets_metadata = xhr.nuggets_metadata;
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

    // Merging into existing claim.
    // $('#claim-list .src_claim').on('dragover', function(event) {
    //   event.preventDefault();
    //   event.stopPropagation();
    //   $('#slot-overview-claim .droppable').removeClass('dragging');
    //   $(this).addClass('dragging');
    // }).on('dragleave', function(event) {
    //   event.preventDefault();
    //   event.stopPropagation();
    //   $('#slot-overview-claim .droppable').removeClass('dragging');
    // }).on('drop', function(event) {
    //   event.preventDefault();
    //   event.stopPropagation();
    //   $('#slot-overview-claim .droppable').removeClass('dragging');
    //   var claim_id = $(this).attr("data-id");
    //   module.mergeNuggetToClaim(claim_id);
    // });
  };
  module.initEvents = function() {

    $("#claim-list").on("click", ".add-claim", function(e) {
      $('#new-claim-form').insertAfter($(this)).show();
    });

    $('#new-claim-form .button').on('click', function(e) {
      e.preventDefault();
      var slot_id = $(this).parents('.statement-entry').data('id');
      if (!module.current_used_nuggets || !slot_id) return;
      $.ajax({
        url: '/phase2/put_claim/',
        type: 'post',
        data: {
          content: $('#new-claim-content').val(),
          slot_id: slot_id,
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
    if (!window.draggedElementId) return;
    module.current_used_nuggets.push(window.draggedElementId);

    var src_nugget = $(`#statement-container .src_claim[data-id=${window.draggedElementId}] .content`);
    $('#nugget-area .placeholder').remove();
    $('#nugget-area .list').append(src_nugget.clone().removeClass('content').addClass('item'));

    // $('#claim-merge-nugget-modal .nugget-content').html(src_nugget);
    // var dest_claim = $(`#claim-list .src_claim[data-id=${claim_id}] .content`).html();
    // $('#claim-merge-nugget-modal .claim-content').html(dest_claim);
  };

  module.initLayout();

  return module;
});

