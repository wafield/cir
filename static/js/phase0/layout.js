define([
	'doc/qa',
	'utils',
	'semantic-ui',
	'realtime/socket',
	'ext/colorbrewer',
	'feed/activity-feed',
	'jquery.ui'
], function(
	QA,
	Utils
) {
	QA.updateQuestionList();

	sessionStorage.setItem('category', 'finding');

	var module = {};

	module.update_statement = function() {
		return $.ajax({
			url: '/phase0/update_statement_questions/',
			type: 'post',
			data: {},
			success: function(xhr) {
				$("#phase0-container").html(xhr.html);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	$("body").on("click", ".statement-entry", function(){
		var slot_id = $(this).attr("data-id");
		showStatementCommentList(slot_id);
	})
	var showStatementCommentList = function(slot_id) {
		$.ajax({
			url: '/phase0/get_statement_comment_list/',
			type: 'post',
			data: {
				'slot_id': slot_id,
			},
			success: function(xhr) {	
				$('#phase0-container').html(xhr.statement_comment_list);

				$('textarea').each(function () {
					this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
				}).on('input', function () {
					this.style.height = 'auto';
					this.style.height = (this.scrollHeight) + 'px';
				});
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});	
	}

	$("body").on("click", ".comment-post", function(){
		var textarea = $(this).closest(".comment-container").find("textarea");
		var text = textarea.val();
	 	var parent_id = "";
	 	var slot_id = $(this).closest(".comment-container").attr("slot-id");
	 	if (text == "") {
	 		Utils.notify('warning', "Empty content not accepted");
	 	} else {
			$.ajax({
				url: '/phase0/put_statement_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
					'slot_id': slot_id,
				},
				success: function(xhr) {
					textarea.val("");
					showStatementCommentList(slot_id);
					// updateStatementCommentList();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	 		
	 	}
	}).on("click", ".comment-reply-save", function(){
		var text = $(this).closest("form").find("textarea").val();
	 	var parent_id = $(this).closest(".comment").attr("comment-id");
	 	var slot_id = $(this).closest(".comment-container").attr("slot-id");
	 	var textarea = $(this).closest("form").find("textarea");
		$.ajax({
			url: '/phase0/put_statement_comment/',
			type: 'post',
			data: {
				'text': text,
				'parent_id': parent_id,
				'slot_id': slot_id,
			},
			success: function(xhr) {
				textarea.val("");
				textarea.closest(".form").hide();
				showStatementCommentList(slot_id);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}).on("click", ".comment-reply-cancel", function(){
	 	var textarea = $(this).closest("form").find("textarea");
		textarea.val("");
		textarea.closest(".form").hide();
	}).on("click", ".comment-reply", function(){
	 	$(this).closest(".content").find(".form").show();
		$('textarea').each(function () {
			this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
		}).on('input', function () {
			this.style.height = 'auto';
			this.style.height = (this.scrollHeight) + 'px';
		});
	});

	module.update_statement();

});




