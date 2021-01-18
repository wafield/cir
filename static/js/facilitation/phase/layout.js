define([
	'jquery',
	'utils',
	'semantic-ui'
], function(
	$,
	Utils
) {
	var module = {};

	module.container = $("#feng-phase-container");

	module.init = function() {

		$('.ui.checkbox').checkbox();

		module.container.on("click", ".feng-message-add", function() {
			$("#feng-message-modal .header").text("Add new message");
			$("#feng-message-modal .header").attr("message-id", "");
			$("#feng-message-modal .message-content").val("");
			$("#feng-message-modal .message-show").checkbox("uncheck");
			$("#feng-message-modal").modal("show");
		}).on("click", ".feng-message-edit", function() {
			var message_id = $(this).attr("message-id");
			var message_content = $(this).closest("tr").find(".message-content").text().trim();
			var message_shown = $(this).closest("tr").find(".message-shown").text().trim();
			$("#feng-message-modal .header").text("Edit message");
			$("#feng-message-modal .header").attr("message-id", message_id);
			$("#feng-message-modal .message-content").val(message_content);
			if (message_shown == "True") {
				$("#feng-message-modal .message-show").checkbox("check");
			} else {
				$("#feng-message-modal .message-show").checkbox("uncheck");
			}
			$("#feng-message-modal").modal("show");
		}).on("click", ".feng-message-remove", function() {
			$.ajax({
				url: '/api_dashboard/phase/',
				type: 'post',
				data: {
					action: "remove-message",
					message_id: $(this).attr("message-id"),
				},
				success: function(xhr) {
					module.container.html(xhr.html);
				}
			})
		});
		$("body").on("click", ".feng-message-save", function() {
			$.ajax({
				url: '/api_dashboard/phase/',
				type: 'post',
				data: {
					action: "save-message",
					message_id: $("#feng-message-modal .header").attr("message-id"),
					message_content: $("#feng-message-modal .message-content").val(),
					is_show: $(".message-show").hasClass("checked")? "true":"false",
					phase_name: $(".phase-card").attr("data-content")
				},
				success: function(xhr) {
					$("#feng-message-modal").modal("hide");
					module.container.html(xhr.html);
				}
			})
		});

		$("#phase-steps").on("click", ".step", function() {
			$("#phase-steps .step").removeClass("active");
			$(this).addClass("active");
			var phase_name = $(this).attr("data-content");
			$.ajax({
				url: '/api_dashboard/phase/',
				type: 'post',
				data: {
					'action': 'get-phase',
					'phase_name': phase_name
				},
				success: function(xhr) {
					module.container.html(xhr.html);
				}
			});
		})

		module.container.on("click", ".launch-phase", function() {
			var phase_name = $(".phase-card").attr("data-content");
			$.ajax({
				url: '/api_dashboard/phase/',
				type: 'post',
				data: {
					'action': 'change-phase',
					'phase': phase_name
				},
				success: function(xhr) {
					Utils.notify('success', 'Phase changed.');
					location.reload();
				}
			})
		})

		$("#phase-steps .active.step").click();
	};

	module.init();

	return module;
});

