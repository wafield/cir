define([
	'jquery',
	'utils',
	'semantic-ui',
	'd3',
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
				drawPie("#pie1", "author_name");
				drawPie("#pie2", "theme_name");
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});

		function drawPie(container, dimension) {

			var width = 960,
			    height = 450,
				radius = Math.min(width, height) / 2;

			var svg = d3.select(container).append("svg")
					.attr("width", width)
					.attr("height", height)
				.append("g")
					.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

			svg.append("g")
				.attr("class", "slices");
			svg.append("g")
				.attr("class", "labels");
			svg.append("g")
				.attr("class", "lines");

			var pie = d3.layout.pie()
				.sort(null)
				.value(function(d) {
					return d.value;
				});

			var arc = d3.svg.arc()
				.outerRadius(radius * 0.8)
				.innerRadius(radius * 0.4);

			var outerArc = d3.svg.arc()
				.innerRadius(radius * 0.9)
				.outerRadius(radius * 0.9);

			var key = function(d){ return d.data.label; };

			var color = d3.scale.ordinal()
				.domain(["Lorem ipsum", "dolor sit", "amet", "consectetur", "adipisicing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt"])
				.range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);


			var cf_highlight = crossfilter(module.Highlight.data);
			var cf_highlight_dm;
			if (dimension == "author_name") {
				cf_highlight_dm = cf_highlight.dimension(function(p) { return p.author_name; });
			} else if (dimension == "theme_name") {
				cf_highlight_dm = cf_highlight.dimension(function(p) { return p.theme_name; });
			}
			data = []
			cf_highlight_dm.group().all().forEach(function(p, i) {
				item = {};
				item.label = p.key;
				item.value = p.value;
				data.push(item);
			});


			/* ------- PIE SLICES -------*/
			var slice = svg.select(".slices").selectAll("path.slice")
				.data(pie(data), key);

			slice.enter()
				.insert("path")
				.style("fill", function(d) { return color(d.data.label); })
				.attr("class", "slice");

			slice		
				.transition().duration(1000)
				.attrTween("d", function(d) {
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						return arc(interpolate(t));
					};
				})

			slice.exit()
				.remove();

			/* ------- TEXT LABELS -------*/

			var text = svg.select(".labels").selectAll("text")
				.data(pie(data), key);

			text.enter()
				.append("text")
				.attr("dy", ".35em")
				.text(function(d) {
					return d.data.label;
				});
			
			function midAngle(d){
				return d.startAngle + (d.endAngle - d.startAngle)/2;
			}

			text.transition().duration(1000)
				.attrTween("transform", function(d) {
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						var d2 = interpolate(t);
						var pos = outerArc.centroid(d2);
						pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
						return "translate("+ pos +")";
					};
				})
				.styleTween("text-anchor", function(d){
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						var d2 = interpolate(t);
						return midAngle(d2) < Math.PI ? "start":"end";
					};
				});

			text.exit()
				.remove();

			/* ------- SLICE TO TEXT POLYLINES -------*/

			var polyline = svg.select(".lines").selectAll("polyline")
				.data(pie(data), key);
			
			polyline.enter()
				.append("polyline");

			polyline.transition().duration(1000)
				.attrTween("points", function(d){
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						var d2 = interpolate(t);
						var pos = outerArc.centroid(d2);
						pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
						return [arc.centroid(d2), outerArc.centroid(d2), pos];
					};			
				});
			
			polyline.exit()
				.remove();
		};

		module.initEvents();

	};

	module.initEvents = function() {

	};

	return module;
});