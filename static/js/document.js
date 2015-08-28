define([
	'utils',
	'feed/activity-feed'
], function(
	Utils
) {
	var module = {};
	module.initDocumentView = function() {
		var _this = this;
		this.$category_element = $('#document-categories'); // static; initiate once
		this.$content_element = $('#document-pane'); // static; initiate once
		this.$annotation_element = $('#annotation-pane'); // static; initiate once

		// this.currentFolderId = -1;
		// this.currentDocId = -1;

		// highlighting
		this.currHighlights = {};
		this.newHighlight = {};
		this.isDragging = false;

		$('#doc-thread-content').feed('init');

		// element initialization
		$('.nopublish-wrapper').checkbox({
			onChecked: function() {
				$(this).parent().next().text('Save');
			},
			onUnchecked: function() {
				$(this).parent().next().text('Publish');
			}
		});

		// static listeners
		this.$content_element.click(function(e) {
			// remove all popovers
			$('#doc-thread-popup').removeAttr('style');
		});
		$('.doc-anno-btn').click(function(e) {
			_this.newHighlight.type = this.getAttribute('data-action');
			if (_this.newHighlight.type == 'comment') {
				$('#doc-claim-form').hide();
				$('#doc-comment-form').show().parent().show();
				$('#doc-comment-form textarea').focus();
				$('#doc-comment-form label span').text('Add a comment');
			} else if (_this.newHighlight.type == 'question') {
				$('#doc-claim-form').hide();
				$('#doc-comment-form').show().parent().show();
				$('#doc-comment-form textarea').focus();
				$('#doc-comment-form label span').text('Raise a question');
			} else if (_this.newHighlight.type == 'claim') {
				$('#doc-comment-form').hide();
				$('#doc-claim-form').show().parent().show();
				$('#doc-claim-form textarea').val($.trim(_this.$content_element.find('.tk.highlighted').text())).focus();
			}
		});
		$('.doc-anno-submit').click(function(e) {
			var content = $(this).parents('form').find('textarea').val();
			if ($.trim(content).length == 0) {
				Utils.notify('error', 'Content must not be empty.');
				return;
			}
			$('#doc-highlight-toolbar .button').addClass('loading');
			var nopublish = false;
			if ($(this).parents('form').hasClass('claim')) {
				nopublish = $(this).parents('form').find('.nopublish-wrapper').checkbox('is checked');
			}
			$.ajax({
				url: '/api_highlight/',
				type: 'post',
				data: $.extend({
					action: 'create',
					content: content,
					nopublish: nopublish,
				}, _this.newHighlight),
				success: function(xhr) {
					$('#doc-highlight-toolbar').removeAttr('style');
					$('#doc-highlight-toolbar textarea').val('');
					$('#doc-highlight-toolbar .button').removeClass('loading');
					$('.tk.highlighted').removeClass('highlighted')
					_this.highlight({
						type: _this.newHighlight.type,
						start: _this.newHighlight.start,
						end: _this.newHighlight.end,
						context_id: _this.newHighlight.contextId,
						id: xhr.highlight_id
					});
				},
				error: function(xhr) {
					$('#doc-highlight-toolbar .button').removeClass('loading');
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$('.doc-thread-btn').click(function(e) {
			var action = this.getAttribute('data-action');
			if (action == 'claim' && $('#doc-thread-content .event[data-type="claim"]').length) {
				Utils.notify('error', 'This highlight is already extracted as a claim');
				return;
			}
			$('#doc-thread-content').feed('switch', {
				'action': action
			});
			if (action == 'claim') {
				var highlight_id = $('#doc-thread-content').feed('get_id');
				$('#doc-thread-content .claim.form textarea').val(_this.currHighlights[highlight_id].text).focus();
			}
		});

		// dynamic listeners
		this.$category_element.on('click', '.open-doc', function(e) {
			_this.doc_id = this.getAttribute('data-id');
			updateDocument();
		});
		this.$content_element.on('click', '.jump-to-section', function(e) {
			var section_id = this.getAttribute('data-id');
			_jumpToSection(section_id);
		}).on('click', '.tk', function(e) {
			e.stopPropagation();
			if ($(this).hasClass('p') || $(this).hasClass('q') || $(this).hasClass('c')) {
				var highlight_ids = this.getAttribute('data-hl-id').split(' ');
				for (var i = 0; i < highlight_ids.length; i++) {
					$('#doc-thread-content').feed('update', {
						type: 'highlight',
						id: highlight_ids[i]
					}, function() {
						$('#doc-thread-popup').css('left', e.pageX).css('top', e.pageY);
					});
				}
			}
		}).on('mousedown', '.section-content', function(e) {
			if ($(e.target).is('u.tk')) {
				var $target = $(this);
				$(window).mousemove(function(e2) {
					if ($(e2.target).hasClass('tk')) {
						_this.isDragging = true;
						_this.newHighlight.end = e2.target.getAttribute('data-id');
						var min = Math.min(_this.newHighlight.start, _this.newHighlight.end);
						var max = Math.max(_this.newHighlight.start, _this.newHighlight.end);
						$target.find('.tk').removeClass('highlighted');
						for (var i = min; i <= max; i++) {
							$target.find('.tk[data-id="' + i + '"]').addClass('highlighted');
						}
						_this.newHighlight.contextId = $target.attr('data-id');
					} else {
						$target.find('.tk').removeClass('highlighted');
					}
				});
				_this.newHighlight.start = e.target.getAttribute('data-id');
				_this.newHighlight.end = e.target.getAttribute('data-id');
			}
		}).on('mouseup', '.section-content', function(e) {
			$(window).off('mousemove');
			var wasDragging = _this.isDragging;
			_this.isDragging = false;
			if (wasDragging) {
				var min = Math.min(_this.newHighlight.start, _this.newHighlight.end);
				var max = Math.max(_this.newHighlight.start, _this.newHighlight.end);
				_this.newHighlight.start = min;
				_this.newHighlight.end = max;
				if ($(this).find('.tk.highlighted').length) {
					$('#doc-claim-form').hide();
					$('#doc-comment-form').parent().hide();
					$('#doc-highlight-toolbar').css('left', e.pageX).css('top', e.pageY);
				}
			} else { // just clicking
				$('#doc-highlight-toolbar').removeAttr('style');
				$(this).find('.tk').removeClass('highlighted');
			}
		});
	};
	module.updateCategories = function() {
		var _this = this;
		$.ajax({
			url: '/api_doc/',
			type: 'post',
			data: {
				'action': 'get-categories'
			},
			success: function(xhr) {
				_this.$category_element.html(xhr.html);
				_this.$category_element.find('.ui.accordion').accordion();
				_this.$category_element.find('abbr').popup();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};
	function updateDocument() {
		var _this = this;
		$.ajax({
			url: '/api_doc/',
			type: 'post',
			data: {
				'action': 'get-document',
				'doc_id': _this.doc_id
			},
			success: function(xhr) {
				// collapse document category accordion
				_this.$category_element.find('.ui.accordion').accordion('close', 0);
				_this.$content_element.html(xhr.html);
				_this.$content_element.find('.ui.sticky').sticky({
					context: '#document-pane',
					offset: 70,
				});
				_this.$content_element.find('abbr').popup();
				reloadHighlights();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}
	function reloadHighlights() {
		var _this = this;
		$.ajax({
			url: '/api_highlight/',
			type: 'post',
			data: {
				action: 'load-doc',
				doc_id: _this.doc_id,
			},
			success: function(xhr) {
				for (var i = 0; i < xhr.highlights.length; i++) {
					highlight(xhr.highlights[i]);
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	function highlight(highlight) {
		var _this = this;
		var $context = _this.$content_element.find('.section-content[data-id="' + highlight.context_id + '"]');
		var className;
		if (highlight.type == 'comment') {
			className = 'p'; // for 'post'
		} else if (highlight.type == 'question') {
			className = 'q'; // for 'question'
		} else if (highlight.type == 'claim') {
			className = 'c'; // for 'claim'
		}
		var text = [];
		for (var i = highlight.start; i <= highlight.end; i++) {
			var $token = $context.find('.tk[data-id="' + i + '"]');
			text.push($token.text());
			if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
				$token.addClass(className).attr('data-hl-id', highlight.id);
			} else {
				var curr_id = $token.attr('data-hl-id'); // append highlight for this word
				$token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id);
			}
		}
		_this.currHighlights[highlight.id] = highlight;
		_this.currHighlights[highlight.id].text = text.join('');
	}

	function _jumpToSection(section_id) {
		var _this = this;
		$('body').animate({
			scrollTop: _this.$content_element.find('.section-header[data-id="' + section_id + '"]').offset().top - 50
		}, 100);
	}
	return module;
});
