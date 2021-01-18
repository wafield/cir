define([
	'jquery',
	'utils',
	'd3',
	'eventDrops',
	'semantic-ui',
	'crossfilter'
], function(
	$,
	Utils
) {
	var module = {};

	module.Highlight = {};
	module.Highlight.data = {};

	module.init = function() {

		$.ajax({
			url: '/api_dashboard/get_highlights/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				module.Highlight.data = xhr.highlights;

				var startTime = Date.now();
				var month = 30 * 24 * 60 * 60 * 1000;
				var endTime = startTime - 1200 * month;

				var map = {}
				for (var i = 0; i < module.Highlight.data.length; i++) {
					var highlight = module.Highlight.data[i];
					// if (highlight.author_name.includes("Feng Sun")) continue;
					if (!(highlight.author_name in map)) {
						map[highlight.author_name] = []
					}
					//date format: 1900 01 01 59 59
					var format = d3.time.format("%Y %m %d %H %M %S");
					var time = format.parse(highlight.date); // returns a Date
					if (time <= startTime) startTime = time;
					if (time >= endTime) endTime = time;
					map[highlight.author_name].push(time);
				}

				var data = [];
				for (var name in map) {
				    var event = {
				        name: name,
				        dates: []
				    };
				    var dates = map[name]
				    for (var i = 0; i < dates.length; i++) {
				    	event.dates.push(dates[i]);
				    }
				    data.push(event);
				}

				var color = d3.scale.category20();

				// create chart function
				var eventDropsChart = d3.chart.eventDrops()
				    .eventLineColor(function (datum, index) {
				        return color(index);
				    })
				    .start(new Date(startTime))
				    .end(new Date(endTime))
				    .width(960);



				// bind data with DOM
				var element = d3.select("#chart_placeholder").datum(data);

				// draw the chart
				eventDropsChart(element);

				d3.select(".event-drops-chart").style("width", 960);

			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});

	};

	return module;
});