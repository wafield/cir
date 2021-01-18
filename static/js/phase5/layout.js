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

	$("body").on("click", "#support-issue-btn", function(){
		sessionStorage.setItem("vote", "support");
		$("#reason-modal").modal("show")
	}).on("click", "#oppose-issue-btn", function(){
		sessionStorage.setItem("vote", "oppose");
		$("#reason-modal").modal("show")
	}).on("click", "#vote-btn", function(){
		if (sessionStorage.getItem("vote") === "support" && !$("#support-issue-btn").hasClass("disabled")) {
			supportIssue(true);
			$("#oppose-issue-btn").removeClass("disabled");
			$("#support-issue-btn").addClass("disabled");
		} else if (sessionStorage.getItem("vote") === "oppose" && !$("#oppose-issue-btn").hasClass("disabled")) {
			supportIssue(false);
			$("#oppose-issue-btn").addClass("disabled");
			$("#support-issue-btn").removeClass("disabled");
		}
		$("#reason-modal").modal("hide")
	});

	$("body").on("click", "#vote-issue-bar", function(){
		$.ajax({
			url: '/phase5/view_vote_result/',
			type: 'post',
			data: {
			},
			success: function(xhr) {	
				$("#result-modal-content").html(xhr.vote_result_table);
				$("#result-modal").modal("show");
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	});

	// $("body").on("click", ".upvote", function(){
	// 	if ($(this).hasClass("teal")) {
	// 		// not vote yet
	// 		$(this).find("span").text("Voted")
	// 		$(this).removeClass("teal");
	// 		var num = $(this).find(".detail").text() - (-1);
	// 		$(this).find(".detail").text(num);
	// 	} else {
	// 		// already voted
	// 		$(this).find("span").text("Useful")
	// 		$(this).addClass("teal");
	// 		var num = $(this).find(".detail").text() - 1;
	// 		$(this).find(".detail").text(num);
	// 	}
	// })
	var supportIssue = function(support) {
		var reason = $("#reason-modal textarea").val();
		$.ajax({
			url: '/phase5/vote_issue/',
			type: 'post',
			data: {
				support: support,
				reason: reason
			},
			success: function(xhr) {	
				renderSupportBar();
				$("#reason-modal textarea").val("");
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});		
	}

	var renderSupportBar = function() {
		$.ajax({
			url: '/phase5/render_support_bar/',
			type: 'post',
			data: {
			},
			success: function(xhr) {	
				var num_support = xhr.num_support;
				var num_oppose = xhr.num_oppose;
				var ratio1 = "50%"; ratio2 = "50%";
				if (num_support === 0 && num_oppose === 0) {
				} else if (num_support === 0 && num_oppose !== 0) {
					ratio1 = "10%"; ratio2 = "90%";
				} else if (num_support !== 0 && num_oppose === 0) {
					ratio1 = "90%"; ratio2 = "10%";
				} else {
					var tmp = Math.floor(100 * num_support/(num_support + num_oppose));
					ratio1 = tmp + "%";
					ratio2 = (100 - tmp) + "%";
				}
				$("#support-issue-bar").css("right", ratio2);
				$("#oppose-issue-bar").css("left", ratio1);
				$("#support-issue-bar").text(num_support);
				$("#oppose-issue-bar").text(num_oppose);
				if (xhr.my_num_support > 0) $("#support-issue-btn").addClass("disabled");
				if (xhr.my_num_oppose > 0) $("#oppose-issue-btn").addClass("disabled");
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});		
	}
	

	var showForumCommentList = function() {
		$.ajax({
			url: '/phase5/get_statement_comment_list/',
			type: 'post',
			data: {
			},
			success: function(xhr) {	
				$('#forum-comment').html(xhr.forum_comment);

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
	 	if (text == "") {
	 		Utils.notify('warning', "Empty content not accepted");
	 	} else {
			$.ajax({
				url: '/phase5/put_statement_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
				},
				success: function(xhr) {
					textarea.val("");
					showForumCommentList();
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
	 	var textarea = $(this).closest("form").find("textarea");
		$.ajax({
			url: '/phase5/put_statement_comment/',
			type: 'post',
			data: {
				'text': text,
				'parent_id': parent_id,
			},
			success: function(xhr) {
				textarea.val("");
				textarea.closest(".form").hide();
				showForumCommentList();
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

	renderSupportBar();
	showForumCommentList();

});




