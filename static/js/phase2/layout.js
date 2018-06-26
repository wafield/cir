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

	module.get_nugget_list = function() {
        return $.ajax({
            url: '/phase2/get_nugget_list/',
            type: 'post',
            data: {},
            success: function(xhr) {
                $('#statement-container').html(xhr.html);
                // module.drag_drop_events();
                var category = sessionStorage.getItem("category");
                $('.category-tab[data-id=' + category + ']').click();

                for (highlight_id in xhr.highlight2claims) {
                    var nugget = $("#workbench-nugget-list .workbench-nugget[data-hl-id=" + highlight_id + "]");
                    nugget.attr("claim-ids", xhr.highlight2claims[highlight_id]);
                    nugget.find(".use-nugget-num").text("(" + nugget.attr("claim-ids").split(",").length + ")");
                }
            },
            error: function(xhr) {
                $('#draft-stmt').css('opacity', '1.0');
                if (xhr.status == 403) {
                    Utils.notify('error', xhr.responseText);
                }
            }
        });
    }

	module.get_claim_list = function() {
		var promise = $.ajax({
			url: '/phase2/get_claim_list/',
			type: 'post',
			data: {
				theme_id: $("#nugget-list-theme").val(),
			},
			success: function(xhr) {
				$("#claim-list").html(xhr.workbench_claims);
				$(".avatar1").popup('remove popup').popup('destroy');
				$(".avatar1").popup();
				//set claim tab to the last one
				// $('.menu .item').tab();
				// if (module.curr_claim_tab != undefined) {
				// 	$('.tabular.menu .item[data-tab="' + module.curr_claim_tab + '"]').click();
				// }
				// increase_page_loading_progress(10);

				// $("#workbench-claim-list").height($(window).height() - (module.body_bottom + 230 + 14) );
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise;
	};

	module.initEvents = function() {



		$("body").on("click", ".all-activity", function(){
			$(".activity-filter a").removeClass("active");
			$(this).addClass("active");
			$(".event").show();
		}).on("click", ".suggested-claim", function(){
			$(".activity-filter a").removeClass("active");
			$(this).addClass("active");
			$(".event").each(function(){
		        if ($(this).attr("data-type") != "claim version") $(this).hide()
		    });		
		});

		// $("body").on("click", ".workbench-nugget", function(){
		// 	$(".workbench-nugget .action-bar").hide();
		// 	$(".workbench-nugget .divider").hide();
		// 	$($(this).find(".action-bar")).show();
		// 	$($(this).find(".divider")).show();
		// });
        //
		// $(".theme-label").popup();
        //
		// $("#nugget-list-theme").change(function() {
		// 	module.applyFilter();
		// });
        //
		// $('.ui.rating').rating();
		$('.ui.accordion').accordion();

		// nugget button group
		$("body").on("click", ".use-nugget", function(e) {
			// if someone wants to adopt a nugget, but currently not in claim-detail view, then open claim-detail first by creating a new one;
			if ($("#claim-detail").is(":visible") === false) {
				Utils.notify('warning', "Please create a new claim first.");
			} else {
				var container = $(this).closest(".workbench-nugget");
				// container.find(".nugget-select-mark").show();
				var data_hl_id = container.attr('data-hl-id');
				var content = container.find(".description").attr("data");
				var textarea = $("#claim-maker").find("textarea");
				if (textarea.attr("data-id") !== undefined) {
					textarea.val(textarea.val() + "\n" + "\n" + content).attr("data-id", textarea.attr("data-id")  + "," +  data_hl_id);
				} else {
					textarea.val(content).attr("data-id", data_hl_id);
				}
				var claim_id = $("#claim-maker").attr("claim-id");
				$.ajax({
					url: '/phase2/add_nugget_to_claim/',
					type: 'post',
					data: {
						'highlight_id': data_hl_id,
						'claim_id': claim_id
					},
					success: function(xhr) {
						$("#candidate-nugget-list-container").html(xhr.html);
						showClaimActivity(claim_id);
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});						
			}
		}).on("click", ".remove-nugget", function(e) {
			var container = $(this).closest(".workbench-nugget");
			// container.find(".nugget-select-mark").show();
			var data_hl_id = container.attr('data-hl-id');
			var claim_id = $("#claim-maker").attr("claim-id");
			$.ajax({
				url: '/phase2/remove_nugget_from_claim/',
				type: 'post',
				data: {
					'highlight_id': data_hl_id,
					'claim_id': claim_id
				},
				success: function(xhr) {
					$("#candidate-nugget-list-container").html(xhr.html);
					showClaimActivity(claim_id);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});		
		}).on("click", ".source-nugget", function(e) {
			var container = $(this).closest(".workbench-nugget");
			var hl_id = container.attr('data-hl-id');
			$.ajax({
				url: '/workbench/api_get_doc_by_hl_id/',
				type: 'post',
				data: {
					'hl_id': hl_id,
				},
				success: function(xhr) {
					// $("#workbench-document-modal").animate({scrollTop: 0}, 0);
					// $(".section-content[data-id=" + xhr.highlight.context_id + "] .tk[data-id=" + xhr.highlight.start + "]")

					// var $highlight = $($(".section-content[data-id=" + xhr.highlight.context_id + "] .tk[data-id=" + xhr.highlight.start + "]")[0]);
					// var tmp1 = $highlight.position().top; 
					// var tmp2 = $highlight.offsetParent().position().top;
					// var tmp = tmp1 + tmp2 + 300;
					// $(".modals").animate({scrollTop: tmp}, 0);
					// $highlight.css("background-color", "yellow");

					$("#document-container").html(xhr.workbench_document);
					$("#document-container-modal").modal("show");
					$(".modals").animate({scrollTop: 0}, 0);

					setTimeout(function(){
						var $highlight = $($("#document-container-modal .section-content[data-id=" + xhr.highlight.context_id + "] .tk[data-id=" + xhr.highlight.start + "]")[0]);
						$('.modals').animate({scrollTop: $highlight.offset().top - 200}, 1000);

						// var tmp1 = $highlight.position().top; 
						// var tmp2 = $highlight.offsetParent().position().top;
						// var tmp = tmp1 + tmp2 + 400;
						// console.log("tmp1 = " + tmp1);
						// console.log("tmp2 = " + tmp2);
						// $(".modals").animate({scrollTop: tmp}, 0);

						// loop over all words in the highlight
						for (var i = xhr.highlight.start; i <= xhr.highlight.end; i++) {
							var $token = $($("#document-container-modal .section-content[data-id=" + xhr.highlight.context_id + "] .tk[data-id=" + i + "]")[0]);
							$token.css("background-color", "yellow");
						}
					}, 500);

				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});						
		});

		$("body").on("click", "#clear-claim", function(e) {
			// $("#workbench-nugget-list .nugget-select-mark").hide();
			var textarea = $("#claim-maker").find("textarea");
			textarea.removeAttr("data-id");
			textarea.val("");
			// $("#candidate-nugget-list").empty();
		}).on("click", "#post-claim", function(e) {
			var textarea = $("#claim-maker").find("textarea");
			var content = textarea.val();
			var data_hl_ids = textarea.attr("data-id");
			$.ajax({
				url: '/phase2/put_claim/',
				type: 'post',
				data: {
					data_hl_ids: data_hl_ids,
					theme_id: $("#nugget-list-theme").val(),
					content: content,
				},
				success: function(xhr) {
					$("#clear-claim").click();
					module.get_claim_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", "#suggest-claim", function(e) {
			var textarea = $("#claim-maker").find("textarea");
			var content = textarea.val();
			var claim_id = $("#claim-maker").attr("claim-id");
			$.ajax({
				url: '/phase2/suggest_claim/',
				type: 'post',
				data: {
					content: content,
					claim_id: claim_id,
				},
				success: function(xhr) {
					$("#clear-claim").click();
					showClaimActivity(claim_id);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", ".source-claim", function(e) {
			var container = $(this).closest(".workbench-claim-item");
			if (container.attr("nugget-ids").trim() != "") {
				var highlight_ids = container.attr("nugget-ids").trim().split(",");
				$("#workbench-nugget-list .workbench-nugget").hide();
				$("#nugget-list-back").show();
				if (highlight_ids)
				for (var i = 0; i < highlight_ids.length; i++){
					$("#workbench-nugget-list .workbench-nugget[data-hl-id=" + highlight_ids[i] + "]").show();
				}
			} else {
				Utils.notify('error', "No nuggets are asscoaited with the claim you click.");
			}
		}).on("click", ".expand-claim", function(e) {
			var container = $(this).closest(".workbench-claim-item");
			var claim_id = container.attr("claim-id");
			$(".workbench-claim-item-detail").hide();
			$(".workbench-claim-item-detail[claim-id=" + claim_id + "]").show();
			showClaimActivity(claim_id);
			$("#claim-list-back").show();
		}).on("click", ".workbench-claim-content", function(e) {
			var container = $(this).closest(".workbench-claim-item");
			var claim_id = container.attr("claim-id");
			$(".workbench-claim-item-detail").hide();
			$(".workbench-claim-item-detail[claim-id=" + claim_id + "]").show();
			showClaimActivity(claim_id);
			$("#claim-list-back").show();		
		}).on("click", ".remove-claim", function(e) {
			var claim_id = $("#claim-maker").attr("claim-id");
			$.ajax({
				url: '/workbench/api_remove_claim/',
				type: 'post',
				data: {
					claim_id: claim_id,
				},
				success: function(xhr) {
					$("#claim-list-back").click();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", ".adopt-claim", function(e) {
			var version_id = $(this).attr("version-id");
			$.ajax({
				url: '/phase2/adopt_claim/',
				type: 'post',
				data: {
					version_id: version_id,
				},
				success: function(xhr) {
					showClaimActivity($("#claim-maker").attr("claim-id"));
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});



		$("body").on("click", "#add-new-claim", function(e) {
			$("#claim-list").hide();
			$("#claim-detail").show();
			$("#claim-list-back").show();
			var content = "";
			var data_hl_ids = "";
			$.ajax({
				url: '/phase2/put_claim/',
				type: 'post',
				data: {
					data_hl_ids: data_hl_ids,
					theme_id: "-1",
					content: content,
				},
				success: function(xhr) {
					showClaimActivity(xhr.claim_id);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});

		$("body").on("click", ".use-nugget-num", function(e) {
			var container = $(this).closest(".workbench-nugget");
			var claim_ids = container.attr("claim-ids").trim().split(",");
			$(".workbench-claim-item").hide();
			$("#claim-list-back").show();
			for (var i = 0; i < claim_ids.length; i++) {
				$(".workbench-claim-item[claim-id=" + claim_ids[i] + "]").show();
			}
		});
		$("body").on("click", "#nugget-list-back", function(e) {
			$("#workbench-nugget-list .workbench-nugget").show();
			$("#nugget-list-back").hide();
		});
		$("body").on("click", "#claim-list-back", function(e) {
			$("#claim-detail").hide();
			$("#claim-list-back").hide();
			$("#claim-list").show();
			$("#claim-list .workbench-claim-item").show();
			module.get_claim_list();
		});

		// $("body").on("mouseover", ".nugget-select-mark", function(e) {
		// 	$(this).removeClass("green").addClass("red");
		// 	$(this).find("i").removeClass("checkmark").addClass("remove")
		// }).on("mouseleave", ".nugget-select-mark", function(e) {
		// 	$(this).removeClass("red").addClass("green");
		// 	$(this).find("i").removeClass("remove").addClass("checkmark");
		// }).on("click", ".nugget-select-mark", function(e) {
		// 	var nugget_id = $(this).closest(".workbench-nugget").attr("data-hl-id");
		// 	$(".workbench-nugget[data-hl-id=" + nugget_id + "] .nugget-select-mark").hide();
		// 	$("#candidate-nugget-list .workbench-nugget[data-hl-id=" + nugget_id + "]").remove();
		// 	var textarea = $("#claim-maker").find("textarea");
		// 	var array = textarea.attr("data-id").split(",");
		// 	var index = array.indexOf(nugget_id);
		// 	if (index > -1) {
		// 	    array.splice(index, 1);
		// 	}
		// 	textarea.attr("data-id", array.join());
		// });

		$("body").on("click", ".comment-nugget", function(e) {
			var container = $(this).closest(".workbench-nugget");
			var highlight_id = container.attr('data-hl-id');
			showNuggetCommentModal(highlight_id);
		});

		

		var showClaimActivity = function(claim_id) {
			$.ajax({
				url: "/phase2/get_claim_activity/",
				type: 'post',
				data: {
					"slot_id": claim_id,
					action: 'load-thread'
				},
				success: function(xhr) {
					$("#claim-list").hide();
					$("#claim-detail").html(xhr.html);
					$("#claim-detail").show();
					$('.ui.accordion').accordion();
					$(".avatar1").popup('remove popup').popup('destroy');
					$(".avatar1").popup();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				},
			});
		};

		var showNuggetCommentModal = function(highlight_id) {
			$.ajax({
				url: '/phase1/get_nugget_comment_list/',
				type: 'post',
				data: {
					'highlight_id': highlight_id,
				},
				success: function(xhr) {		
					var highlight_id = xhr.nugget_comment_highlight.id;
					$('#nugget-comment-highlight').html(xhr.nugget_comment_highlight);
					$('#nugget-comment-list').html(xhr.nugget_comment_list);
					$('#nugget-comment-modal').modal('show');
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		};

		var updateNuggetCommentList = function() {
			var container = $("#nugget-comment-highlight").find(".workbench-nugget");
			var highlight_id = container.attr('data-hl-id');
			$.ajax({
				url: '/phase1/get_nugget_comment_list/',
				type: 'post',
				data: {
					'highlight_id': highlight_id,
				},
				success: function(xhr) {
					$('#nugget-comment-list').html(xhr.nugget_comment_list);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		};

		$("#nugget-comment-modal").on("click", ".nugget-comment-post", function(){
			var text = $(this).closest("form").find("textarea").val();
		 	var parent_id = "";
		 	var highlight_id = $("#nugget-comment-modal").find(".workbench-nugget").attr("data-hl-id");
		 	var textarea = $(this).closest("form").find("textarea");
			$.ajax({
				url: '/phase1/put_nugget_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
					'highlight_id': highlight_id,
				},
				success: function(xhr) {
					textarea.val("");
					updateNuggetCommentList();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", ".nugget-comment-reply-save", function(){
			var text = $(this).closest("form").find("textarea").val();
		 	var parent_id = $(this).closest(".comment").attr("comment-id");
		 	var highlight_id = $("#nugget-comment-modal").find(".workbench-nugget").attr("data-hl-id");
		 	var textarea = $(this).closest("form").find("textarea");
			$.ajax({
				url: '/phase1/put_nugget_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
					'highlight_id': highlight_id,
				},
				success: function(xhr) {
					textarea.val("");
					textarea.closest(".form").hide();
					updateNuggetCommentList();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", ".nugget-comment-reply-cancel", function(){
		 	var textarea = $(this).closest("form").find("textarea");
			textarea.val("");
			textarea.closest(".form").hide();
		}).on("click", ".nugget-comment-reply", function(){
		 	$(this).closest(".content").find(".form").show()
		});

		$("#claim-detail").on("click", ".make-comment", function(event){
			event.preventDefault();
			var text = $("#activity-comment-form").find("textarea").val();
			var claim_id = $("#claim-maker").attr("claim-id");
			var comment_type = "comment";
			if ($('#activity-comment-form input[name="question"]').is(":checked")) {
				comment_type = "question";
			}
			$.ajax({
				url: '/phase2/add_comment_to_claim/',
				type: 'post',
				data: {
					parent_id: 		"",
					text: 			text,
					claim_id: 		claim_id,
					comment_type: 	comment_type
				},
				success: function(xhr) {
					showClaimActivity($("#claim-maker").attr("claim-id"));
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		}).on("click", ".reply-comment-save", function(){
			var text = $(this).closest("form").find("textarea").val();
			var claim_id = $("#claim-maker").attr("claim-id");
			var parent_id = $(this).attr("parent-id");
			$.ajax({
				url: '/phase2/add_comment_to_claim/',
				type: 'post',
				data: {
					parent_id: 		parent_id,
					text: 			text,
					claim_id: 		claim_id,
					comment_type: 	"comment",
				},
				success: function(xhr) {
					showClaimActivity($("#claim-maker").attr("claim-id"));
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		}).on("click", ".reply-comment-cancel", function(){
		 	var textarea = $(this).closest("form").find("textarea");
			textarea.val("");
			textarea.closest(".form").hide();
		}).on("click", ".reply-comment", function(){
		 	$(this).closest(".content").find(".form").show();
		}).on("click", ".question-resolved", function () {
			// become unresolved
			$(this).closest(".event").find(".question-unresolved").show();
			$(this).hide();
			var question_id = $(this).closest(".event").find(".summary").attr("comment-id");
			changeQuestionStatus(question_id, "false");
		}).on("click", ".question-unresolved", function () {
			// become resolved
			$(this).closest(".event").find(".question-resolved").show();
			$(this).hide();
			var question_id = $(this).closest(".event").find(".summary").attr("comment-id");
			changeQuestionStatus(question_id, "true");
		});

		var changeQuestionStatus = function(question_id, is_resolved) {
			$.ajax({
				url: '/phase2/update_question_isresolved/',
				type: 'post',
				data: {
					question_id: 		question_id,
					is_resolved: 		is_resolved,
				},
				success: function(xhr) {
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		}
	};

	module.initLayout = function() {
		// $.when(module.get_theme_list()).done(function(promise1) {
		$.when(module.get_nugget_list(), module.get_claim_list()).done(function(promise1, promise2) {
			module.initEvents();
		});
		// });
		// helper functions
	};

	module.initLayout();

	return module;
});




