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

	var module = {};
	
	module.put_viewlog_interval = 3 * 1000;
	module.idle_reset_time = 15 * 1000;

	// theme object
	module.Theme = {}
	module.Theme.themes = {};
	module.Theme.colorMap = {};
	module.Theme.init = function() {
		module.Theme.themes = {};
	}
	module.Theme.put = function(theme_name, theme_id) {
		if (!(theme_name in module.Theme.themes)) {
			module.Theme.themes[theme_name] = theme_id;
		}
	}
	module.Theme.initColorSchema = function() {
		var i = 0;
		for (var theme_name in module.Theme.themes) {
			module.Theme.colorMap[module.Theme.themes[theme_name]] = colorbrewer["Pastel1"][8][i];
			i++;
		}
	}
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

		$('#doc-highlight-toolbar').bind('dragstart', function (event) {
		    console.log('dragstart...'); 
		});

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
			    $(this).addClass('dragging');
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
	}

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
	}

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
								if (highlight.used_in_slots.length == 0) {
									$token.css("background-color", "rgb(222, 235, 247)");
								} else {
									$token.css("background-color", "rgb(158, 202, 225)");
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
	}

	module.get_theme_list = function() {
		var promise = $.ajax({
			url: '/phase2/get_theme_list/',
			type: 'post',
			data: {},
			success: function(xhr) {
				module.Theme.init();
				for (var i = 0; i < xhr.themes.length; i++) {
					var theme = xhr.themes[i];
					module.Theme.put(theme.name, theme.id);
				}
				module.Theme.initColorSchema();
				$("#nugget-list-theme").empty();
				var content_alltheme = "All themes are shown."
				$("#nugget-list-theme").append('<option value="-1" data-content="' + content_alltheme + '">All</option>');
				$("#theme-info-popup .content").text(content_alltheme);
				for (var i = 0; i < xhr.themes.length; i++) {
					var theme_name = xhr.themes[i].name
					var theme_id = xhr.themes[i].id
					var theme_description = xhr.themes[i].description
					$("#nugget-list-theme").append('<option value="' + theme_id + '" data-content="' + theme_description + '">' + theme_name + '</option>');
					$("#nugget-tool-bar-themes").append('<option value="' + theme_id + '">' + theme_name + '</option>');
					$("#theme-top").append('<a class="ui label" ' + 'data-tooltip="' + theme_description + '" data-position="right center">'+ theme_name +'</a>');
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});	
		return promise;
	}


	module.get_author_list = function() {
		var promise = $.ajax({
			url: '/phase2/get_author_list/',
			type: 'post',
			data: {},
			success: function(xhr) {
				for (var i = 0; i < xhr.authors.length; i++) {
					var author_name = xhr.authors[i].name
					var author_id = xhr.authors[i].id
					$("#nugget-list-author").append('<option value="' + author_id + '">' + author_name + '</option>');
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});	
		return promise;
	}

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
				module.applyFilter();
				// $("#workbench-document-container").height($(window).height() - module.body_bottom);
				// $("#workbench2-document-container").animate({scrollTop: 0}, 0);
				// module.doc_id = xhr.doc_id;
				// module.load_highlights_by_doc();
				// module.get_viewlog();
				// module.get_nuggetmap();
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

				// show more... / less
				var showChar = 300;
			    var ellipsestext = "...";
			    var moretext = "more";
			    var lesstext = "less";
			    $('.more').each(function() {
			        var content = $(this).html();
			        if(content.length > showChar) {
			            var c = content.substr(0, showChar); // aaa b/bb ccc ddd
			            var h = content.substr(showChar, content.length - showChar); // bbb ccc ddd
			            var html = c + '<span class="moreellipses">' + ellipsestext+ '&nbsp;</span><span class="morecontent"><span>' + h + '</span>&nbsp;&nbsp;<a href="" class="morelink">' + moretext + '</a></span>';
			            $(this).html(html);
			        }
			    });		
		        $(".morelink").click(function(){
			        if($(this).hasClass("less")) {
			            $(this).removeClass("less");
			            $(this).html(moretext);
			        } else {
			            $(this).addClass("less");
			            $(this).html(lesstext);
			        }
			        $(this).parent().prev().toggle();
			        $(this).prev().toggle();
			        return false;
			    });  	

		        for (var theme_name in module.Theme.themes) {
					var theme_id = module.Theme.themes[theme_name];
					$(".theme-label[theme-id=" + theme_id + "]").css("background-color", module.Theme.colorMap[theme_id]);
				}

				$(".avatar1").popup('remove popup').popup('destroy');
				$(".avatar1").popup();

				module.applyFilter();
				$(".workbench-nugget .action-bar").hide();
				$(".workbench-nugget .divider").hide();
			},			
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise;

	}

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
				$(this).hasClass("dragging")
				sessionStorage.setItem("nugget-status", "new");
			},
			error: function(xhr) {
				$('#doc-highlight-toolbar .button').removeClass('loading');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

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
		module.get_nugget_list();
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

		$("body").on("click", ".all-activity", function(){
			$(".activity-filter a").removeClass("active");
			$(this).addClass("active");
			$(".event").show();
		}).on("click", ".statement-candidate", function(){
			$(".activity-filter a").removeClass("active");
			$(this).addClass("active");
			$(".event").each(function(){
		        if ($(this).attr("data-type") != "claim version") $(this).hide();
		    });		
		});

		$("body").on('click', '.remove-claim', function(e) {
			e.stopPropagation();
			var result = confirm("Want to delete?");
			if (result) {
				// since a claim can be refered by multiple slots, both claim_id and slot_id are needed
				var claim_id = $(this).parents('.src_claim').attr('data-id');
				var slot_id = $(this).parents('.statement-entry').attr('data-id');
				var category = $(".category-tab.active").attr("data-id");
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
				});
			}
		});

		$('body').on('mouseenter', '.src_claim', function() {
			$(this).find(".src_claim_actions").show();
		}).on('mouseleave', '.src_claim', function() {
			$(this).find(".src_claim_actions").hide();
		});;

		// static event listeners
		$('body').on('click', '.claim-reword-btn', function() {
			var slot_id = $(this).parents(".slot").attr("data-id");
			$('#slot-detail').find(".reword.form'").transition('slide down', '500ms');
		}).on('click', '.reword.form .submit.button', function() {
			var slot_id = $(this).parents(".slot").attr("data-id");
			var content = $('#slot-detail').find(".claim.reword.editor").val();
			if ($.trim(content).length == 0) {
				Utils.notify('error', 'Content must not be empty.');
				return;
			}
			var collective = false;
			var request_action = $('.reword.form .request-action.checkbox').checkbox('is checked');
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'reword',
					content: content,
					slot_id: slot_id,
					collective: collective,
					request_action: request_action
				},
				success: function(xhr) {
					if (collective == 'true') {
						// the new version is adopted!
						$(".show-workspace[data-id=" + slot_id + "]").click();
					} else {
						$('#claim-activity-feed').feed('update', {
							'type': 'claim',
							'id': slot_id,
						});
						$('#claim-pane-fullscreen .claim.reword.editor').val('');
						$('#claim-pane-fullscreen .reword.form').transition('slide down', '500ms');
					}
					// TODO realtime notify everyone
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.reword.form .reset.button', function() {
			$('#claim-pane-fullscreen .claim.reword.editor').val('');
			$('#claim-pane-fullscreen .reword.form').transition('slide down', '500ms');
		}).on('click', '.feed-reword-claim', function() {
			$('#claim-pane .reword.form input[name="collective"]').val('true');
			$('#claim-pane .claim.reword.editor')
				.val($.trim($('#claim-pane .claim-content').text()));
			$('#claim-pane .reword.form').transition('slide down', '500ms');
		});

		$("body").on("click", ".back-to-statement-list", function(){
			$('#slot-overview').show();
			module.update_statement();
			$('#slot-detail').attr("slot-id","");
			$('#slot-detail').hide();
			sessionStorage.setItem('statement-view', 'list');
		}).on("click", ".show-workspace", function(){
			var slot_id = $(this).attr("slot-id");
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
				},
				error: function(xhr) {
					$('#claim-pane-fullscreen').html('');
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});		
		});

		$('body').on('click', '.create-new-slot-btn', function(){
			$("#new-slot-modal").modal('show');
			var category = $(".category-tab.active").attr("data-id").toUpperCase();
			$("#new-slot-modal .label").text(category);
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

		$("body").on("click", ".workbench-nugget", function(){
			$(".workbench-nugget .action-bar").hide();
			$(".workbench-nugget .divider").hide();
			$($(this).find(".action-bar")).show();
			$($(this).find(".divider")).show();
		});

		$("#theme-info").popup({
			position: 	'bottom center',
		    popup: 		'#theme-info-popup'
		})

		$(".avatar1").popup('remove popup').popup('destroy');
		$(".avatar1").popup();
		$(".theme-label").popup();

		$('#document-toc-button').popup({
			on: 'click',
		    popup: '#document-toc-container', 
		    position: 'bottom left',
		});
		
		$('.ui.rating').rating();
		$('.ui.accordion').accordion();

		$("#nugget-list-theme").change(function() {
			var content = $("#nugget-list-theme option[value=" + $(this).val() + "]").attr("data-content");
			$("#theme-info-popup .content").text(content);
			module.applyFilter();
		});

		$("#nugget-list-author").change(function() {
			module.applyFilter();
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
			var container = $(this).closest(".workbench-nugget");
			var hl_id = container.attr("data-hl-id");
			$.ajax({
				url: '/workbench/api_get_doc_by_hl_id/',
				type: 'post',
				data: {
					'hl_id': hl_id,
				},
				success: function(xhr) {
					var doc_id = $(".workbench-doc-item").attr("data-id");
					if (xhr.doc_id == doc_id) {
						_jump();						
					} else {
						$("#workbench-document-container").html(xhr.workbench_document);
						$.when(module.render_highlights(xhr.doc_id)).done(function(promise1) {
							_jump();
						});
					}
							
					function _jump() {
						$("#workbench-document-panel").animate({scrollTop: 0}, 0);
						var tmp1 = $($(".tk[data-hl-id*='" + hl_id + "']")[0]).position().top; 
						var tmp2 = $($(".tk[data-hl-id*='" + hl_id + "']")[0]).offsetParent().position().top;
						var tmp = tmp1 + tmp2 - 200;
						$("#workbench-document-panel").animate({scrollTop: tmp}, 0);
						$(".tk[data-hl-id*='" + hl_id + "']").css("background-color", "red");	
						setTimeout(function() {
							var hl = $(".tk[data-hl-id*='" + hl_id + "']");
							hl.css("background-color", module.Theme.colorMap[hl.attr("theme_id").split(" ")[0]]);	
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
		$("body").on("click", ".reassign-nugget", function(e) {
			var container = $(this).closest(".workbench-nugget");
			var html = "<div class='reassign-options'><div style='overflow:hidden;'><button class='workbench-nugget-reassign-close' style='float:right;'><i class='remove icon'></i>close</button></div>";
			for (var theme_name in module.Theme.themes) {
				var theme_name = theme_name;
				var theme_id = module.Theme.themes[theme_name];
				html = html + '<button class="reassign-btn" data-id=' + theme_id + '>' + theme_name + '</button>';
			}			
			html = html + "</div>";	
			container.append(html);
			container.on("click", ".reassign-btn", function(e) {
				var $nugget = $(this).parents(".workbench-nugget")
				var highlight_id = $nugget.attr('data-hl-id');
				var theme_id = $(this).attr("data-id");
				$.ajax({
					url: '/phase1/change_nugget_theme/',
					type: 'post',
					data: {
						'highlight_id': highlight_id,
						'theme_id': theme_id
					},
					success: function(xhr) {		
						module.get_nugget_list();
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});
			});
			container.on("click", ".workbench-nugget-reassign-close", function(e) {
				var html = $(this).closest(".workbench-nugget").find(".reassign-options");
				html.remove();
			});
		});
		$("body").on("click", ".comment-nugget", function(e) {
			var container = $(this).closest(".workbench-nugget");
			var highlight_id = container.attr('data-hl-id');
			showNuggetCommentModal(highlight_id);
		});

		var showNuggetCommentModal = function(highlight_id) {
			$.ajax({
				url: '/phase1/get_nugget_comment_list/',
				type: 'post',
				data: {
					'highlight_id': highlight_id,
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
		}

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
		}

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
				// if ($(this).hasClass("this_is_a_question")) {
				// 	// open qa panel
				// 	if (!$("#qa-wrapper").is(":visible")) {
				// 		$("#qa-wrapper").show();
				// 		$("#qa-panel-toggle").css("right", "85px");
				// 	}
				// 	var nugget_id = $(this).attr("data-hl-id");
				// 	$question = $(".find-in-doc[data-highlight-id = " + nugget_id + "]").closest(".question");
				// 	$question.find(".expand-thread").click();
				// 	$("#qa-wrapper").scrollTop(0);
				// 	$("#qa-wrapper").scrollTop($question.position().top);
				// 	var highlight_ids = $(this).attr('data-hl-id').split(' ');
				// 	showNuggetCommentModal(highlight_ids[0]);
				// } else {

				// }
				$('#doc-highlight-toolbar').show();
				$('#doc-highlight-toolbar').css('position', 'fixed');
				$('#doc-highlight-toolbar').css('left', e.pageX).css('top', e.pageY);
				var nugget_id = $(this).attr("data-hl-id").split(" ")[0];
				$("#doc-highlight-toolbar").attr('nugget-id', nugget_id);
				var text = $(this).siblings('.tk[data-hl-id="' + nugget_id + '"]').addBack().text();
				$("#highlight-content").text(text);
				$("#highlight-discussion").show();

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
					};
					module.Highlight.newHighlight.text = text;
					$('#doc-highlight-toolbar').show();
					$('#doc-highlight-toolbar').css('position', 'fixed');
					$('#doc-highlight-toolbar').css('left', e.pageX).css('top', e.pageY);
					$("#doc-highlight-toolbar").attr('nugget-id', "");
					$("#highlight-discussion").hide();
					$('#highlight-content').html(module.Highlight.newHighlight.text);

					// document inner container upper bound relative to document
					var tmp2 = $("#workbench-document-panel").offset().top;
					// distance scroll to the top
					var tmp3 = $("#workbench-document-panel").scrollTop()
					// start and end of nugget relative to document
					var st = $(this).find('.tk.highlighted')[0]
					var ed = $(this).find('.tk.highlighted')[$(this).find('.tk.highlighted').length - 1]
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
						$("#qa-panel-toggle").css("right", "85px");
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

	module.applyFilter = function() {

		$( ".workbench-nugget" ).hide();
		$( ".workbench-nugget" ).filter(function() {
			if ($("#nugget-list-theme").val() !== "-1") {
				return $(this).attr("theme-id") == $("#nugget-list-theme").val();
			} else {
				return $(this);
			}
		}).filter(function() {
			if ($("#nugget-list-author").val() !== "-1") {
				return $(this).attr("author-id") == $("#nugget-list-author").val();
			} else {
				return $(this);
			}
		}).filter(function() {
			if ($('#doc-only').hasClass("checked")) {
				return $(this).attr("doc-id") == $(".workbench-doc-item").attr("data-id");
			} else {
				return $(this);
			}
		}).show();	
	}

	module.initLayout = function() {
		$.when(module.get_theme_list()).done(function(promise1) {
			$.when(module.get_nugget_list()).done(function(promise1) {
				module.get_document_toc();
			  	module.initEvents();
			});		
		});

		module.get_author_list();

		// put heatmap
		idleTime = 0
		idleInterval = setInterval(function() {
			idleTime = idleTime + 1;
			if (idleTime < Math.floor(module.idle_reset_time / module.put_viewlog_interval) && $(".workbench-doc-item").is(":visible")) {
			  if ($("#header-user-name").attr("data-role") !== "panelist") return;
			  var upper = $("#workbench-document-panel").scrollTop();
			  var lower = $("#workbench-document-panel").scrollTop() + $("#workbench-document-panel").height();
			  var height = $("#workbench-document-container").height();
			  var doc_id = $(".workbench-doc-item").attr("data-id");
			  var author_id = $("#header-user-name").attr("data-id");
			  $.ajax({
					url: '/sankey/put_viewlog/',
					type: 'post',
					data: {
					  "doc_id": 	doc_id,
					  "lower": 		lower,
					  "upper": 		upper,
					  "height": 	height,
					  "author_id": 	author_id
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
		}, module.put_viewlog_interval); // every 5s
		$("body").on("mousemove", "#workbench-document-container", function(e){
			idleTime = 0;
		})

		module.update_statement();

	}
	module.initLayout();
});




