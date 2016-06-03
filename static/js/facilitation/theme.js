define([
	'jquery',
	'utils',
	'semantic-ui'
], function(
	$,
	Utils
) {
	var module = {};
	module.init = function() {
		$("#feng-container").on("click", ".feng-theme-add", function() {
			$("#feng-theme-modal .header").text("Add new theme");
			$("#feng-theme-modal .header").attr("theme-id", "");
			$("#feng-theme-modal .theme-name").val("");
			$("#feng-theme-modal .theme-description").val("");
			$("#feng-theme-modal").modal("show");
		}).on("click", ".feng-theme-edit", function() {
			var theme_id = $(this).attr("theme-id");
			var theme_name = $(this).closest("tr").find(".theme-name").text().trim();
			var theme_description = $(this).closest("tr").find(".theme-description").text().trim();
			$("#feng-theme-modal .header").text("Edit theme");
			$("#feng-theme-modal .header").attr("theme-id", theme_id);
			$("#feng-theme-modal .theme-name").val(theme_name);
			$("#feng-theme-modal .theme-description").val(theme_description);
			$("#feng-theme-modal").modal("show");
		}).on("click", ".feng-theme-remove", function() {
			$.ajax({
				url: '/dashboard/theme/',
				type: 'post',
				data: {
					action: "remove-theme",
					theme_id: $(this).attr("theme-id"),
				},
				success: function(xhr) {
					$("#feng-container").html(xhr.html);
				}
			})
		});
		$("body").on("click", ".feng-theme-save", function() {
			$.ajax({
				url: '/dashboard/theme/',
				type: 'post',
				data: {
					action: "save-theme",
					theme_id: $("#feng-theme-modal .header").attr("theme-id"),
					theme_name: $("#feng-theme-modal .theme-name").val(),
					theme_description: $("#feng-theme-modal .theme-description").val()
				},
				success: function(xhr) {
					$("#feng-theme-modal").modal("hide");
					$("#feng-container").html(xhr.html);
				}
			})
		});
	}
	return module;
});