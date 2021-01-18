define([
  'utils',
  'semantic-ui'
], function(
    Utils
) {
  var module = {};

  module.get_claim_list = function() {
    return $.ajax({
      url: '/phase4/get_claim_list/',
      type: 'post',
      data: {},
      success: function(xhr) {
        $('#claim-list-container').html(xhr.claims);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  };

  module.get_statement_list = function() {
    var promise = $.ajax({
      url: '/phase4/get_statement_list/',
      type: 'post',
      success: function(xhr) {
        $("#statement-list-container").html(xhr.html);
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

    $('.statement-question-title').bind('dragover', function(event) {
      event.preventDefault();
      event.stopPropagation();
      counter++;
      $(this).addClass('dragging');
    });
    $('.statement-question-title').bind('dragleave', function(event) {
      event.preventDefault();
      event.stopPropagation();
      // counter--;
      // if (counter === 0) {
      $(this).removeClass('dragging');
      // }
    });
    $('.statement-question-title').on('drop', function(event) {
      event.preventDefault();
      event.stopPropagation();
      $(this).removeClass('dragging');
      counter = 0;
      var slot_id = $(this).parent().attr("data-id");
      module.initiateClaimInSlot(slot_id);
    });

    $('#claim-list .src_claim').on('dragover', function(event) {
      event.preventDefault();
      event.stopPropagation();
      $(this).addClass('dragging');
    }).on('dragleave', function(event) {
      event.preventDefault();
      event.stopPropagation();
      $(this).removeClass('dragging');
    }).on('drop', function(event) {
      event.preventDefault();
      event.stopPropagation();
      $(this).removeClass('dragging');
      var claim_id = $(this).attr("data-id");
      module.mergeClaimToStatement(claim_id);
    });
  };

  module.initiateClaimInSlot = function(slot_id) {
    if (!window.draggedElementId) {
      return;
    }
    var src_claim = $(`#claim-list-container .src_claim[data-id=${window.draggedElementId}] .content`).html();
    $('#statement-from-claim-modal .claim-content').html(src_claim);
    $('#statement-from-claim-modal').modal({
      onApprove: function() {
        $.ajax({
          url: '/phase4/put_statement/',
          type: 'post',
          data: {
            content: $('#statement-from-claim').val(),
            slot_id: slot_id,
            claim_id: window.draggedElementId,
          },
          success: function() {
            module.get_statement_list();
          }
        });
      }
    }).modal('show');
  };

  module.mergeClaimToStatement = function(claim_id) {
    if (!window.draggedElementId) {
      return;
    }
    var src_claim = $(`#statement-container .src_claim[data-id=${window.draggedElementId}] .content`).html();
    $('#statement-merge-claim-modal .claim-content').html(src_claim);
    var dest_claim = $(`#statement-list-container .src_claim[data-id=${claim_id}] .content`).html();
    $('#statement-merge-claim-modal .statement-content').html(dest_claim);
    $('#statement-merge-claim-modal').modal({
      onApprove: function() {
        $.ajax({
          url: '/phase4/add_claim_to_statement/',
          type: 'post',
          data: {
            content: $('#statement-claim-merge').val(),
            claim_id: claim_id,
            nugget_id: window.draggedElementId,
          },
          success: function() {
            module.get_statement_list();
          }
        });
      }
    }).modal('show');
  };



  // Initialize layout
  $.when(module.get_claim_list(), module.get_statement_list()).done(function(promise1, promise2) {
    // module.initEvents();
  });

  $('#statement-overview').on('click', '.category-tab', function() {
    $('#statement-overview').find('.category-tab').removeClass("active");
    $(this).addClass("active");
    $('#statement-overview').find('.category-list').hide();
    var category = $(this).attr("data-id");
    $('#statement-overview').find('.category-list[data-list-type=' + category + ']').show();
  });
  $('#claim-overview').on('click', '.category-tab', function() {
    $('#claim-overview').find('.category-tab').removeClass("active");
    $(this).addClass("active");
    $('#claim-overview').find('.category-list').hide();
    var category = $(this).attr("data-id");
    $('#claim-overview').find('.category-list[data-list-type=' + category + ']').show();
  });

  window.onDragStart = function(event) {
    window.draggedElementId = event.target.getAttribute('data-id');
  };

  return module;
});

