define([
	'jquery',
	'utils'

], function(
	$,
	Utils
) {
	var module = {};
	module.init = function() {

		$('#send-msg-form .button').click(function() {
			var content = $('#send-msg-form textarea').val();
		});
		// load user list
		$.ajax({
			url: '/dashboard/user_mgmt/',
			type: 'post',
			data: {
				'action': 'get_user_list_msg'
			},
			success: function(xhr) {
				$('#panelist-list').html(xhr.html);
			}
		});
		$('#send-msg-form .button').click(function() {
			var content = $('#send-msg-form textarea').val();
			$('#send-msg-form button').addClass('loading');
			$.ajax({
				url: '/dashboard/msg/',
				type: 'post',
				data: {
					'action': 'send-msg',
					'content': content,
				},
				success: function(xhr) {
					$('#send-msg-form textarea').val('');
					Utils.notify('success', 'Message sent.');
					refreshMsgHistory();
					$('#send-msg-form button').removeClass('loading');
					// TODO realtime notify the panel
				},
				error: function() {
					$('#send-msg-form button').removeClass('loading');
				}
			});
		});

		refreshMsgHistory();
	};

	function refreshMsgHistory() {
		// load previous messages
		$('#previous-messages').addClass('loading');
		$.ajax({
			url: '/dashboard/msg/',
			type: 'post',
			data: {
				'action': 'get-history',
			},
			success: function(xhr) {
				$('#previous-messages').html(xhr.html);
				$('#previous-messages').removeClass('loading');
			},
			error: function() {
				$('#previous-messages').removeClass('loading');
			}
		});
	}
	return module;
});
