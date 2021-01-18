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




function truncate(str, maxLength, suffix) {
	if(str.length > maxLength) {
		str = str.substring(0, maxLength + 1); 
		str = str.substring(0, Math.min(str.length, str.lastIndexOf(" ")));
		str = str + suffix;
	}
	return str;
}

var margin = {top: 20, right: 200, bottom: 0, left: 20},
	width = 300,
	height = 650;

var start_year = 2004,
	end_year = 2013;

var c = d3.scale.category20c();

var x = d3.scale.linear()
	.range([0, width]);

var xAxis = d3.svg.axis()
	.scale(x)
	.orient("top");

var formatYears = d3.format("0000");
xAxis.tickFormat(formatYears);

var svg = d3.select("body").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.style("margin-left", margin.left + "px")
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var data = [{"articles": [[2010, 6], [2011, 10], [2012, 11], [2013, 23], [2006, 1]], "total": 51, "name": "The Journal of neuroscience : the official journal of the Society for Neuroscience"}, {"articles": [[2008, 1], [2010, 3], [2011, 4], [2012, 17], [2013, 10]], "total": 35, "name": "Nature neuroscience"}, {"articles": [[2009, 1], [2010, 2], [2011, 8], [2012, 13], [2013, 11]], "total": 35, "name": "PloS one"}, {"articles": [[2007, 1], [2009, 3], [2010, 5], [2011, 7], [2012, 9], [2013, 9]], "total": 34, "name": "Nature"}, {"articles": [[2009, 2], [2010, 3], [2011, 4], [2012, 8], [2013, 9]], "total": 26, "name": "Neuron"}, {"articles": [[2009, 2], [2010, 2], [2011, 3], [2012, 9], [2013, 7]], "total": 23, "name": "Proceedings of the National Academy of Sciences of the United States of America"}, {"articles": [[2008, 1], [2010, 5], [2011, 10], [2012, 3], [2013, 3]], "total": 22, "name": "Nature methods"}, {"articles": [[2007, 1], [2009, 1], [2010, 3], [2011, 4], [2012, 4], [2013, 8]], "total": 21, "name": "Current opinion in neurobiology"}, {"articles": [[2006, 1], [2009, 3], [2010, 4], [2011, 1], [2012, 2], [2013, 7]], "total": 18, "name": "Science (New York, N.Y.)"}, {"articles": [[2010, 2], [2011, 4], [2012, 6], [2013, 4], [2007, 1]], "total": 17, "name": "Current biology : CB"}, {"articles": [[2010, 1], [2011, 3], [2012, 8], [2013, 3]], "total": 15, "name": "Journal of neurophysiology"}, {"articles": [[2009, 1], [2012, 4], [2013, 9]], "total": 14, "name": "Frontiers in neural circuits"}, {"articles": [[2012, 1], [2013, 13]], "total": 14, "name": "Brain research"}, {"articles": [[2009, 2], [2010, 1], [2011, 2], [2013, 8]], "total": 13, "name": "Frontiers in molecular neuroscience"}, {"articles": [[2008, 1], [2010, 2], [2011, 3], [2012, 3], [2013, 4]], "total": 13, "name": "The Journal of biological chemistry"}, {"articles": [[2009, 1], [2010, 1], [2011, 8], [2012, 2]], "total": 12, "name": "Conference proceedings : ... Annual International Conference of the IEEE Engineering in Medicine and Biology Society. IEEE Engineering in Medicine and Biology Society. Conference"}, {"articles": [[2012, 12]], "total": 12, "name": "Progress in brain research"}, {"articles": [[2009, 1], [2010, 1], [2012, 4], [2013, 6]], "total": 12, "name": "Journal of neuroscience methods"}, {"articles": [[2011, 3], [2012, 5], [2013, 3]], "total": 11, "name": "Journal of visualized experiments : JoVE"}, {"articles": [[2011, 1], [2012, 2], [2013, 8]], "total": 11, "name": "Neuroscience research"}]

	x.domain([start_year, end_year]);
	var xScale = d3.scale.linear()
		.domain([start_year, end_year])
		.range([0, width]);

	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + 0 + ")")
		.call(xAxis);

	for (var j = 0; j < data.length; j++) {
		var g = svg.append("g").attr("class","journal");

		var circles = g.selectAll("circle")
			.data(data[j]['articles'])
			.enter()
			.append("circle");

		var text = g.selectAll("text")
			.data(data[j]['articles'])
			.enter()
			.append("text");

		var rScale = d3.scale.linear()
			.domain([0, d3.max(data[j]['articles'], function(d) { return d[1]; })])
			.range([2, 9]);

		circles
			.attr("cx", function(d, i) { return xScale(d[0]); })
			.attr("cy", j*20+20)
			.attr("r", function(d) { return rScale(d[1]); })
			.style("fill", function(d) { return c(j); });

		text
			.attr("y", j*20+25)
			.attr("x",function(d, i) { return xScale(d[0])-5; })
			.attr("class","value")
			.text(function(d){ return d[1]; })
			.style("fill", function(d) { return c(j); })
			.style("display","none");

		g.append("text")
			.attr("y", j*20+25)
			.attr("x",width+20)
			.attr("class","label")
			.text(truncate(data[j]['name'],30,"..."))
			.style("fill", function(d) { return c(j); })
			.on("mouseover", mouseover)
			.on("mouseout", mouseout);
	};

	function mouseover(p) {
		var g = d3.select(this).node().parentNode;
		d3.select(g).selectAll("circle").style("display","none");
		d3.select(g).selectAll("text.value").style("display","block");
	}

	function mouseout(p) {
		var g = d3.select(this).node().parentNode;
		d3.select(g).selectAll("circle").style("display","block");
		d3.select(g).selectAll("text.value").style("display","none");
	}




		// $("#vis-container").css("height", 1000);

		var width = 960,
		    height = 450,
			radius = Math.min(width, height) / 2;

		var svg = d3.select("#pie-container").append("svg")
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

		function randomData (){
			var labels = color.domain();
			return labels.map(function(label){
				return { label: label, value: Math.random() }
			});
		}


		$.ajax({
			url: '/sankey/get_highlights2/',
			type: 'post',
			data: {
			},
			success: function(xhr) {


				module.Highlight.data = xhr.highlights;
				change("author_name");
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});

		

		// d3.select(".randomize")
		// 	.on("click", function(){
		// 		change("theme_name");
		// 	});

		$('.pie-object').checkbox({
			onChecked: function() {
				var pie_object = $(this).attr("value");
				change(pie_object);
			}
		});

		function change(dimension) {

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