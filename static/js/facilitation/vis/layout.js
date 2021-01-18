define([
	'jquery',
	'facilitation/vis/pie',
	'facilitation/vis/dot',
	'semantic-ui',
	'realtime/socket'
], function(
	$,
	Pie,
	Dot
) {
	var module = {};
	module.initLayout = function() {
		Pie.init();
		Dot.init();
	};

	sessionStorage.setItem('role', 'facilitator');
	module.initLayout();
	return module;
});
