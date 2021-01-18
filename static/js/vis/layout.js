define([
  'd3',
  'sankey',
  'jquery',
  'semantic-ui',
  'utils',
  'workbench2'
], function(
  d3,
  sankey_module,
  $,
  semantic,
  Utils,
  workbench_module
) {

  var module = {};

  module.init = function() {
    $($("title")[0]).text("NuggetLens");
    timerange_num_interval = 100;
    module.focus_node = "";
    module.threshold_default = 50;

    module["focusNode"];
    module["nodeStyle"] = {};
    module.time_lower_bound = new Date(2010, 1, 1, 0, 0, 0);
    module.time_upper_bound = new Date(2020, 12, 31, 23, 59, 59);
    
    module.barchart_ajax;
    module.nodeMap = {};
    module.time_bound_list = [];

    module["relation"] = "dpt";

    console.log("vis layout");
    module.get_sankey();
    module.get_documap();
    module.get_barchart();

    module.init_events();
  }

  // sankey
  module.get_sankey = function() {   
    
    if (module.sankey_ajax) module.sankey_ajax.abort();

    var loader_str = '<div class="ui segment" style="height:200px;">' +
      '<div class="ui inverted dimmer active">' +
      '<div class="ui large text loader">Loading</div>' +
      '</div><p></p><p></p><p></p></div>';
    $("#sankey-container").html(loader_str);

    filter = get_filter();
    var sankey_ajax = $.ajax({
      url: '/sankey/get_graph/',
      type: 'post',
      data: {
        "time_lower_bound": filter.time_lower_bound,
        "time_upper_bound": filter.time_upper_bound,
        "doc_ids": filter.doc_ids,
        "author_ids": filter.author_ids,
        "theme_ids": filter.theme_ids,
        "relation": module["relation"]
      },
      success: function(xhr) {
        $("#sankey-container").html("");
        init_sankey(xhr);
        // $("svg").attr("class", "ui segment");
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  module.get_documap = function() {

    var selected = $(".node.active").attr("data-id");
    var filter = get_filter();
    $.ajax({
      url: '/sankey/get_doc_coverage/',
      data: {
        "time_lower_bound": filter.time_lower_bound,
        "time_upper_bound": filter.time_upper_bound,
        "doc_ids": filter.doc_ids,
        "author_ids": filter.author_ids,
        "theme_ids": filter.theme_ids,
        "selected": selected 
      },
      type: 'post',
      success: function(xhr) {

        $("#documap-container").empty();
        for (var i = 0; i < (xhr.docs).length; i++) {
          var doc_id = xhr.docs[i].id;
          var doc_name = xhr.docs[i].name;
          var html = '<div class="documap-item" doc-id="' + doc_id + '" style="position:relative; width:100%; height:70px;">'
            + '<div style="font-size:10px;">' + doc_name + '</div>'
            + '</div>';
          $("#documap-container").append(html);
        }

        // $(".documap-item .chart").remove();
        // $(".documap-item .label").remove();
        // $('#documap-container').empty();
        var container_width = $("#sankey-container").width();
        var longest_doc_length = 1;
        var cell_width = 1;
        var cell_height = 10;
        var threshold = module.threshold_default;

        for (var i = 0; i < Object.keys(xhr.nuggetmaps).length; i++) {
          var doc_id = Object.keys(xhr.nuggetmaps)[i];
          longest_doc_length = Math.max(longest_doc_length, xhr.nuggetmaps[doc_id].distribution.length);
          threshold = Math.max(threshold, Math.max.apply(null, xhr.viewlogs[doc_id]));
        }
        cell_width = Math.floor(container_width / longest_doc_length);        

        for (var i = 0; i < Object.keys(xhr.nuggetmaps).length; i++) {
          var doc_id = Object.keys(xhr.nuggetmaps)[i];
          var distribution = xhr.nuggetmaps[doc_id].distribution;
          var doc_name = xhr.nuggetmaps[doc_id].doc_name;

          var $cur_documap_item_container = $(".documap-item[doc-id=doc-" + doc_id + "]");

          var documap_item = d3.selectAll(".documap-item")
            .filter(function(){ 
              return $(this).attr("doc-id").split("-")[1] === doc_id; 
            }) 
            .append("svg")
            .attr("class", "chart")
            .attr("width", cell_width * distribution.length)
            .attr("height", cell_height)
            .attr("display", "block")
            .style("border-top", "1px solid")
            .style("border-left", "1px solid")
            .style("border-right", "1px solid");

          var color1 = d3.scale.linear()
                    .domain([0, 1])
                    .range(["Azure", "#C0E7F3"]);
          documap_item.selectAll("rect")
            .data(distribution)
            .enter()
              .append("rect")
              .attr("x", function(d, j) { return j * cell_width; })
              .attr("y", function(d, j) { return 0; })
              .attr("width", cell_width)
              .attr("height", cell_height)
              .attr("fill", color1)
              .attr("data-id", function(d) { return d; });

          var viewlog_item = d3.selectAll(".documap-item")
            .filter(function(){ 
              return $(this).attr("doc-id").split("-")[1] === doc_id; 
            }) 
            .append("svg")
            .attr("class", "chart")
            .attr("width", cell_width * distribution.length)
            .attr("height", cell_height)
            .attr("display", "block")
            .style("border-bottom", "1px solid")
            .style("border-left", "1px solid")
            .style("border-right", "1px solid");

          var color2 = d3.scale.linear()
                    .domain([0, threshold ])
                    .range(["white", "red"]);
          viewlog_item.selectAll("rect")
            .data(xhr.viewlogs[doc_id])
            .enter()
              .append("rect")
              .attr("x", function(d, j) { return j * cell_width; })
              .attr("y", function(d, j) { return 0; })
              .attr("width", cell_width)
              .attr("height", cell_height)
              .attr("fill", color2)
              .attr("data-id", function(d) { return d; });
        }

        // $(".latest-activity").attr("class", "");
        // $(".latest-activity-arrow").remove();

        // $(".sankey-document-nuggetmap[doc-id=59]").find("rect")[104]
        for (var i = 0; i < Object.keys(xhr.author_activity_map).length; i++) {
          var author_id = Object.keys(xhr.author_activity_map)[i],
              data = xhr.author_activity_map[author_id],
              doc_id = data.doc_id,
              work_on = data.work_on,
              author_name = data.author_name,
              time = data.time;
          $($(".documap-item[doc-id=doc-" + doc_id + "]").find("rect")[work_on])
            .attr("class", "latest-activity")
            .attr("author-id",author_id)
            .attr("author-name",author_name)
            .attr("time",time);
        }

        // add author lastest activity
        var your_id = $("#header-user-name").attr("data-id");
        $(".latest-activity").each(function(){
            var author_id = $(this).attr("author-id");
            var author_name = $(this).attr("author-name");
            var time = $(this).attr("time");
            $documap_item = $(this).closest(".documap-item");
            $documap_item.append('<div class="ui pointing basic label" author-id=' + author_id + '><i class="user icon"></i>' + author_name + ' | ' + time + '</div>');
            $label = $(this).closest(".documap-item").find(".label[author-id=" + author_id + "]");
            $label.css({"position": "absolute", "left":Number($(this).attr("x")) - ($label.width() / 2), "top":+30});
        })
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  module.init_events = function() {

    $("body").on("click", ".select-element", function(e){
      if ($(this).hasClass("active")) {
        $(this).removeClass("green").removeClass("active");
      } else {
        $(this).addClass("green").addClass("active");
      }
      module.get_sankey();
      module.get_documap();
      module.get_barchart();
    })

  }

  // enter bar chart
  module.get_barchart = function () {
    $.ajax({
      url: '/sankey/get_highlights2/',
      type: 'post',
      data: {
      },
      success: function(xhr) {

        filter = get_filter();
        var timeFormat = d3.time.format("%Y %m %d %H %M");
        xhr.highlights.forEach(function(p) {
          p.date = timeFormat.parse(p.date);
        });
        var cf_highlight = crossfilter(xhr.highlights);

        var cf_highlight_by_theme_id = cf_highlight.dimension(function(p) { return p.theme_id; });
        var theme_ids = filter.theme_ids.split(" ");
        cf_highlight_by_theme_id.filter(function(d){
          return theme_ids.indexOf(d.toString()) > -1;
        });

        var cf_highlight_by_author_id = cf_highlight.dimension(function(p) { return p.author_id; });
        var author_ids = filter.author_ids.split(" ");
        cf_highlight_by_author_id.filter(function(d){
          return author_ids.indexOf(d.toString()) > -1;
        });

        var cf_highlight_by_doc_id = cf_highlight.dimension(function(p) { return p.doc_id; });
        var doc_ids = filter.doc_ids.split(" ");
        cf_highlight_by_doc_id.filter(function(d){
          return doc_ids.indexOf(d.toString()) > -1;
        });

        var cf_highlight_by_date = cf_highlight.dimension(function(p) { return p.date; });
        data = []
        cf_highlight_by_date.group().all().forEach(function(p, i) {
          item = {};
          item.date = p.key;
          item.count = p.value;
          data.push(item);
        });

        // sizing information, including margins so there is space for labels, etc
        var barchart_size = {width: $("#sankey-container").width(), height:180};
        var margin =  { top: 70, right: 30, bottom: 20, left: 30 },
            width = barchart_size.width - margin.left - margin.right,
            height = barchart_size.height - margin.top - margin.bottom,
            marginOverview = { top: 0, right: margin.right, bottom: 150,  left: margin.left },
            heightOverview = barchart_size.height - marginOverview.top - marginOverview.bottom;

        // set up a date parsing function for future use
        var parseDate = d3.time.format("%Y %m %d %H %M").parse;

        // some colours to use for the bars
        var colour = d3.scale.ordinal()
                            .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

        // mathematical scales for the x and y axes
        var x = d3.time.scale()
                        .range([0, width]);
        var y = d3.scale.linear()
                        .range([height, 0]);
        var xOverview = d3.time.scale()
                        .range([0, width]);
        var yOverview = d3.scale.linear()
                        .range([heightOverview, 0]);

        // rendering for the x and y axes
        var xAxis = d3.svg.axis()
                        .scale(x)
                        .orient("bottom");
        var yAxis = d3.svg.axis()
                        .scale(y)
                        .orient("left")
                        .tickFormat(d3.format("d"));
        var xAxisOverview = d3.svg.axis()
                        .scale(xOverview)
                        .orient("bottom");

        // something for us to render the chart into
        $("#brush").html("");
        var svg = d3.select("#brush")
                        .append("svg") // the overall space
                            .attr("width", width + margin.left + margin.right)
                            .attr("height", height + margin.top + margin.bottom);
        var main = svg.append("g")
                        .attr("class", "main")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        var overview = svg.append("g")
                            .attr("class", "overview")
                            .attr("transform", "translate(" + marginOverview.left + "," + marginOverview.top + ")");

        // brush tool to let us zoom and pan using the overview chart
        var brush = d3.svg.brush()
                            .x(xOverview)
                            .on("brush", brushed);

        // setup complete, let's get some data!
        // by habit, cleaning/parsing the data and return a new object to ensure/clarify data object structure
        data.forEach(function(d) {
            d.date = d.date;
            var y0 = 0;
            d.counts = ["count"].map(function(name) {
                return { name: name,
                         y0: y0,
                         // add this count on to the previous "end" to create a range, and update the "previous end" for the next iteration
                         y1: y0 += +d[name]
                       };
            });
            d.total = d.counts[d.counts.length - 1].y1;
        });

        // data ranges for the x and y axes
        x.domain(d3.extent([
          timeFormat.parse(xhr.time_lower_bound), 
          timeFormat.parse(xhr.time_upper_bound)]));
        y.domain([0, d3.max(data, function(d) { return d.total; })]);
        xOverview.domain(x.domain());
        yOverview.domain(y.domain());

        module.time_lower_bound = xOverview.domain()[0];
        module.time_upper_bound = xOverview.domain()[1];
        $("#sankey-timerange-lower-value").text(module.time_lower_bound);
        $("#sankey-timerange-upper-value").text(module.time_upper_bound);

        // data range for the bar colours
        // (essentially maps attribute names to colour values)
        colour.domain(d3.keys(data[0]));

        // draw the axes now that they are fully set up
        main.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
        main.append("g")
            .attr("class", "y axis")
            .call(yAxis);
        overview.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + heightOverview + ")")
            .call(xAxisOverview);

        // draw the bars
        main.append("g")
                .attr("class", "bars")
            // a group for each stack of bars, positioned in the correct x position
            .selectAll(".bar.stack")
            .data(data)
            .enter().append("g")
                .attr("class", "bar stack")
                .attr("transform", function(d) { return "translate(" + x(d.date) + ",0)"; })
            // a bar for each value in the stack, positioned in the correct y positions
            .selectAll("rect")
            .data(function(d) { 
              return d.counts; 
            })
            .enter().append("rect")
                .attr("class", "bar")
                .attr("width", 6)
                .attr("y", function(d) { return y(d.y1); })
                .attr("height", function(d) { return y(d.y0) - y(d.y1); })
                .style("fill", function(d) { return colour(d.name); });

        overview.append("g")
                    .attr("class", "bars")
            .selectAll(".bar")
            .data(data)
            .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function(d) { return xOverview(d.date) - 3; })
                .attr("width", 6)
                .attr("y", function(d) { return yOverview(d.total); })
                .attr("height", function(d) { return heightOverview - yOverview(d.total); });

        // add the brush target area on the overview chart
        overview.append("g")
                    .attr("class", "x brush")
                    .call(brush)
                    .selectAll("rect")
                        // -6 is magic number to offset positions for styling/interaction to feel right
                        .attr("y", -6)
                        // need to manually set the height because the brush has
                        // no y scale, i.e. we should see the extent being marked
                        // over the full height of the overview chart
                        .attr("height", heightOverview + 7);  // +7 is magic number for styling

    // zooming/panning behaviour for overview chart
        function brushed() {
          // update the main chart's x axis data range
          x.domain(brush.empty() ? xOverview.domain() : brush.extent());
          // redraw the bars on the main chart
          main.selectAll(".bar.stack")
                  .attr("transform", function(d) { return "translate(" + x(d.date) + ",0)"; })
          // redraw the x axis of the main chart
          main.select(".x.axis").call(xAxis);

          // change filter
          if (!d3.event.sourceEvent) return; // only transition after input
          if (brush.empty()) {
            module.time_lower_bound = xOverview.domain()[0];
            module.time_upper_bound = xOverview.domain()[1];
          } else {
            var extent0 = brush.extent(),
                extent1 = extent0.map(d3.time.minute.round);
                module.time_lower_bound = extent0[0];
                module.time_upper_bound = extent0[1];
            // if empty when rounded, use floor & ceil instead
            if (extent1[0] >= extent1[1]) {
              extent1[0] = d3.time.minute.floor(extent0[0]);
              extent1[1] = d3.time.minute.ceil(extent0[1]);
              module.time_lower_bound = extent1[0];
              module.time_upper_bound = extent1[1];
            }           
          }
          $("#sankey-timerange-lower-value").text(module.time_lower_bound);
          $("#sankey-timerange-upper-value").text(module.time_upper_bound);
        }

        brush.on("brushend", function() {
          module.get_sankey();
          module.get_documap();
        });

      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  function init_sankey(xhr){

        var units = "Nuggets";
        
        sankey_size = {};
        sankey_size.width = $("#sankey-container").width();
        var v1 = xhr.nodes.filter(function(e) { return e.name.startsWith('theme'); }).length;
        var v2 = xhr.nodes.filter(function(e) { return e.name.startsWith('doc'); }).length;
        var v3 = xhr.nodes.filter(function(e) { return e.name.startsWith('author'); }).length;
        sankey_size.height = 50 * Math.max(v1, v2, v3);

        var margin = {top: 0, right: 0, bottom: 0, left: 0},
            width = sankey_size.width - margin.left - margin.right,
            height = sankey_size.height - margin.top - margin.bottom;
         
        var formatNumber = d3.format(",.0f"),    // zero decimal places
            format = function(d) { 
              return formatNumber(d) + " " + units; 
            },
            color = d3.scale.category20b();

        // append the svg canvas to the page
        var svg = d3.select("#sankey-container").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", 
                  "translate(" + margin.left + "," + margin.top + ")");
         
        // Set the sankey diagram properties
        var sankey = d3.sankey()
            .nodeWidth(40)
            .nodePadding(10)
            .size([width, height]);
         
        var path = sankey.link();

        // create graph from xhr
        var graph = {}
        graph["links"] = xhr["links"]
        graph["nodes"] = xhr["nodes"]

        // convert source/target type from string to object
        module.nodeMap = {};
        graph.nodes.forEach(function(x) { module.nodeMap[x.name] = x; });
        graph.links = graph.links.map(function(x) {
          return {
            source: module.nodeMap[x.source],
            target: module.nodeMap[x.target],
            value: x.value
          };
        });

        sankey
            .nodes(graph.nodes)
            .links(graph.links)
            .layout(1);
       
        // add in the links
        var link = svg.append("g").selectAll(".link")
            .data(graph.links)
          .enter().append("path")
            .attr("class", "link")
            .attr("d", path)
            .style("stroke-width", function(d) { return Math.max(1, d.dy); })
            .sort(function(a, b) { return b.dy - a.dy; });
       
        // add the link titles
        link.append("title")
              .text(function(d) {
              // return d.source.name + " → " + 
              //         d.target.name + "\n" + format(d.value); });
              return format(d.value) + " extarcted from " + d.source.name + " belong to " + d.target.name ; });
       
        // add in the nodes
        var node = svg.append("g").selectAll(".node")
            .data(graph.nodes)
          .enter().append("g")
            .attr("class", "node")
            .attr("data-id", function(d) {
              // thus name has to follow format 'type-id'
              return d.name;
            })
            .attr("num-nugget", function(d){ return d.value; })
            .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; });
          // .call(d3.behavior.drag()
          //   .origin(function(d) { 
          //     return d; 
          //   })
          //   .on("dragstart", function() { 
          //   this.parentNode.appendChild(this); })
          //   .on("drag", dragmove));

        node.classed("doc-node", function(d) {
          if(d.name.includes("doc")) return true;
          else return false;
        });
        node.classed("section-node", function(d) {
          if(d.name.includes("section")) return true;
          else return false;
        });
        node.classed("author-node", function(d) {
          if(d.name.includes("author")) return true;
          else return false;
        });
        node.classed("theme-node", function(d) {
          if(d.name.includes("theme")) return true;
          else return false;
        });

        node.on('click', function(d) {
          if (d3.select(this).classed("active")) {
            // unclick
            // change legend
            d3.selectAll(".legend").filter(function(d) { return d === "num_nugget_sel"; }).attr("display", "none").select("text").text("");

            d3.select(this).classed("active", false);
            link.style('stroke-opacity', function(l) {
              var opacity = 0.2;
              return opacity;
            });
          } else {
            // click
            // change legend
            d3.selectAll(".legend").filter(function(d) { return d === "num_nugget_sel"; }).attr("display", "block").select("text").text("#nuggets for " + d.text + " is selected");

            d3.selectAll(".node.active").classed("active",false)
            link.style('stroke-opacity', function(l) {
              var opacity = 0.2;
              return opacity;
            });
            d3.select(this).classed("active", true);

            if (d.name.startsWith("doc")){
              module.focus_node = d.name;
              // get_doc_bar();
            } else {
              if (module.focus_node === "") {
                // get_doc_bar();
              } else {
                var doc_id = module.focus_node.split("-")[1];
                // get_doc_bar();
              }
            }

            var focusLinkSet = new Set();
            var focusNodeSet = new Set();

            if (d.name.includes("doc")) {
              // from doc --> doc --> theme
              focusNodeSet.add(d);
              link.style('', function(l) {
                if (d === l.source) {
                  focusLinkSet.add(l);
                  focusNodeSet.add(l.target);
                }
              });
              link.style('', function(l) {
                if (d === l.source) {
                  focusNodeSet.has(l.source);
                  focusLinkSet.add(l);
                }
              });
              link.style('stroke-opacity', function(l) {
                var opacity = 0.2;
                if(focusNodeSet.has(l.source)) {
                  opacity = 0.5;
                }
                return opacity;
              });
            } else if (d.name.includes("theme")) {
              // from theme --> section --> doc
              focusNodeSet.add(d);
              link.style('', function(l) {
                if (d === l.target) {
                  focusLinkSet.add(l);
                  focusNodeSet.add(l.source);
                }
              });
              link.style('', function(l) {
                if (d === l.target) {
                  focusNodeSet.has(l.target);
                  focusLinkSet.add(l);
                }
              });
              link.style('stroke-opacity', function(l) {
                var opacity = 0.2;
                if(focusNodeSet.has(l.target)) {
                  opacity = 0.5;
                }
                return opacity;
              });
            } else {
              link.style('stroke-opacity', function(l) {
                var opacity = 0.2;
              if (d === l.source || d === l.target) {
                opacity = 0.5;
              }
                return opacity;
              });           
            }
          }
        });

        // add the rectangles for the nodes
        node.append("rect")
            .attr("height", function(d) { return d.dy; })
            .attr("width", sankey.nodeWidth())
            .style("fill", function(d) { 
              if (d.name.includes("section")) {
                return d.color = "blue";
              }
              if (d.name.includes("theme")) {
                return d.color = "yellow";
              }
              if (d.name.includes("doc")) {
                return d.color = "green";
              }
              if (d.name.includes("author")) {
                return d.color = "red";
              }
              return d.color = color(d.name.replace(/ .*/, ""));
            })
            .style("fill-opacity", function(d) { return 0.5;})
            .style("stroke-width", function(d) { return "0"; })
          .append("title")
            .text(function(d) { 
              // return d.text + "\n" + format(d.value);
              return d.text + "\n" + format(d.value); 
            });

        // add in the title for the nodes
        node.append("text")
            .attr("x", -6)
            .attr("y", function(d) { return d.dy / 2; })
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(function(d) {
              // if (d.text.length > 25) {
              //   return d.text.slice(0, 25) + "...";
              // } else {
              //   return d.text; 
              // }
              return d.text;
            })
          .filter(function(d) { return d.x < width / 2; })
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");

        // the function for moving the nodes
        function dragmove(d) {
          d3.select(this).attr("transform", 
              "translate(" + (d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (
                              d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))  ) + ")");
          sankey.relayout();
          link.attr("d", path);
        }
  }

  function get_filter() {
    var res = {}
    res["time_lower_bound"] = date_format(module.time_lower_bound);
    res["time_upper_bound"] = date_format(module.time_upper_bound);
    res["theme_ids"] = "";
    res["doc_ids"] = "";
    res["author_ids"] = "";
    $(".active.select-element").each(function(){
      if ($(this).attr("data-id").split("-")[0] === "doc") {
        res["doc_ids"] = res["doc_ids"] + " " + $(this).attr("data-id").split("-")[1];
      } else if ($(this).attr("data-id").split("-")[0] === "author") {
        res["author_ids"] = res["author_ids"] + " " + $(this).attr("data-id").split("-")[1];
      } else if ($(this).attr("data-id").split("-")[0] === "theme") {
        res["theme_ids"] = res["theme_ids"] + " " + $(this).attr("data-id").split("-")[1];
      }
    });
    res["theme_ids"] = res["theme_ids"].trim();
    res["doc_ids"] = res["doc_ids"].trim();
    res["author_ids"] = res["author_ids"].trim();
    return res;
  }

  // convert from timestamp to date in format "2010 12 07 01 01 01"
  function date_format(date) {
      var res = date.getFullYear() + " " 
        + ("0" + (date.getMonth() + 1)).slice(-2) + " " 
        + ("0" + date.getDate()).slice(-2) + " " 
        + ("0" + date.getHours()).slice(-2) + " " 
        + ("0" + date.getMinutes()).slice(-2);
      return res;
  }

  module.init();

  return module;

});