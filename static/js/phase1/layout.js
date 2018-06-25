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
	sessionStorage.setItem('statement-view', 'list');
	sessionStorage.setItem("read-mode", "collaborative");
	sessionStorage.setItem("activity-filter", "statement-candidate");

	var myWorkColor = "rgb(158, 202, 225)";
	var otherWorkColor = "rgb(254, 227, 145)";

	$(".read-mode[data-id=individual]").css("background-color", myWorkColor);
	$(".read-mode[data-id=collaborative]").css("background-color", otherWorkColor);

	var module = {};
	
	module.put_viewlog_interval = 3 * 1000;
	module.idle_reset_time = 15 * 1000;

	// theme object
	module.Theme = {};
	module.Theme.themes = {};
	module.Theme.colorMap = {};
	module.Theme.init = function() {
		module.Theme.themes = {};
	};
	module.Theme.put = function(theme_name, theme_id) {
		if (!(theme_name in module.Theme.themes)) {
			module.Theme.themes[theme_name] = theme_id;
		}
	};
	module.Theme.initColorSchema = function() {
		var i = 0;
		for (var theme_name in module.Theme.themes) {
			module.Theme.colorMap[module.Theme.themes[theme_name]] = colorbrewer["Pastel1"][8][i];
			i++;
		}
	};
	module.Theme.init();

	//highlight object
	module.Highlight = {};
	module.Highlight.textMap = {};
	module.Highlight.newHighlight = {};

	module.drag_drop_events = function() {

		$(".statement-entry").on("dragover", function(event) {
		    event.preventDefault();  
		    event.stopPropagation();
		});

		var dropTarget = $('.statement-entry'),
		    showDrag = false,
		    timeout = -1,
		    counter = 0;

		$('.statement-entry').bind('dragenter', function (event) {
		    event.preventDefault();  
		    event.stopPropagation();
		    counter++;
		    $(this).addClass('dragging');
		    $(this).css({
		      backgroundColor : "#ddd"
		    });
		    showDrag = true; 
		    console.log("dragenter...");
		});
		$('.statement-entry').bind('dragleave', function (event) {
		    event.preventDefault();  
		    event.stopPropagation();
		    counter--;
		    if (counter === 0) { 
			    showDrag = false; 
			    clearTimeout( timeout );
			    timeout = setTimeout( function(){
			        if( !showDrag ){  }
			    }, 200 );
			    $(this).removeClass('dragging');
			    $(this).css({
			      backgroundColor : ""
			    });
			    console.log("dragleave...");
		    }
		});

		$('.statement-entry').on('drop', function (event) {
		    event.preventDefault();  
		    event.stopPropagation();
		    counter = 0;
		    $(this).css({
		      backgroundColor : ""
		    });
			console.log("drop...");
			var slot_id = $(this).attr("data-id");
		    _create_nugget(slot_id);
		});
	};

	module.update_statement = function() {
		return $.ajax({
			url: '/api_draft_stmt/',
			type: 'post',
			data: {},
			success: function(xhr) {
				$('#statement-container').html(xhr.html);
				module.drag_drop_events();
				var category = sessionStorage.getItem("category");
				$('.category-tab[data-id=' + category + ']').click();
			},
			error: function(xhr) {
				$('#draft-stmt').css('opacity', '1.0');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};

	module.render_highlights = function(doc_id) {
		var promise = $.ajax({
			url: '/phase1/get_highlights/',
			type: 'post',
			data: {
				doc_id: doc_id,
			},
			success: function(xhr) {
				module.Highlight.highlights = xhr.highlights;
				for (var j = 0; j < module.Highlight.highlights.length; j++) {
					var highlight = module.Highlight.highlights[j];
					var $context = $("#workbench-document-container").find('.section-content[data-id="' + highlight.context_id + '"]');
					// assume orginal claims are nuggets now 
					var className = '';
					if (! module.Highlight.highlights[j].is_nugget) {
						// className = 'this_is_a_question';
						// // loop over all words in the highlight
						// var text = [];
						// for (var i = highlight.start; i <= highlight.end; i++) {
						// 	var $token = $context.find('.tk[data-id="' + i + '"]');
						// 	text.push($token.text());
						// 	if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
						// 		$token.addClass(className).attr('data-hl-id', highlight.id);
						// 		$token.css("border-bottom", "3px solid red");
						// 	} else {
						// 		var curr_id = $token.attr('data-hl-id'); // append highlight for this word
						// 		$token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id);
						// 	}
						// }
					} else {
						// loop over all words in the highlight
						var text = [];
						for (var i = highlight.start; i <= highlight.end; i++) {
							var $token = $context.find('.tk[data-id="' + i + '"]');
							text.push($token.text());
							if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
								$token.addClass(className).attr('data-hl-id', highlight.id);
								$token.attr('used_in_slots', highlight.used_in_slots);
								if (sessionStorage.getItem("read-mode") === "collaborative") {
									if (highlight.used_in_slots.length > 0) {
										$token.css("background-color", otherWorkColor);
									}
								}
								if (highlight.author_id.toString() === sessionStorage.user_id.toString()) {
									// my work
									if (highlight.used_in_slots.length > 0) {
										$token.css("background-color", myWorkColor);
										$token.addClass("my-work");
									}
								} 
							} else {
								var curr_id = $token.attr('data-hl-id'); // append highlight for this word
								$token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id);
							}
							
						}						
					}

					module.Highlight.textMap[highlight.id] = text.join('');
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise;
	};

	module.get_document_content = function(doc_id) {
		$("#doc-only").show();
		$.ajax({
			url: '/workbench/api_get_doc_by_doc_id/',
			type: 'post',
			data: {
				'doc_id': doc_id,
			},
			success: function(xhr) {
				$("#workbench-document-container").html(xhr.workbench_document);
				module.render_highlights(doc_id);
				// module.applyFilter();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};

	module.get_document_toc = function() {
		$.ajax({
			url: '/workbench/api_get_toc/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#document-toc-container").html(xhr.document_toc);
				$("#workbench-document-container").html(xhr.document_toc);
				$(".document-toc-doc-link").click(function(e) {
					var doc_id = e.target.getAttribute("data-id");			
					module.get_document_content(doc_id);
					$("#document-toc-container").popup("hide all");
				});
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});		
	};

	module.get_nugget_list = function() {
		var promise = $.ajax({
			url: '/phase1/get_nugget_list/',
			type: 'post',
			data: {
				theme_id: $("#nugget-list-theme").val(),
			},
			success: function(xhr) {
				$("#workbench-nugget-list").html(xhr.workbench_nugget_list);
            },
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise;

	};

	var _create_nugget = function (slot_id) {
		
		var nugget_status = sessionStorage.getItem("nugget-status");
		
		$.ajax({
			url: '/api_highlight/',
			type: 'post',
			data: $.extend({
				nugget_status: nugget_status,
				action: 'create',
				hl_type: "nugget",
				nugget_id: $("#doc-highlight-toolbar").attr("nugget-id"),
				slot_id: slot_id,
				category: $(".category-tab.active").attr("data-id"),
			}, module.Highlight.newHighlight),
			success: function(xhr) {
				// send nugget map
				afterAddHighlight(xhr.highlight_id);
				var view = sessionStorage.getItem('statement-view');
				if (view == "detail") {
					$(".show-workspace[slot-id=" + slot_id + "]").click();
				} else if (view == "list") {
					module.update_statement();
				} 
				$(this).hasClass("dragging");
				sessionStorage.setItem("nugget-status", "new");
			},
			error: function(xhr) {
				$('#doc-highlight-toolbar .button').removeClass('loading');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};

	function afterAddHighlight(newHighlightId) {
		// reset input boxes
		$('#doc-highlight-toolbar').hide();

		// dispatch to other users
		//require('realtime/socket').dispatchNewHighlight(newHighlightData);

		// update current highlights dataset
		//module.highlightsData.push(newHighlightData);

		// update question panel
		// require('doc/qa').updateQuestionList();

		var doc_id = $(".workbench-doc-item").attr("data-id");
		module.get_document_content(doc_id);
		// module.get_nugget_list();
	}

	function _stmtUpdater(data) {
		return $.ajax({
			url: '/api_draft_stmt/',
			type: 'post',
			data: data,
			success: function(xhr) {
				
			},
			error: function(xhr) {
				$('#draft-stmt').css('opacity', '1.0');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	module.initEvents = function() {

		$("body").on("click", ".temp-used.label", function(){
			var statements = $(this).attr("data-tooltip").trim().split(/\s+/);
			for (var i = 0; i < statements.length; i++) {
				var statement_id = statements[i].slice(1);
				if (i === statements.length - 1) {
					$(".container").animate({scrollTop: 0}, 0);
					var v1 = $(".event[data-id=" + statement_id + "]").position().top;
					var v2 = $(".event[data-id=" + statement_id + "]").offsetParent().position().top;
					$(".container").animate({scrollTop: v1 + v2}, 0);
				}
				$(".event[data-id=" + statement_id + "]").css("background-color", "yellow");
				setTimeout(function() {
					$(".event").css("background-color", "");	
				}, 2500);	
			}
		});

		$("body").on("click", "#nugget-bag-close", function(){
			$("#nugget-bag").hide();
			$("#nugget-bag-close").hide();
			$("#nugget-bag-origin").show();
			
			$("#nugget-bag-origin").html($("#nugget-bag").html());
			$( ".src_claims" ).sortable();
		
		}).on("click", "#nugget-bag-open", function(){
			$("#nugget-bag").show();
			$("#nugget-bag-close").show();
			$("#nugget-bag-origin").hide();

			$("#nugget-bag").html($("#nugget-bag-origin").html());
			$( ".src_claims" ).sortable();
		});
		
		// $(".read-mode-new").checkbox();
		// $("body").on("click", ".read-mode", function(){
		// 	$(".read-mode").removeClass("active");
		// 	$(this).addClass("active");
		// 	var mode = $(this).attr("data-id");
		// 	sessionStorage.setItem("read-mode", mode);
		// 	var doc_id = $(".workbench-doc-item").attr("data-id");
		// 	module.get_document_content(doc_id);
		// }).on("click", ".read-mode-new", function(){
		// 	if (!$(".read-mode-new").checkbox("is checked")) {
		// 		$(".read-mode[data-id=individual]").click();
		// 	} else {
		// 		$(".read-mode[data-id=collaborative]").click();
		// 	}
		// });

		$("body").on("click", ".all-activity", function(){
			$(".activity-filter a").removeClass("active");
			$(this).addClass("active");
			$(".event").show();
			sessionStorage.setItem("activity-filter", "all-activity");
		}).on("click", ".statement-candidate", function(){
			$(".activity-filter a").removeClass("active");
			$(this).addClass("active");
			$(".event").show();
			$(".event").each(function(){
		        if ($(this).attr("data-type") != "claim version") $(this).hide();
		    });
		    sessionStorage.setItem("activity-filter", "statement-candidate");
		}).on("click", ".statement-comment", function(){
			$(".activity-filter a").removeClass("active");
			$(this).addClass("active");
			$(".event").show();
			$(".event").each(function(){
		        if ($(this).attr("data-type") != "comment") $(this).hide();
		    });
		    sessionStorage.setItem("activity-filter", "statement-comment");
        });
        $("body").on('click', '.remove-claim', function(e) {
			e.stopPropagation();
			var result = confirm("Want to delete?");
			if (result) {
				// since a claim can be refered by multiple slots, both claim_id and slot_id are needed
				var claim_id = $(this).closest('.src_claim').attr('data-id');
				var slot_id = $(this).closest('.src_claims').attr('slot-id');
				var category = $(".category-tab.active").attr("data-id");
				$(this).closest(".src_claim").remove();
				_stmtUpdater({
					'action': 'destmt',
					'claim_id': claim_id,
					'slot_id': slot_id
				}).done(function() {
					var view = sessionStorage.getItem('statement-view');
					if (view == "detail") {
						$(".show-workspace[slot-id=" + slot_id + "]").click();
					} else if (view == "list") {
						module.update_statement();
					}
					var doc_id = $(".workbench-doc-item").attr("data-id");
					if (doc_id !== undefined) module.get_document_content(doc_id);
				});
			}
		}).on('click', '.use-nugget-2', function(e) {
			$(this).closest(".src_claim").css("border", "1px solid");
			var claim_id = $(this).closest(".src_claim").attr("data-id");
			var new_label = '<a class="ui used label" style="display: inline-block !important; margin-bottom: 0.5rem;" claim-id='
				 + claim_id
				 + '>N' + claim_id + '<i class="delete icon"></i></a>';
			$("#use-nugget-labels").append(new_label);
			var text = $(this).closest(".src_claim").find("span").text();
			text = $("textarea.reword.editor").val() + text;
			$("textarea.reword.editor").val(text);
			textarea_autoresize();
		}).on('click', '#use-nugget-labels i.delete.icon', function(e) {
			var claim_id = $(this).closest(".label").attr("claim-id");
			$(this).closest(".label").remove();
			$(".src_claim[data-id=" + claim_id + "]").css("border", "");
			textarea_autoresize();
		});

		$("body").on("click", ".statement-question-comment", function(){
			var slot_id = $(this).attr("slot-id");
			showStatementCommentList(slot_id);
		});
		var showStatementCommentList = function(slot_id) {
			$.ajax({
				url: '/phase0/get_statement_comment_list/',
				type: 'post',
				data: {
					'slot_id': slot_id,
				},
				success: function(xhr) {	
					$('#phase0-container').html(xhr.statement_comment_list);

					textarea_autoresize();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		};

		$('body').on('click', '.feed-edit-claim-2', function(e) {
			$(this).closest('.statement-entry').find(".edited").hide();
			$(this).closest('.statement-entry').find(".editing").show();
			textarea_autoresize();
		}).on('click', '.feed-edit-claim-cancel-2', function(e) {
			$(this).closest('.statement-entry').find(".editing").hide();
			$(this).closest('.statement-entry').find(".edited").show();
            let $container = $(this).closest('.statement-entry');
			var content = $container.find(".improved.text .content").text();
			$container.find("textarea").val(content);
		}).on('click', '.feed-edit-claim-save-2', function(e) {
            let $container = $(this).closest('.statement-entry');
			var content = $container.find("textarea").val();
			var claim_version_id = $container.attr("data-id");
			$container.find(".improved.text .content").text(content);
			$container.find("textarea").val(content);
			$(this).closest('.statement-entry').find(".editing").hide();
			$(this).closest('.statement-entry').find(".edited").show();
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'update',
					content: content,
					claim_version_id: claim_version_id,
				},
				success: function(xhr) {
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});


		// $('body').on('mouseenter', '.adopted-statement', function() {
		// 	$(this).find(".reorder-btns").show();
		// }).on('mouseleave', '.adopted-statement', function() {
		// 	$(this).find(".reorder-btns").hide();
		// }).on('click', '.statement-reorder-up', function() {
		// 	var claim_id = $(this).closest(".adopted-statement").attr("data-id");
		// 	reorderStatement(claim_id, true);
		// }).on('click', '.statement-reorder-down', function() {
		// 	var claim_id = $(this).closest(".adopted-statement").attr("data-id");
		// 	reorderStatement(claim_id, false);
		// });
        //
		// var reorderStatement = function(claimId, isUpvote){
		// 	$.ajax({
		// 		url: '/api_draft_stmt/',
		// 		data: {
		// 			action: 'reorder',
		// 			claim_id: claimId,
		// 			is_upvote: isUpvote.toString(),
		// 		},
		// 		success: function() {
		// 			var slot_id = $(".slot").attr("data-id");
		// 			$(".show-workspace[slot-id=" + slot_id + "]").click();
		// 		},
		// 	})
		// };

		// $('body').on('mouseenter', '.src_claim', function() {
		// 	$(this).find(".src_claim_actions").show();
		// }).on('mouseleave', '.src_claim', function() {
		// 	$(this).find(".src_claim_actions").hide();
		// });

		// static event listeners
		// $('body').on('click', '.claim-reword-btn', function() {
		// 	var slot_id = $(this).closest(".slot").attr("data-id");
		// 	$('#slot-detail').find(".reword.form").transition('slide down', '500ms');
		// }).on('click', '.reword.form .submit.button', function() {
		// 	var slot_id = $(this).closest(".slot").attr("data-id");
		// 	var content = $('#slot-detail').find(".claim.reword.editor").val();
		// 	if ($.trim(content).length == 0) {
		// 		Utils.notify('error', 'Content must not be empty.');
		// 		return;
		// 	}
		// 	var collective = false;
		// 	// var request_action = $('.reword.form .request-action.checkbox').checkbox('is checked');
		//
		// 	var claim_ids = [];
		// 	$("#use-nugget-labels .label.used").each(function(v){
		// 		claim_ids.push($(this).attr("claim-id"));
		// 	});
		// 	$.ajax({
		// 		url: '/api_claim/',
		// 		type: 'post',
		// 		data: {
		// 			'claim_ids[]': claim_ids,
		// 			action: 'reword',
		// 			content: content,
		// 			slot_id: slot_id,
		// 			collective: collective,
		// 		},
		// 		success: function(xhr) {
		// 			if (collective == 'true') {
		// 				// the new version is adopted!
		// 				$(".show-workspace[data-id=" + slot_id + "]").click();
		// 			} else {
		// 				$('#claim-activity-feed').feed('update', {
		// 					'type': 'claim',
		// 					'id': slot_id,
		// 				});
		// 				$('#claim-pane-fullscreen .claim.reword.editor').val('');
		// 				$('#claim-pane-fullscreen .reword.form').transition('slide down', '500ms');
		// 			}
		// 			// TODO realtime notify everyone
		// 			$(".activity-filter .statement-candidate").click();
		// 		},
		// 		error: function(xhr) {
		// 			if (xhr.status == 403) {
		// 				Utils.notify('error', xhr.responseText);
		// 			}
		// 		}
		// 	});
		// }).on('click', '.reword.form .reset.button', function() {
		// 	$('#claim-pane-fullscreen .claim.reword.editor').val('');
		// 	$('#claim-pane-fullscreen .reword.form').transition('slide down', '500ms');
		// }).on('click', '.feed-reword-claim', function() {
		// 	$('#claim-pane .reword.form input[name="collective"]').val('true');
		// 	$('#claim-pane .claim.reword.editor')
		// 		.val($.trim($('#claim-pane .claim-content').text()));
		// 	$('#claim-pane .reword.form').transition('slide down', '500ms');
		// });

		$("body").on("click", ".back-to-statement-list", function(){
			$('#slot-overview').show();
			module.update_statement();
			$('#slot-detail').attr("slot-id","");
			$('#slot-detail').hide();
			sessionStorage.setItem('statement-view', 'list');
		}).on("click", ".show-workspace", function(){
			var slot_id = $(this).attr("data-id");
			$('#slot-detail').attr("slot-id",slot_id);
			$.ajax({
				url: '/api_get_slot/',
				type: 'post',
				data: {
					'action': 'get-slot',
					'slot_id': slot_id, // used only when display_type == 'fullscreen'
				},
				success: function(xhr) {					
					$('#slot-overview').hide();
				
					$('#slot-detail').show();

					$('#slot-detail .container').empty();
					$('#slot-detail .container').html(xhr.html);
					$('#slot-detail').find(".reword").show();
					// load activities
					$('#claim-activity-feed').feed('init');
					$('#claim-activity-feed').feed('update', { // async
						'type': 'claim',
						'id': slot_id,
					});
					$('.reword.form .request-action.checkbox').checkbox();

					if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
						$('#slot-detail .facilitator-only').show();
					}
					$("#draft-stmt-container").animate({scrollTop: 0}, 0);
					// var offset = $(".show-workspace[data-id=" + slot_id + "]").offset().top;
					// $("#draft-stmt-container").animate({scrollTop: (offset - 100)}, 100);
					module.drag_drop_events();
					sessionStorage.setItem('statement-view', 'detail');

					$('#show-statement-btn')
						.popup({
							position : 'bottom center',
							target   : '#statement-detail-header',
							title    : $(".slot .segment h3").html(),
							on: 'click',
							closable:	false,
							setFluidWidth:	false
						})
					;

					$( ".src_claims" ).sortable();
					// $("#nugget-bag").html(xhr.popup_nuggets);
				},
				error: function(xhr) {
					$('#claim-pane-fullscreen').html('');
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});		
		});

		// var textarea = document.getElementsByClassName("reword editor")[0];
		// var result   = document.getElementById("result");

		// textarea.addEventListener("input", function(){
		//   var v = wordCount( this.value );
		//   result.innerHTML = (
		//       "<br>Characters (no spaces):  "+ v.charactersNoSpaces +
		//       "<br>Characters (and spaces): "+ v.characters +
		//       "<br>Words: "+ v.words +
		//       "<br>Lines: "+ v.lines
		//   );
		// }, false);


		$('body').on('keydown', '.reword.editor', function(){
			console.log("key");
			var count = $(this).val().split(" ").length;
			if ($(this).val() == "") count = 0;
			$("#result").html(
				"<br>Word Count: "+ count
			);
			if (count >= 50) {
				$("#result").css("color", "red");
			} else {
				$("#result").css("color", "");
			}
		});

		$('body').on('click', '.create-new-slot-btn', function(){
			$("#new-slot-modal").modal('show');
			var category = $(".category-tab.active").attr("data-id").toUpperCase();
			$("#new-slot-modal .label").text(category);
		});

		var showSlotCommentList = function(slot_id) {
			$.ajax({
				url: '/phase0/get_statement_comment_list/',
				type: 'post',
				data: {
					'slot_id': slot_id,
				},
				success: function(xhr) {	
					$("#statement-question-comment-container").html(xhr.statement_comment_list);
					$(".ui.compact.menu").hide();
					$("#statement-question-comment-modal").modal('show');

					textarea_autoresize();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		};

		$('body').on('click', '.statement-question-comment-btn', function(){
			var slot_id = $(this).attr("slot-id");
			showSlotCommentList(slot_id);
		});

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
					showSlotCommentList(slot_id);
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
				showSlotCommentList(slot_id);
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
		textarea_autoresize();
	});

		$('body').on('click', '.statement-history-btn', function(){
			$("#statement-history").modal('show');
			var claim_version_id = $(this).closest('.event').attr("data-id") || $(this).closest('.statement-entry').attr("data-id");
			
			$.ajax({
				url: '/phase1/get_statement_version/',
				type: 'post',
				data: {
					claim_version_id: claim_version_id,
				},
				success: function(xhr) {
					$("#statement-history .content").html(xhr.html);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});

		$('body').on('click', '.category-tab', function(){
			$(".category-tab").removeClass("active");
			$(this).addClass("active");
			$('.category-list').hide();
			var category = $(this).attr("data-id");
			sessionStorage.setItem('category', category);
			$('.category-list[data-list-type=' + category + ']').show();
		});

		$('body').on('click', '.statement-post-tab', function(){
			$(".statement-post-tab").removeClass("active");	
			$(".statement-post-tab").css("border-top", "");
			$('.statement-post').hide();

			$(this).css("border-top", "2px solid #DB2828");
			$(this).addClass("active");
			var category = $(this).attr("data-id");
			$('.statement-post[data-id=' + category + ']').show();
		});

		$( "#doc-highlight-toolbar .remove").click(function(){
			$("#doc-highlight-toolbar").hide();
		});

		$('#chat-opened').resizable({
			handles: 'n,w',
			maxHeight: 600,
			maxWidth: 800,
			minHeight: 300,
			minWidth: 200
		});

		$("body").on("click", "#chat-opened .minus", function(){
			$("#chat-opened").hide();
			$("#chat-closed").show();
		}).on("click", "#chat-closed", function(){
			$("#chat-closed").hide();
			$("#chat-opened").show();
			var objDiv = document.getElementById("chat-msgs");
			objDiv.scrollTop = objDiv.scrollHeight;
		});

		$("#theme-info").popup({
			position: 	'bottom center',
		    popup: 		'#theme-info-popup'
		});

		$(".avatar1").popup('remove popup').popup('destroy');
		$(".avatar1").popup();
		$(".theme-label").popup();

		$('#document-toc-button').popup({
			on: 'click',
		    popup: '#document-toc-container', 
		    position: 'bottom right',
		});
		
		$('.ui.rating').rating();
		$('.ui.accordion').accordion();

		$("#nugget-list-theme").change(function() {
			var content = $("#nugget-list-theme option[value=" + $(this).val() + "]").attr("data-content");
			$("#theme-info-popup .content").text(content);
			// module.applyFilter();
		});

		// $("#nugget-list-author").change(function() {
		// 	module.applyFilter();
		// });

		$("body").on("click", "#highlight-delete", function(e) {
			var result = confirm("Want to delete?");
			if (result) {
				var hl_id = $("#doc-highlight-toolbar").attr("nugget-id");
				$.ajax({
					url: '/workbench/api_remove_nugget/',
					type: 'post',
					data: {
						hl_id: hl_id,
					},
					success: function(xhr) {
						var doc_id = $(".workbench-doc-item").attr("data-id");
						module.get_document_content(doc_id);
						module.update_statement();
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});
			}
		});

		$("body").on("click", ".delete-nugget", function(e) {
			var container = $(this).closest(".workbench-nugget");
			var hl_id = container.attr("data-hl-id");
			$.ajax({
				url: '/workbench/api_remove_nugget/',
				type: 'post',
				data: {
					hl_id: hl_id,
				},
				success: function(xhr) {
					var doc_id = $(".workbench-doc-item").attr("data-id");
					module.get_document_content(doc_id);
					module.get_nugget_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$("body").on("click", ".source-nugget", function(e) {
			var claim_id = $(this).closest(".src_claim").attr("data-id");
			$.ajax({
				url: '/workbench/api_get_doc_by_hl_id/',
				type: 'post',
				data: {
					'claim_id': claim_id,
				},
				success: function(xhr) {
					var hl_id = xhr.hl_id;
					var doc_id = $(".workbench-doc-item").attr("data-id");
					if (xhr.doc_id == doc_id) {
						_jump();						
					} else {
						$("#workbench-document-container").html(xhr.workbench_document);
						$.when(module.render_highlights(xhr.doc_id)).done(function(promise1) {
							_jump();
						});
					}

					$("#workbench-document-panel").append("<div class='ui segment'>" + $("#document-toc-container").html() + "</div>");
							
					function _jump() {
						$("#workbench-document-panel").animate({scrollTop: 0}, 0);
						var tmp1 = $($(".tk[data-hl-id*='" + hl_id + "']")[0]).position().top; 
						var tmp2 = $($(".tk[data-hl-id*='" + hl_id + "']")[0]).offsetParent().position().top;
						var tmp = tmp1 + tmp2 - 100;
						$("#workbench-document-panel").animate({scrollTop: tmp}, 0);
						var hl = $(".tk[data-hl-id*='" + hl_id + "']");
						var prevColor = hl.css("background-color");
						hl.css("background-color", "red");	
						setTimeout(function() {
							var hl = $(".tk[data-hl-id*='" + hl_id + "']");
							if (hl.hasClass("my-work")) hl.css("background-color", myWorkColor);	
							else hl.css("background-color", otherWorkColor);	
						}, 500);						
					}
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});						
		});
		// $("body").on("click", ".reassign-nugget", function(e) {
		// 	var container = $(this).closest(".workbench-nugget");
		// 	var html = "<div class='reassign-options'><div style='overflow:hidden;'><button class='workbench-nugget-reassign-close' style='float:right;'><i class='remove icon'></i>close</button></div>";
		// 	for (var theme_name in module.Theme.themes) {
		// 		var theme_name = theme_name;
		// 		var theme_id = module.Theme.themes[theme_name];
		// 		html = html + '<button class="reassign-btn" data-id=' + theme_id + '>' + theme_name + '</button>';
		// 	}
		// 	html = html + "</div>";
		// 	container.append(html);
		// 	container.on("click", ".reassign-btn", function(e) {
		// 		var $nugget = $(this).closest(".workbench-nugget");
		// 		var highlight_id = $nugget.attr('data-hl-id');
		// 		var theme_id = $(this).attr("data-id");
		// 		$.ajax({
		// 			url: '/phase1/change_nugget_theme/',
		// 			type: 'post',
		// 			data: {
		// 				'highlight_id': highlight_id,
		// 				'theme_id': theme_id
		// 			},
		// 			success: function(xhr) {
		// 				module.get_nugget_list();
		// 			},
		// 			error: function(xhr) {
		// 				if (xhr.status == 403) {
		// 					Utils.notify('error', xhr.responseText);
		// 				}
		// 			}
		// 		});
		// 	});
		// 	container.on("click", ".workbench-nugget-reassign-close", function(e) {
		// 		var html = $(this).closest(".workbench-nugget").find(".reassign-options");
		// 		html.remove();
		// 	});
		// });
		$("body").on("click", ".comment-nugget", function(e) {
			var container = $(this).closest(".src_claim");
			var claim_id = container.attr('data-id');
			showNuggetCommentModal(claim_id);
		});

		var showNuggetCommentModal = function(claim_id) {
			$.ajax({
				url: '/phase1/get_nugget_comment_list/',
				type: 'post',
				data: {
					'claim_id': claim_id,
				},
				success: function(xhr) {		
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

		var showStatementCommentList = function(statement_id) {
			$.ajax({
				url: '/phase1/get_statement_comment_list/',
				type: 'post',
				data: {
					'statement_id': statement_id,
				},
				success: function(xhr) {	
					$('.statement-comment-list[statement-id=' + statement_id + ']').html(xhr.statement_comment_list);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		};

		$("body").on("click", ".statement-comment-post", function(){
			var textarea = $(this).closest(".input").find("input");
			var text = textarea.val();
		 	var parent_id = "";
		 	var statement_id = $(this).attr("statement-id"); 	
			$.ajax({
				url: '/phase1/put_statement_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
					'statement_id': statement_id,
				},
				success: function(xhr) {
					textarea.val("");
					showStatementCommentList(statement_id);
					// updateStatementCommentList();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", ".statement-comment-reply-save", function(){
			var text = $(this).closest("form").find("textarea").val();
		 	var parent_id = $(this).closest(".comment").attr("comment-id");

			var $container = $(this).closest(".event");
			if ($(this).closest(".event").length === 0) $container = $(this).closest(".statement-entry");
		 	var statement_id = $container.attr("data-id");
		 	var textarea = $(this).closest("form").find("textarea");
			$.ajax({
				url: '/phase1/put_statement_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
					'statement_id': statement_id,
				},
				success: function(xhr) {
					textarea.val("");
					textarea.closest(".form").hide();
					showStatementCommentList(statement_id);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", ".statement-comment-reply-cancel", function(){
		 	var textarea = $(this).closest("form").find("textarea");
			textarea.val("");
			textarea.closest(".form").hide();
		}).on("click", ".statement-comment-reply", function(){
		 	$(this).closest(".content").find(".form").show();
		}).on("click", ".statement-comment-btn", function(){
			var $container = $(this).closest(".event");
			if ($(this).closest(".event").length === 0) $container = $(this).closest(".statement-entry");
			if ($container.find(".statement-comments").css("display") == "none") {
				var statement_id = $(this).attr("data-id");
		 		showStatementCommentList(statement_id);	
		 		$container.find(".statement-comments").show();
			} else {
				$container.find(".statement-comments").hide();
			}
		}).on("click", ".statement-retract", function(){
			var $container = $(this).closest(".statement-entry");
			var id = $(this).attr('data-id');
			$(".event[data-id=" + id + "] .feed-adopt-claim-version[data-action=deadopt]").click();
			$.ajax({
				url: '/api_claim_vote/',
				type: 'post',
				data: {
					action: "deadopt",
					version_id: id,
				},
				success: function(xhr) {
					$container.remove();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});			
		});


		$("#nugget-comment-modal").on("click", ".nugget-comment-post", function(){
			var text = $(this).closest("form").find("textarea").val();
		 	var parent_id = "";
		 	var claim_id = $("#nugget-comment-modal").find(".workbench-nugget").attr("data-claim-id");
		 	var textarea = $(this).closest("form").find("textarea");
			$.ajax({
				url: '/phase1/put_nugget_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
					'claim_id': claim_id,
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
		
		$("body").on('click', '.view-nugget-question', function(){
			var nugget_id = $("#doc-highlight-toolbar").attr("nugget-id");
			if (nugget_id !== "") {
				showNuggetCommentModal(nugget_id);				
			} else {
				Utils.notify('warning', "Please Create a Nugget First");
			}
		});

		$("#workbench-document-container").on('click', '.tk', function(e) {
			e.stopPropagation();
			if ($(this).attr("data-hl-id") !== undefined) {
				sessionStorage.setItem('nugget-status', 'exist');
				$('#doc-highlight-toolbar').show();
				$('#doc-highlight-toolbar').css('position', 'fixed');
				$('#doc-highlight-toolbar').css('left', e.pageX).css('top', e.pageY);
				var nugget_id = $(this).attr("data-hl-id").split(" ")[0];
				$("#doc-highlight-toolbar").attr('nugget-id', nugget_id);
				var text = $(this).siblings('.tk[data-hl-id="' + nugget_id + '"]').addBack().text();
				$("#highlight-content").text(text);
				$("#highlight-discussion").show();
				$("#highlight-delete").show();

				var used_in_slots = $(this).attr("used_in_slots");
				$('#doc-highlight-toolbar .used_in').text(used_in_slots);
			}
		}).on('mousedown', '.section-content', function(e) {
			$('#doc-highlight-toolbar').removeAttr('style');
			$('#doc-thread-popup').removeAttr('style');
			if ($(e.target).is('u.tk')) {
				var $target = $(this);
				$(window).mousemove(function(e2) {
					if ($(e2.target).hasClass('tk')) {
						module.isDragging = true;
						module.Highlight.newHighlight.end = e2.target.getAttribute('data-id');
						var min = Math.min(module.Highlight.newHighlight.start, module.Highlight.newHighlight.end);
						var max = Math.max(module.Highlight.newHighlight.start, module.Highlight.newHighlight.end);
						$target.find('.tk').removeClass('highlighted');
						for (var i = min; i <= max; i++) {
							$target.find('.tk[data-id="' + i + '"]').addClass('highlighted');
						}
						module.Highlight.newHighlight.contextId = $target.attr('data-id');
					} else {
						$target.find('.tk').removeClass('highlighted');
					}
				});
				module.Highlight.newHighlight.start = e.target.getAttribute('data-id');
				module.Highlight.newHighlight.end = e.target.getAttribute('data-id');
			}
		}).on('mouseup', '.section-content', function(e) {
			$(window).off('mousemove');
			var wasDragging = module.isDragging;
			module.isDragging = false;
			if (wasDragging) {
				sessionStorage.setItem('nugget-status', 'new');
				var min = Math.min(module.Highlight.newHighlight.start, module.Highlight.newHighlight.end);
				var max = Math.max(module.Highlight.newHighlight.start, module.Highlight.newHighlight.end);
				module.Highlight.newHighlight.start = min;
				module.Highlight.newHighlight.end = max;

				if ($(this).find('.tk.highlighted').length) {
					var highlights = $(this).find('.tk.highlighted');
					var text = "";
					for (var i = 0; i < highlights.length; i ++) {
						text += highlights[i].textContent;
                    }
                    module.Highlight.newHighlight.text = text;
					$('#doc-highlight-toolbar').show();
					$('#doc-highlight-toolbar').css('position', 'fixed');
					$('#doc-highlight-toolbar').css('left', e.pageX).css('top', e.pageY);
					$("#doc-highlight-toolbar").attr('nugget-id', "");
					$("#highlight-discussion").hide();
					$("#highlight-delete").hide();
					$('#highlight-content').html(module.Highlight.newHighlight.text);

					// document inner container upper bound relative to document
					var tmp2 = $("#workbench-document-panel").offset().top;
					// distance scroll to the top
					var tmp3 = $("#workbench-document-panel").scrollTop();
					// start and end of nugget relative to document
					var st = $(this).find('.tk.highlighted')[0];
					var ed = $(this).find('.tk.highlighted')[$(this).find('.tk.highlighted').length - 1];
					var top = $(st).offset().top;
					var bottom = $(ed).offset().top;
					top = top - tmp2 + tmp3;
					bottom = bottom - tmp2 + tmp3;
					// overall height
					var height = $(".workbench-doc-item").height();
					module.Highlight.newHighlight.upper_bound = top / height;
					module.Highlight.newHighlight.lower_bound = bottom / height;
				}

			} else { // just clicking
				$('#doc-highlight-toolbar').removeAttr('style');
				$(this).find('.tk').removeClass('highlighted');
			}
		});

		$('#doc-only').checkbox().checkbox({
			onChecked: function() {
				module.applyFilter();
			},
		    onUnchecked: function() {
		    	module.applyFilter();
		    }
		});
		$("#doc-only").checkbox("uncheck");
        //
		// $("body").on("click", "#create-empty-slot", function() {
		// 	var category = sessionStorage.getItem('category');
		// 	var content = $("#new-slot-modal textarea").val();
		// 	$.ajax({
		// 		url: '/api_draft_stmt/',
		// 		data: {
		// 			action: 'initiate-empty-slot',
		// 			category: category,
		// 			content: content,
		// 		},
		// 		success: function() {
		// 			$("#new-slot-modal textarea").val("");
		// 			module.update_statement();
		// 			$("#new-slot-modal").modal('hide');
		// 		},
		// 	})
		// });

		$("body").on("click", "#ask-question-about-nugget", function() {
			$.ajax({
				url: '/api_highlight/',
				type: 'post',
				data: $.extend({
					action: 'create',
					theme_id: $("#nugget-tool-bar-themes").val(),
					hl_type: "question"
				}, module.Highlight.newHighlight, $('#doc-claim-form').form('get values')),
				success: function(xhr) {
					// open q&a panel 
					sessionStorage.setItem("active_nugget_id", xhr.highlight_id);
					if (!$("#qa-wrapper").is(":visible")) {
						$("#qa-wrapper").show();
					}
					if(!$(".make-comment").is(":visible")) {
						$("#qa-wrapper .new-question").click();
						$('#qa-wrapper .new.question textarea').val("Please edit your nugget-related question here.")
					}
					afterAddHighlight(xhr.highlight_id);
				},
				error: function(xhr) {
					$('#doc-highlight-toolbar .button').removeClass('loading');
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});			
		});
	};

	// module.applyFilter = function() {
	// 	return; // noop.
    //
	// 	$( ".workbench-nugget" ).hide();
	// 	$( ".workbench-nugget" ).filter(function() {
	// 		if ($("#nugget-list-theme").val() !== "-1") {
	// 			return $(this).attr("theme-id") == $("#nugget-list-theme").val();
	// 		} else {
	// 			return $(this);
	// 		}
	// 	}).filter(function() {
	// 		if ($("#nugget-list-author").val() !== "-1") {
	// 			return $(this).attr("author-id") == $("#nugget-list-author").val();
	// 		} else {
	// 			return $(this);
	// 		}
	// 	}).filter(function() {
	// 		if ($('#doc-only').hasClass("checked")) {
	// 			return $(this).attr("doc-id") == $(".workbench-doc-item").attr("data-id");
	// 		} else {
	// 			return $(this);
	// 		}
	// 	}).show();
	// }

	module.initLayout = function() {
		// $.when(module.get_nugget_list()).done(function(promise1) {
			module.get_document_toc();
			module.initEvents();
		// });

		// module.get_author_list();

		// put heatmap
		// idleTime = 0
		// idleInterval = setInterval(function() {
		// 	idleTime = idleTime + 1;
		// 	if (idleTime < Math.floor(module.idle_reset_time / module.put_viewlog_interval) && $(".workbench-doc-item").is(":visible")) {
		// 	  if ($("#header-user-name").attr("data-role") !== "panelist") return;
		// 	  var upper = $("#workbench-document-panel").scrollTop();
		// 	  var lower = $("#workbench-document-panel").scrollTop() + $("#workbench-document-panel").height();
		// 	  var height = $("#workbench-document-container").height();
		// 	  var doc_id = $(".workbench-doc-item").attr("data-id");
		// 	  var author_id = $("#header-user-name").attr("data-id");
		// 	  $.ajax({
		// 			url: '/sankey/put_viewlog/',
		// 			type: 'post',
		// 			data: {
		// 			  "doc_id": 	doc_id,
		// 			  "lower": 		lower,
		// 			  "upper": 		upper,
		// 			  "height": 	height,
		// 			  "author_id": 	author_id
		// 			},
		// 			success: function(xhr) {
		// 			},
		// 			error: function(xhr) {
		// 			  if (xhr.status == 403) {
		// 			    Utils.notify('error', xhr.responseText);
		// 			  }
		// 			}
		// 		});
		// 	}
		// }, module.put_viewlog_interval); // every 5s
		// $("body").on("mousemove", "#workbench-document-container", function(e){
		// 	idleTime = 0;
		// })

		module.update_statement();

	};

	var textarea_autoresize = function(){
		$('textarea').each(function () {
			this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px; overflow-y:hidden; width:100%;');
		}).on('input', function () {
			this.style.height = 'auto';
			this.style.height = (this.scrollHeight) + 'px';
		});
	};

	module.initLayout();
});




