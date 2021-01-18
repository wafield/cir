define([
	'jquery',
	'utils'
], function(
	$,
	Utils
) {
	var module = {};
	module.init = function() {
		$("#feng-container").on('click', ".phase.update.button", function() {
			var selected = $("#feng-container").find('.phase.dropdown').val();
			$.ajax({
				url: '/api_dashboard/phase/',
				type: 'post',
				data: {
					'action': 'change-phase',
					'phase': selected
				},
				success: function(xhr) {
					Utils.notify('success', 'Phase changed.');
					require('realtime/socket').updatePhase({
						phase: module.$el.find('.phase.dropdown option:selected').val(),
						forum_id: $('body').attr('forum-id'),
						phaseFullname: module.$el.find('.phase.dropdown option:selected').text()
					});
				}
			})
		});
	};
	return module;
});

