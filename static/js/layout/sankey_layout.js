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
    barchart_size = {width: $(window).width() * 0.9, height:180};
    sankey_size = {width: 500, height:600}
    timerange_num_interval = 100;
    module.focus_node = "";

    module["focusNode"];
    module["nodeStyle"] = {};
    module.time_lower_bound = new Date(2010, 1, 1, 0, 0, 0);
    module.time_upper_bound = new Date(2020, 12, 31, 23, 59, 59);
    
    module.barchart_ajax;
    module.nodeMap = {};
    module.time_bound_list = [];
    workbench_module.threshold = 300;

    module["relation"] = $("#sankey-relation .item.active").attr("data-value");

    module.coverage_map = {}
    module.coverage_map_filtered = {}
    module.coverage_map_selected = {};

    isDown = false;   // Tracks status of mouse button
    $(document).mousedown(function() {
      isDown = true;      // When mouse goes down, set isDown to true
    })
    .mouseup(function() {
      isDown = false;    // When mouse goes up, set isDown to false
    });

    hide_rec();
    add_selection_elements();
    module.get_barchart();
    init_eventhandlers();

    $('#sankey-relation .item').tab();
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
          // item.count2 = p.value;
          // item.count3 = p.value;
          data.push(item);
        });


        // sizing information, including margins so there is space for labels, etc
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

        module.get_sankey();

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
          hide_rec();
          get_doc_bar();
        });

      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  // sankey
  module.get_sankey = function() {   
    
    if (module.sankey_ajax) module.sankey_ajax.abort();

    var loader_str = '<div class="ui segment" style="height:' + sankey_size.height + 'px;">' +
      '<div class="ui inverted dimmer active">' +
      '<div class="ui large text loader">Loading</div>' +
      '</div><p></p><p></p><p></p></div>';
    $("#sankey").html(loader_str);

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
        $("#sankey").html("");
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

  function init_sankey(xhr){

        var units = "Nuggets";
         
        var margin = {top: 30, right: 30, bottom: 30, left: 30},
            width = sankey_size.width - margin.left - margin.right,
            height = sankey_size.height - margin.top - margin.bottom;
         
        var formatNumber = d3.format(",.0f"),    // zero decimal places
            format = function(d) { 
              return formatNumber(d) + " " + units; 
            },
            color = d3.scale.category20b();

        // append the svg canvas to the page
        var svg = d3.select("#sankey").append("svg")
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
              get_doc_bar();
            } else {
              if (module.focus_node === "") {
                get_doc_bar();
              } else {
                var doc_id = module.focus_node.split("-")[1];
                get_doc_bar();    
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
              if (d.name.includes("author")) {
                return "P" + d.name.split("-")[1];
              } else {
                return d.text;
              }
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

  function get_doc_preview(doc_id) {
    $.ajax({
      url: '/workbench/api_get_doc_by_doc_id/',
      type: 'post',
      data: {
        'doc_id': doc_id,
      },
      success: function(xhr) {
        $("#sankey-document").html(xhr.workbench_document);
        $("#sankey-document").height(600);
        $("#sankey-document-container").animate({scrollTop: 0}, 0);
        workbench_module.doc_id = xhr.doc_id;
        // load highlights, selected can only be author or theme
        var selected = $(".node.active").attr("data-id");
        var filter = get_filter();
        var doc_id = xhr.doc_id;
        $.ajax({
          url: '/sankey/get_highlights/',
          type: 'post',
          data: {
            "time_lower_bound": filter.time_lower_bound,
            "time_upper_bound": filter.time_upper_bound,
            "author_ids": filter.author_ids,
            "theme_ids": filter.theme_ids,
            "selected": selected,
            "doc_id": doc_id
          },
          success: function(xhr) {
            var highlightsData = xhr.highlights;

            for (var j = 0; j < highlightsData.length; j++) {
              var highlight = highlightsData[j];
              var $context = $("#sankey-document").find('.section-content[data-id="' + highlight.context_id + '"]');
              // assume orginal claims are nuggets now 
              var className = '';
              if (highlight.author_id == sessionStorage.getItem('user_id')) {
                if (highlight.type == 'comment') {
                  className = 'my_comment';
                } else {
                  className = 'my_nugget';
                }
              } else {
                if (highlight.type == 'comment') {
                  className = 'other_comment';
                } else {
                  className = 'other_nugget';
                }
              }
              var text = [];
              // loop over all words in the highlight
              for (var i = highlight.start; i <= highlight.end; i++) {
                var $token = $context.find('.tk[data-id="' + i + '"]');
                text.push($token.text());
                if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
                  $token.addClass(className).attr('data-hl-id', highlight.id);
                } else {
                  var curr_id = $token.attr('data-hl-id'); // append highlight for this word
                  $token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id);
                }
              }
            }
          },
          error: function(xhr) {
            if (xhr.status == 403) {
              Utils.notify('error', xhr.responseText);
            }
          }
        });
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  function init_eventhandlers() {

    $("body").on("mouseover", "#sankey-document-container", function(e) {
      $("#sankey-container").css("overflow", "hidden");
    }).on("mouseout", "#sankey-document-container", function(e) {
      $("#sankey-container").css("overflow", "auto");
    });

    $("body").on("click", ".sankey-document-nuggetmap", function(e) {
      module.focus_node = "doc-" + $(this).attr("doc-id");
      if (module.focus_node !== "" && module.focus_node.split("-")[0] === "doc") {
        var doc_id = module.focus_node.split("-")[1];
        $("#doc-bar-indicator").show();
        $bar = $(".sankey-document-nuggetmap[doc-id=" + doc_id + "]")
        $("#doc-bar-indicator").css("left", $bar.offset().left).css("top", $bar.offset().top - 10);
        $node = $(".doc-node[data-id='" + module.focus_node + "']")
        if ($node.length !== 0) {
          $("#sankey-doc-arrow").show();
          $("#sankey-doc-arrow").css("left", $node.offset().left - 20).css("top", $node.offset().top - 10);            
        } else {
          $("#sankey-doc-arrow").hide();
        }
        get_doc_preview($(this).attr("doc-id"));
      }
    });

    $("body").on("click", ".doc-bar-elem", function(e) {
      var data_id = $(this).parents(".doc-bar").attr("data-id");
      module.focus_node = data_id;
      get_doc_bar();
    })

    $("body").on("click", ".select-sort", function(e){
      $(".select-sort").removeClass("active");
      $(this).addClass("active");
    })    

    $("body").on("click", ".select-element", function(e){

      if ($(this).hasClass("active")) {
        $(this).removeClass("green").removeClass("active");
      } else {
        $(this).addClass("green").addClass("active");
      }
      get_doc_bar();
      hide_rec();
      module.get_barchart();
    })

    $("body").on("click", "#update-sankey", function(e){
      $(".select-toolbar.active .select-element.active").click();
      hide_rec();
      module.get_barchart();
    });
    $("body").on("click", "#refresh-sankey", function(e){
      module.get_barchart();
      get_doc_bar();
    });

    $("body").on("click", "#context-menu-goto", function(e){
      var doc_id = module.focus_node.split("-")[1];
      $("#loading-status").show();
        $.ajax({
          url: '/workbench/api_get_doc_by_doc_id/',
          type: 'post',
          data: {
            'doc_id': doc_id,
          },
          success: function(xhr) {
            $("#context-menu-cancel").click();
            $("#sankey-container").hide();
            $("#dark-fullscreen").hide();
            
            $("#workbench-document").html(xhr.workbench_document);
            $("#workbench-document").height($(window).height() - workbench_module.body_bottom);
            $("#workbench2-document-container").animate({scrollTop: 0}, 0);
            workbench_module.doc_id = xhr.doc_id;
            workbench_module.load_highlights_by_doc();
            workbench_module.get_viewlog();
            workbench_module.get_nuggetmap();
          },
          error: function(xhr) {
            if (xhr.status == 403) {
              Utils.notify('error', xhr.responseText);
            }
          }
        });
    });

    $("body").on("click", "#sankey-relation .item.active", function(e){
      module["relation"] = $("#sankey-relation .item.active").attr("data-value");
      hide_rec();
      clear_filters();
      add_selection_elements();
      module.get_barchart();
      module.get_sankey();
    })
  };

  function clear_filters() {
    $(".select-toolbar.active .select-element.active").removeClass("active").removeClass("green");
  }

  function get_filter() {
    var res = {}
    res["time_lower_bound"] = date_format(module.time_lower_bound);
    res["time_upper_bound"] = date_format(module.time_upper_bound);
    res["theme_ids"] = ""
    $(".select-toolbar.active .select-theme-elements .select-element.active").each(function(){
      res["theme_ids"] = res["theme_ids"] + " " + $(this).attr("data-id").split("-")[1];
    });
    res["doc_ids"] = ""
    $(".select-toolbar.active .select-document-elements .select-element.active").each(function(){
      res["doc_ids"] = res["doc_ids"] + " " + $(this).attr("data-id").split("-")[1];
    })
    res["author_ids"] = ""
    $(".select-toolbar.active .select-author-elements .select-element.active").each(function(){
      res["author_ids"] = res["author_ids"] + " " + $(this).attr("data-id").split("-")[1];
    })
    res["theme_ids"] = res["theme_ids"].trim();
    res["doc_ids"] = res["doc_ids"].trim();
    res["author_ids"] = res["author_ids"].trim();
    return res;
  }

  function get_doc_bar() {

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
        module.coverage_map = xhr.coverage_map;
        module.coverage_map_filtered = xhr.coverage_map_filtered;
        module.coverage_map_selected = xhr.coverage_map_selected;
        if (module.focus_node !== "") {
          var doc_id = module.focus_node.split("-")[1];
          get_doc_preview(doc_id);
        }

        var reverse = $("#select-sort-descending").hasClass("active");
        $('#doc-bar-container').empty();

        for (var i = 0; i < Object.keys(xhr.nuggetmaps).length; i++) {
          key = Object.keys(xhr.nuggetmaps)[i];
          data = xhr.nuggetmaps[key].distribution;
          doc_name = xhr.nuggetmaps[key].doc_name;
          html = '<div id="sankey-document-nuggetmap-' + i + '" class="sankey-document-nuggetmap" doc-id="' + key + '" style="position:absolute; top:0; left:' + 50 * i + 'px"></div>';
          $("#doc-bar-container").append(html);
          function cell_dim(total, cells) { return Math.floor(total/cells) }
          var total_height = 4 * data.length;
          var total_width = 30;
          var rows = data.length; // 1hr split into 5min blocks
          var cols = 1; // 24hrs in a day
          var row_height = cell_dim(total_height, rows);
          var col_width = cell_dim(total_width, cols);

          $("#sankey-document-nuggetmap-" + i).html("");
          var color_chart = d3.select("#sankey-document-nuggetmap-" + i)
                            .append("svg")
                            .attr("class", "chart")
                            .attr("width", col_width * cols)
                            .attr("height", row_height * rows);

          var n = d3.select("#sankey-document-nuggetmap-" + i).insert("svg")
            .attr("width", 100)
            .attr("height", 500)
            .insert("g")
            .attr("transform","translate(0, 0) rotate(90)");
          n.insert("text")
            .attr("font-size", "10px")
            .text(doc_name);

          var color = d3.scale.linear()
                    .domain([0, 1])
                    .range(["Azure", "#C0E7F3"]);

          color_chart.selectAll("rect")
                  .data(data)
                  .enter()
                  .append("rect")
                  .attr("x", function(d,i) { return Math.floor(i / rows) * col_width; })
                  .attr("y", function(d,i) { return i % rows * row_height; })
                  .attr("width", col_width)
                  .attr("height", row_height)
                  .attr("fill", color)
                  .attr("data-id", function(d) { return d; });
        }

        for (var i = 0; i < Object.keys(xhr.viewlogs).length; i++) {
          key = Object.keys(xhr.viewlogs)[i];
          data = xhr.viewlogs[key];
          html = '<div id="sankey-document-viewlog-' + i + '" style="position:absolute; top:0; left:' + (30 + 50 * i) + 'px"></div>';
          $("#doc-bar-container").append(html);
          function cell_dim(total, cells) { return Math.floor(total/cells) }
          var total_height = 4 * data.length;
          var total_width = 10;
          var rows = data.length; // 1hr split into 5min blocks
          var cols = 1; // 24hrs in a day
          var row_height = cell_dim(total_height, rows);
          var col_width = cell_dim(total_width, cols);

          $("#sankey-document-viewlog-" + i).html("");
          var color_chart = d3.select("#sankey-document-viewlog-" + i)
                            .append("svg")
                            .attr("class", "chart")
                            .attr("width", col_width * cols)
                            .attr("height", row_height * rows);

          var color = d3.scale.linear()
                    .domain([0, workbench_module.threshold ])
                    .range(["white", "red"]);

          color_chart.selectAll("rect")
                  .data(data)
                  .enter()
                  .append("rect")
                  .attr("x", function(d,i) { return Math.floor(i / rows) * col_width; })
                  .attr("y", function(d,i) { return i % rows * row_height; })
                  .attr("width", col_width)
                  .attr("height", row_height)
                  .attr("fill", color)
                  .attr("data-id", function(d) { return d; });
        }


        // add star
        if (module.focus_node !== "" && module.focus_node.split("-")[0] === "doc") {
          var doc_id = module.focus_node.split("-")[1];
          $("#doc-bar-indicator").show();
          $bar = $(".sankey-document-nuggetmap[doc-id=" + doc_id + "]")
          $("#doc-bar-indicator").css("left", $bar.offset().left).css("top", $bar.offset().top - 10);
          $node = $(".doc-node[data-id='" + module.focus_node + "']")
          if ($node.length !== 0) {
            $("#sankey-doc-arrow").show();
            $("#sankey-doc-arrow").css("left", $node.offset().left - 20).css("top", $node.offset().top - 10);            
          } else {
            $("#sankey-doc-arrow").hide();
          }
        }

        $(".latest-activity").attr("class", "");
        $(".latest-activity-arrow").remove();

        // $(".sankey-document-nuggetmap[doc-id=59]").find("rect")[104]
        for (var i = 0; i < Object.keys(xhr.author_activity_map).length; i++) {
          var author_id = Object.keys(xhr.author_activity_map)[i],
              data = xhr.author_activity_map[author_id],
              doc_id = data.doc_id,
              work_on = data.work_on,
              author_name = data.author_name;
          $($(".sankey-document-nuggetmap[doc-id=" + doc_id + "]").find("rect")[work_on])
            .attr("class", "latest-activity")
            .attr("author-id",author_id)
            .attr("author-name",author_name);
        }

        // add author lastest activity
        // var your_id = $("#header-user-name").attr("data-id");
        // $(".latest-activity").each(function(){
        //     var author_id = $(this).attr("author-id");
        //     var author_name = $(this).attr("author-name");
        //     if (your_id === author_id) {
        //       var tooltip = "You recently worked at this place";
        //       var arrow = '<div class="latest-activity-arrow" data-tooltip="' + tooltip + '" author-id="' + author_id + '" style="position:fixed;">' +
        //           '<i class="icon big red user"></i>' +
        //         '</div>';       
        //     } else {
        //       var tooltip = author_name + " recently worked at this place";
        //       var arrow = '<div class="latest-activity-arrow" data-tooltip="' + tooltip + '" author-id="' + author_id + '" style="position:fixed;">' +
        //               '<i class="icon big olive user"><b>' + author_name + '</b></i>' +
        //         '</div>';  
        //     }
        //     $("#latest-activity-container").append(arrow);
        //     $(".latest-activity-arrow[author-id=" + author_id +  "]").css("left", $(this).offset().left).css("top", $(this).offset().top - 10);
        // })
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  function getSorted(selector, attrName, reverse) {
    return $($(selector).toArray().sort(function(a, b){
        var aVal = parseInt(a.getAttribute(attrName)),
            bVal = parseInt(b.getAttribute(attrName));
        return reverse ? bVal - aVal : aVal - bVal;
    }));
  }

  function add_selection_elements() {
    $.ajax({
      url: '/sankey/get_entities/',
      type: 'post',
      success: function(xhr) {
        var reverse = $("#select-sort-descending").hasClass("active");
        if ($(".select-toolbar.active").find(".select-document").length !== 0) {
          $(".select-document-elements").empty();
          for (var i = 0; i < xhr.docs.length; i ++) {
            var num = "0"
            if ($(".doc-node[data-id='" + xhr.docs[i].id + "']").length === 1) {
              num = $(".doc-node[data-id='" + xhr.docs[i].id + "']").attr("num-nugget");
            }
            $(".select-document-elements").append('<a class="ui label select-element active green" data-id="' + xhr.docs[i].id + '"> ' 
              + xhr.docs[i].name + '</a>');
          }   
          $(".doc-labels").find("span").text($(".select-toolbar.active .select-document-elements .select-element").length);
        }

        if ($(".select-toolbar.active").find(".select-author").length !== 0) {
          $(".select-author-elements").empty();
          for (var i = 0; i < xhr.authors.length; i ++) {
            var num = "0"
            if ($(".author-node[data-id='" + xhr.authors[i] + "']").length === 1) {
              num = $(".author-node[data-id='" + xhr.authors[i] + "']").attr("num-nugget");
            }
            $(".select-author-elements").append('<a class="ui label select-element active green" data-id="' + xhr.authors[i].id + '"> ' 
              + xhr.authors[i].name + '</a>');
          }   
          $(".author-labels").find("span").text($(".select-toolbar.active .select-author-elements .select-element").length);
        } 

        if ($(".select-toolbar.active").find(".select-theme").length !== 0) {
          $(".select-theme-elements").empty();
          for (var i = 0; i < xhr.themes.length; i ++) {
            var num = "0"
            if ($(".theme-node[data-id='" + xhr.themes[i] + "']").length === 1) {
              num = $(".theme-node[data-id='" + xhr.themes[i] + "']").attr("num-nugget");
            }
            $(".select-theme-elements").append('<a class="ui label select-element active green" data-id="' + xhr.themes[i].id + '"> ' 
              + xhr.themes[i].name + '</a>');
          }   
          $(".theme-labels").find("span").text($(".select-toolbar.active .select-theme-elements .select-element").length);
        }
        get_doc_bar();
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

$("#sankey-document").bind('scroll', function() {
  if (module.focus_node !== "" && module.focus_node.split("-")[0] === "doc") {
    var doc_id = module.focus_node.split("-")[1];
    var perc = ($("#sankey-document").scrollTop() + $("#sankey-document").height() / 2) / $("#sankey-document .workbench-doc-item").height();
    $bar = $(".sankey-document-nuggetmap[doc-id=" + doc_id + "]").find(".chart");
    $("#doc-bar-arrow").show();
    $("#doc-bar-arrow").css("left", $bar.offset().left - 15).css("top", perc * $bar.height() + $bar.offset().top);
  }
});

function hide_rec() {
  $("#doc-bar-arrow").hide();
  $("#doc-bar-indicator").hide();
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

// convert from timestamp to date for pretty
function number2date_pretty(num) {
    var offset = 0;
    var date = new Date(Number(num) + offset * 3600 * 1000);
    var res = date.getFullYear() + "/" 
      + ("0" + (date.getMonth() + 1)).slice(-2) + "/" 
      + ("0" + date.getDate()).slice(-2) + " " 
      + ("0" + date.getHours()).slice(-2) + ":" 
      + ("0" + date.getMinutes()).slice(-2) + ":" 
      + ("0" + date.getSeconds()).slice(-2);
    return res;
}

// from server to front end, time is in format "2010 12 07 01 01 01"
// convert from "2010 12 07 01 01 01" to timestamp
function date2number(str) {
    var date = new Date();  
    var arr = str.split(" ")
    date.setYear(arr[0]);
    date.setMonth(arr[1] - 1);
    date.setDate(arr[2]);
    date.setHours(arr[3]);
    date.setMinutes(arr[4]);
    date.setSeconds(arr[5]);
    return date.getTime();
}


  return module;

});