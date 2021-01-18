define([
	'jquery',

], function(
	$

) {

	var module = {
		updateMessageList: function() {
			$('#message-list').html('<div class="ui loading segment"></div>');
			$.ajax({
				url: '/dashboard/msg/',
				type: 'post',
				data: {
					'action': 'retrieve-msg',
				},
				success: function(xhr) {
					$('#important-filter').checkbox('uncheck');
					$('#completed-filter').checkbox('uncheck');
					$('#message-list').html(xhr.html);
				},
				error: function() {

				}
			});
		}
	};

	initMenu();

	$('#message-list').on('click', '.expand-msg', function() {
		var $item = $(this).parents('.message.item');
		var msg_id = $item.attr('data-id');
		var source_id = $(this).attr('data-source-id');
		$.ajax({
			url: '/dashboard/msg/',
			type: 'post',
			data: {
				'action': 'mark-read',
				'msg_id': msg_id,
			},
			success: function(xhr) {
				$item.addClass('read');
			},
		});
		$('#message-details').remove();
		$('<div id="message-details" class="ui segment"></div>').appendTo('body');
		if ($item.hasClass('facilitation') || $item.hasClass('facilitation-action')) {
			var html = $item.find('.msg-content').html();
			html += ' <a class="mark-done" data-msg-id=' + msg_id + '">Mark as completed</a>';
			$('#message-details').html(html).appendTo($item).show();
		} else if ($item.hasClass('post') || $item.hasClass('post-action')
			|| $item.hasClass('reply') || $item.hasClass('reply-action')
			|| $item.hasClass('version') || $item.hasClass('version-action')) {

			$('#message-details').feed('init');
			$('#message-details').feed('update', { // async
				'type': 'post',
				'id': source_id
			}, function() {
				$('#message-details .event[data-id="' + source_id + '"]').addClass('highlight-found');
			});
			$('#message-details').appendTo($item).show();
		}
	}).on('click', '.mark-done', function() {
		var $item = $(this).parents('.message.item');
		var msg_id = $item.attr('data-id');
		$.ajax({
			url: '/dashboard/msg/',
			type: 'post',
			data: {
				'action': 'mark-done',
				'msg_id': msg_id,
			},
			success: function(xhr) {
				$item.addClass('done');
			},
		});
	});

	function initMenu() {
		$('#important-filter').checkbox({
			onChecked: function() {
				$('#message-list').addClass('important-only');
			},
			onUnchecked: function() {
				$('#message-list').removeClass('important-only');
			},
		});
		$('#completed-filter').checkbox({
			onChecked: function() {
				$('#message-list').addClass('show-done');
			},
			onUnchecked: function() {
				$('#message-list').removeClass('show-done');
			},
		});
	}
	return module;
});

