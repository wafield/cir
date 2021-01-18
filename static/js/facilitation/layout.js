define([
	'jquery',
	'utils',
	'facilitation/theme',
	'facilitation/phase',
	'facilitation/document'
], function(
	$,
	Utils,
	Theme,
	Phase,
	Document
) {
	var module = {};
	module.initLayout = function() {

		Theme.init();
		Phase.init();
		Document.init();


		$.ajax({
			url: '/api_dashboard/theme/',
			type: 'post',
			data: {
				'action': 'get-theme',
			},
			success: function(xhr) {
				$("#feng-container .view").hide();
				$("#feng-theme-container").html(xhr.html);
			}
		});

		$.ajax({
			url: '/api_dashboard/phase/',
			type: 'post',
			data: {
				'action': 'get-phase',
			},
			success: function(xhr) {
				$("#feng-phase-container").html(xhr.html);
			}
		});

		$.ajax({
			url: '/api_dashboard/document/',
			type: 'post',
			data: {
				'action': 'get-categories',
			},
			success: function(xhr) {
				$("#feng-document-container").html(xhr.html);
			}
		})

		$("#feng-button-group").on("click", ".feng-button", function() {
			$("#feng-button-group .feng-button").removeClass("active");
			$(this).addClass("active");
			var selection = $(this).attr("data-content");
			$("#feng-container .view").hide();
			switch(selection) {
			    case "theme":
					$("#feng-theme-container").show();
			        break;

			    case "phase":
					$("#feng-phase-container").show();
			        break;

			    case "document":
					$("#feng-document-container").show();
			        break;

			    default:
			}
		});
	};

	sessionStorage.setItem('role', 'facilitator');
	module.initLayout();
	return module;
});
