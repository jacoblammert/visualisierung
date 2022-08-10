import * as d3 from "d3";
import * as Papa from "papaparse"

// cmd to this folder then:
// npm install papaparse
// npm install d3@5
// npm run start 

var path_kanji = "data\\kanji.csv";
var path_vocab = "data\\vocab.csv";


Papa.parse(path_kanji,{
    header: true,
    download: true,
    dynamicTyping: true,
    complete: function(results) {
        
        Papa.parse(path_vocab,{
            header: true,
            download: true,
            dynamicTyping: true,
            complete: function(results1) {
                
                findpairs(results.data, results1.data);

            }
        });
    }
});

var max_connections = 0
var average_connections = 0

function findpairs(kanji,vocab){


    for (let i = 0; i < vocab.length; ++i){
        if (vocab[i].kanji == null){
            vocab.splice(i, 1);
            i--;
        }else {
            vocab[i].level = 0
        }
    }


    for (let i = 0; i < vocab.length; ++i){
        vocab[i].meaning = vocab[i].meaning.split(";")
        
        let word = vocab[i].kanji.split("")
        
        for (let j = 0; j < kanji.length; ++j){
            if (word.includes(kanji[j].kanji)){
                vocab[i].level = Math.max(vocab[i].level, kanji[j].level)
            }
        }
    }


    var all_kanji = []
    var all_hiragana = []

    for (let i = 0; i < kanji.length; ++i){
        all_kanji.push(kanji[i].kanji)
    

        if (null != kanji[i].kun){
        var current_hiragana = kanji[i].kun.split("");

            if (null != current_hiragana){
                for (let j = 0; j < current_hiragana.length; ++j){
                    if (!all_hiragana.includes(current_hiragana[j])){
                        all_hiragana.push(current_hiragana[j]);
                    }
                }
            }
        }
    }



    var linked_vocabs = []

    var longest_chain = [];

    var list_nodes = [];
    var list_links = [];

    var total_connections = 0
    var total_connections_nr = 0

    for (let i = 0; i < vocab.length; i++) {
        var linked_vocab = []
        //console.log("i:");
        //console.log(vocab[i]);
        //console.log("j:");
        if (null != vocab[i].kanji){
            
            var node = new Object()
            node.name = vocab[i].kanji;
            node.id = i;
            
            list_nodes.push(node);

            var current_vocab = vocab[i].kanji.split("");

            var connected_nodes = 1

            for (let j = 0; j < vocab.length; j++) { //an element can (will) contain itself -> connection
                
                for (let k = 0; k < current_vocab.length; k++){

                    //console.log("current_vocab[k] i " + i + " j " + j + " k " + k);
                    //console.log(current_vocab[k]);
                    //console.log("vocab[j].kanji");
                    //console.log(vocab[j].kanji);

                    if (null != vocab[j].kanji){
                        if (vocab[j].kanji.includes(current_vocab[k]) && !all_hiragana.includes(current_vocab[k])){
                            //linked_vocab.push(vocab[j].kanji + " " + j);
                            if (j > i){
                                linked_vocab.push(j);
                                var link = new Object();
                                link.source = i;
                                link.target = j;
                                list_links.push(link);
                                k = current_vocab.length; // dont need to check this jth word any more
                            }
                            connected_nodes++
                        }
                    }
                }
            }
            vocab[i].connections = connected_nodes
            total_connections_nr++
            total_connections += connected_nodes
            max_connections = Math.max(connected_nodes, max_connections)
        }

        if (longest_chain.length < linked_vocab.length){
            longest_chain = linked_vocab;
        }

        linked_vocabs.push(linked_vocab);
      }

      var data = new Object();
      data.nodes = list_nodes;
      data.links = list_links;
      
      average_connections = total_connections/total_connections_nr

      for (let i = 0; i < vocab.length; ++i){
        vocab[i].colorline = vocab[i].connections / max_connections;
        vocab[i].draw = 0 // level to draw, if selected, draw the info as well
      }



    drawNetwork(data,vocab);
}


function drawNetwork(data,vocab){

    // https://d3-graph-gallery.com/graph/network_basic.html - graph
    // https://observablehq.com/@john-guerra/force-directed-graph-with-link-highlighting - highlighting selected subgraph
    // https://bl.ocks.org/heybignick/3faf257bbbbc7743bb72310d03b86ee8 - text
    // https://observablehq.com/@severo/drag-zoom-canvas - zoom

    // https://observablehq.com/@grantcuster/using-three-js-for-2d-data-visualization - maybe zoom + lables

    var level_to_display = 0; // kanji level which should be displayed

    var svg_width = 1500;
    var svg_height = 1000;

    var node_repulsion = -100;
    var circle_radius = 10;

    var transform = d3.zoomIdentity;

    var color_node = "#59b3a2";
    

    var color_red = "#FF0000";
    var color_yellow = "#FFFF00";
    var color_green = "#00FF00";
    var color_blue = "#0000FF";

    var color_black = "#000000";
    var color_white = "#FFFFFF";


    var color_grey = "#aaa";
    var line_width = circle_radius * 0.25
    var line_width_connected = circle_radius * 0.4
    
    var color_text_background = "grey";
    var color_text = "black";
    var color_active = "red";
    var color_connected = "orange";


    
    var color_1 = blendColors(color_blue, color_red, 0.1)//"#088546";
    var color_2 = blendColors(color_blue, color_red, 0.4)//"#0b8c2b";
    var color_3 = blendColors(color_blue, color_red, 0.7)//"#51a31d";
    var color_4 = blendColors(color_blue, color_red, 0.9)//"#a1a608";

    var color_1 = blendColors(color_1, color_black, 0.4)
    var color_2 = blendColors(color_2, color_black, 0.3)
    var color_3 = blendColors(color_3, color_black, 0.2)
    var color_4 = blendColors(color_4, color_black, 0.1)

    var clicked_element = false // if a circle has been clicked or not

    let mouse = Object()
    mouse.cx = 0 // mouse x in canvas space
    mouse.cy = 0 // mouse y in canvas space
    mouse.gx = 0 // mouse x in graph space
    mouse.gy = 0 // mouse y in graph space

    //var view_mode_old = 0;
    //var view_mode = 0;

    var active_node_id = -1 // id of the active node
    var active_node_element // active node
    var active_node_id_old = -2 // id of the active node
    var connected_nodes = [] // array with connected nodes

    var searchterm = ""
    var searchfilter = 0
    var searchresults = 0
    var visibleconnections = 0 // number of visible connections of the nodes


    var screen = Object()

    screen.min_x = 0
    screen.min_y = 0
    screen.max_x = 0
    screen.max_y = 0

    var point0 = Object()
    point0.x = 0
    point0.y = 0

    var point1 = Object()
    point1.x = 0
    point1.y = 0

    var animation = Object()
    animation.point0 = point0
    animation.point1 = point1
    animation.progress = -1


    
    function test() {
        searchterm = document.getElementById("search").value;
        searchfilter = document.getElementById("searchfilter").value;

        if (0 <= animation.progress && animation.progress < 1){
            updateAnimation()
        }
        render()
      }
      var interval = setInterval(test, 10);


    document.form2.onchange = function(){
        level_to_display = document.form2.menu.value
        //render()
        //render()
    };




    var active_connected_nodes = [] // array with connected nodes which are also active

    var drawn_points = 0
    var drawn_lines = 0


    // set the dimensions and margins of the graph
    var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = svg_width - margin.left - margin.right,
      height = svg_height - margin.top - margin.bottom;
    
    // append the svg object to the body of the page
    var svg = d3.select("#network")
    .append("canvas")
        .attr("id","canvas")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext('2d');


    var link = svg
      .data(data.links)
      .enter()
    
    var node = svg
      .data(data.nodes)
      .enter()



    // Let's list the force we wanna apply on the network
    var simulation = d3.forceSimulation(data.nodes)                 // Force algorithm is applied to data.nodes
        .force("link", d3.forceLink()                               // This force provides links between nodes
              .id(function(d) { return d.id; })                     // This provides the id of a node
              .links(data.links)                                    // and this the list of links
        )
        .force("charge", d3.forceManyBody().strength(node_repulsion))         // This adds repulsion between nodes. Play with the -400 for the repulsion strength
        .force("center", d3.forceCenter(svg_width / 2, svg_height / 2))     // This force attracts nodes to the center of the svg area
        .on("tick", render);


    

    function getMousePos(canvas, e){
        var rect = canvas.getBoundingClientRect()
        return {x: e.clientX - rect.left, y: e.clientY - rect.top}
    }



    
    
    ctx.canvas.addEventListener('mousemove', function(e){

        var pos = getMousePos(this, e)
        mouse.cx = pos.x
        mouse.cy = pos.y
        
        mouse.gx = ((mouse.cx - transform.x) / transform.k);
        mouse.gy = ((mouse.cy - transform.y) / transform.k);

        //console.log("transform")
        //console.log(transform)
        //console.log("mouse")
        //console.log(mouse)
    })
    
    ctx.canvas.addEventListener('mousedown', function(e){

        if ( transform.k < 0.3){
            return
        }

        clicked_element = false;

        if (e.button == 0){

            // check if on a position in the text


            var selected_element = false; // TODO add text selection

            if (!selected_element){
                // no text element was selected
                // has a new node been selected?
                node.each(function(d){

                    findActive(d)
                
                    if (d.id == active_node_id){
                        if (!connected_nodes.includes(d)){
                            connected_nodes.push(d)
                        }
                        
                        active_node_element = d;
                    }
                });/**/
                if (active_node_id != active_node_id_old){
                    active_connected_nodes = []
                    active_connected_nodes.push(active_node_element)
                }/**/
            }
            //render()
            //render()
            if (!clicked_element){
                select_Line();
            }
        }else if (e.button == 1 || e.button == 2){
            
            // Take over a connected node or select a new one

            node.each(function(d){

                findNewActive(d)
            
                if (d.id == active_node_id){
                    if (!connected_nodes.includes(d)){
                        connected_nodes.push(d)
                    }
                    active_node_element = d;
                }
            });/**/
            if (active_node_id != active_node_id_old){
                //active_connected_nodes = []
                if (!active_connected_nodes.includes(active_node_element)){
                    active_connected_nodes.push(active_node_element)
                }else {
                    dToFrontActive(active_node_element)
                }
            }
            //render()
            //render()
        }
    })


    d3.select(ctx.canvas)
    .call(d3.zoom().scaleExtent([0.05, 40])
    //.on("zoom", () => render())
    )
    .on("dblclick.zoom", null);


        
    function render(){
        //console.log("k: " + transform.k);
        transform = d3.zoomTransform(canvas);

        ctx.save();
        ctx.clearRect(0, 0, svg_width, svg_height);
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.k, transform.k);
        
        drawn_points = 0
        drawn_lines = 0

        if (active_node_id_old != active_node_id){
            connected_nodes = []
            connected_nodes.push(active_node_element)
        }






        screen.min_x = ((0 - transform.x) / transform.k); // screen min x in point space
        screen.min_y = ((0 - transform.y) / transform.k); // screen min y in point space

        screen.max_x = ((svg_width - transform.x) / transform.k);  // screen max x in point space
        screen.max_y = ((svg_height - transform.y) / transform.k); // screen max y in point space


        udpateConnectedNodes()





        link.each(function(d) {
            // draws all grey lines
            drawLine(d.source,d.target, 0, line_width);
        });

        visibleconnections = 0
        // highlighted lines
        for (let i = 0; i < connected_nodes.length && null != active_node_element; ++i){
            // draws all black lines connected to the selected object
            if (connected_nodes[i] != active_node_element){
                drawLine(active_node_element, connected_nodes[i], 1, line_width_connected);
            }
        }

        active_node_id_old = active_node_id

     



        searchresults = 0
        node.each(function(d){
            //console.log(d.connections)
            if (shouldDraw(d)){
                if (drawPointHere(d.x,d.y, circle_radius)){
                    var color_range = color_in_range(d)
                    drawPoint(d, color_range, circle_radius)
                }
                searchresults++
            }
        });
        document.getElementById("searchresults").innerHTML = "Results: " + searchresults
        document.getElementById("connections").innerHTML = "Total Connections: " + (connected_nodes.length - 1)
        document.getElementById("visibleconnections").innerHTML = "Visible Connections: " + visibleconnections


        if (null != active_node_element){
            drawActivePoints()
        }

        /*/
        console.log("drawn_points")
        console.log(drawn_points)
        console.log("drawn_lines")
        console.log(drawn_lines)
/**/
        ctx.restore();
    }

    function udpateConnectedNodes(){
        
        link.each(function(d){

            if (d.source.id == active_node_id || d.target.id == active_node_id){
            
                if (active_node_id != active_node_id_old){
                    
                    if (d.source.id == active_node_id){
                        if (!connected_nodes.includes(d.target)){
                            connected_nodes.push(d.target)
                        }
                    }else{
                        if (!connected_nodes.includes(d.source)){
                            connected_nodes.push(d.source)
                        }
                    }
                }
            }
        })
    }


    function drawLine(d0, d1,highlighted, line_width){

        if (!(shouldDraw(d0) && shouldDraw(d1))){
            return
        }
        visibleconnections++;

        if (drawLineHere(d0.x,d0.y,d1.x,d1.y,)){


            var color = getLineColor(d0,d1,highlighted)


            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = line_width
            ctx.moveTo(d0.x, d0.y);    
            ctx.lineTo(d1.x, d1.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
            drawn_lines++;
        }
    }



    function drawActivePoints(){
        

        // for the animation draw a circle around the point to jump to

        if (null != animation.d && shouldDraw(animation.d)){
            drawPoint(animation.d, color_yellow, circle_radius * 1.15)
        }

        // draws all points in their color
        var color = color_connected
        for (let i = 0; i < connected_nodes.length; ++i){
            if (connected_nodes[i] == active_node_element){
                color = color_active
            }else{
                color = color_connected
            }
            if (shouldDraw(connected_nodes[i])){
                drawPoint(connected_nodes[i],color, circle_radius)
            }
        }
        


        


        // Only the kanji
        for (let i = 0; i < connected_nodes.length; ++i){

            if (connected_nodes[i] == active_node_element){
                color = color_active
            }else{
                color = color_connected
            }

            if (shouldDraw(connected_nodes[i])){
                drawTitle(connected_nodes[i].x,connected_nodes[i].y,connected_nodes[i], color)
            }
        }/**/


        // change order of text drawing if an object has been selected
        for (let i = active_connected_nodes.length-1; 0 <= i; --i){
            var rect = calculateTextRect(active_connected_nodes[i].x,active_connected_nodes[i].y,active_connected_nodes[i])
            if (mouseInRect(rect[0],rect[1],rect[2], rect[3])){
                dToFrontActive(active_connected_nodes[i])
                i = -1
            }
        }


        // Draw text seperatly in the correct order
        for (let i = 0; i < active_connected_nodes.length; ++i){

            if (shouldDraw(active_connected_nodes[i]) && connected_nodes.includes(active_connected_nodes[i])){
                if (active_connected_nodes[i] == active_node_element){
                    color = color_active
                }else{
                    color = color_connected
                }
                
                
                if (vocab[active_connected_nodes[i].id].draw == 1){
                    drawPoint(active_connected_nodes[i],color,circle_radius)
                    drawTextRect(active_connected_nodes[i], color)
                    drawText(active_connected_nodes[i], color)
                }
            }
        }
        
        
            
    }


    function drawPoint(d,color,radius){
        
        color = getPointColor(d, color)

        ctx.beginPath();/**/
        ctx.arc(d.x, d.y, radius, 0, Math.PI*2, false);
        /*/        
        ctx.rect(x - circle_radius,y - circle_radius,2*circle_radius,2*circle_radius);
        /**/

         
        ctx.fillStyle = color;
        ctx.fill();
        drawn_points++
        
    }

    function findActive(d){
        // checks if a not yet connected node has been selected 
        

        if (!shouldDraw(d)){
            return
        }

        if (distace_point_point(d.x ,d.y, mouse.gx, mouse.gy) <= circle_radius){
            
            clicked_element = true;

            vocab[d.id].draw = (vocab[d.id].draw + 1) % 2

            if (connected_nodes.includes(d) && !active_connected_nodes.includes(d) /*&& active_node_element != d*/){
                // New element added to selection
                active_connected_nodes.push(d)
                return
            }else if (connected_nodes.includes(d) && active_connected_nodes.includes(d) /**/&& active_node_element != d/**/){
                // element deselected
                active_connected_nodes.splice(active_connected_nodes.indexOf(d),1)
                return
            }

            active_node_id = d.id
        }
    }

    function findNewActive(d){
        if (distace_point_point(d.x, d.y, mouse.gx, mouse.gy) <= circle_radius){
            clicked_element = true;
            active_node_id = d.id
        }
    }
    

    function drawTitle(x,y,d, color){
    
        var text = vocab[d.id].kanji 
        var text_width = (text.length + 0.5) * circle_radius;

        ctx.font = circle_radius * 2 + 'px'
        x += circle_radius * 0.0

        ctx.fillStyle = color;
        ctx.fillRect(x, y - circle_radius, text_width, 2 * circle_radius);
        ctx.fillStyle = color_text;
        ctx.fillText(text,x,y)
    }


    function drawTextRect(d, color){
        

        var rect = calculateTextRect(d.x,d.y,d)
        
        if (!mouseInRect(rect[0],rect[1],rect[2], rect[3])){
            ctx.globalAlpha = 0.5 + 0.5 * (active_connected_nodes.indexOf(d) + 1) / active_connected_nodes.length;
        }
        ctx.fillStyle = color;
        ctx.fillRect(rect[0],rect[1],rect[2] - rect[0], rect[3] - rect[1]);
        ctx.globalAlpha = 1;
    }

    function drawText(d, color){
    


        var text = vocab[d.id].kanji 
        var text_width = (text.length + 0.5) * circle_radius;

        ctx.font = circle_radius * 2 + 'px'
        var x = d.x + circle_radius * 0.0
        var y = d.y

        ctx.fillStyle = color;
        ctx.fillRect(x, y - circle_radius, text_width, 2 * circle_radius);
        ctx.fillStyle = color_text;
        ctx.fillText(text,x,y)


        // hiragana
        text = vocab[d.id].hiragana 
        ctx.fillText(text,x,y + 2 * circle_radius)
        // meaning
        for (let i = 0; i < vocab[d.id].meaning.length; ++i){
            text = vocab[d.id].meaning[i]
            ctx.fillText(text,x,y + 2 * circle_radius * (2 + i))
        }
            
    }



    function mouseInRect(x_min, y_min, x_max, y_max){
        var m = x_min < mouse.gx && mouse.gx < x_max && y_min < mouse.gy && mouse.gy < y_max
        if (m){ 
            clicked_element = true;
        }
        return m
    }

    function drawPointHere(x,y,radius){ // Point
        return (screen.min_x - radius * 5 < x && x < screen.max_x + radius * 5 &&
                screen.min_y - radius * 5 < y && y < screen.max_y + radius * 5)
    }

    function drawLineHere(x0,y0,x1,y1){ // Line

        if (x0 < screen.min_x && x1 < screen.min_x ||
            y0 < screen.min_y && y1 < screen.min_y ||
            x0 > screen.max_x && x1 > screen.max_x ||
            y0 > screen.max_y && y1 > screen.max_y){
            return false;
        }
        return true
/*/
        if (screen.min_x < x0 && x0 < screen.max_x &&
            screen.min_y < y0 && y0 < screen.max_y ||
            screen.min_x < x1 && x1 < screen.max_x &&
            screen.min_y < y1 && y1 < screen.max_y){
            return true
        }
        return true
        /**/
    }

    function dToFrontActive(d){
        if (active_connected_nodes.indexOf(d) == active_connected_nodes.length-1){
            return
        }
        active_connected_nodes.splice(active_connected_nodes.indexOf(d),1) // remove the element
        active_connected_nodes.push(d)                                     // put it back in front
    }


    function calculateTextRect(x,y,d){

        var text_width = (vocab[d.id].kanji.length + 0.5) * circle_radius;

        for (let i = 0; i < vocab[d.id].meaning.length; ++i){
            text_width = Math.max(text_width, vocab[d.id].meaning[i].length)
        }


        var margin_left = circle_radius * 0.2

        var height = circle_radius * 2 * (vocab[d.id].meaning.length + 2)
        var width = Math.max(circle_radius * 7, text_width * circle_radius * 0.5) + margin_left

        var rect_x = x - margin_left
        var rect_y = y - circle_radius


        return [rect_x, rect_y, rect_x + width, rect_y + height]
    }


    function color_in_range(d){

        var n = Math.pow(vocab[d.id].connections/max_connections,0.2)
        n = vocab[d.id].connections/max_connections

        var r = (255 * Math.sqrt(n))
        var g = (255 * (1 - n/2))
        var b = 0

        return "rgb(" + r + "," + g + "," + b + ")";
    }



    function distace_point_point(x,y,x0,y0){
        return Math.sqrt(Math.pow(x-x0,2) + Math.pow(y-y0,2))
    }


    function distance_point_line(px, py, x0, y0, x1, y1){
        return Math.abs((x0-x1)*(y1-py) - (x1-px)*(y0-y1)) / Math.sqrt(Math.pow(x0-x1,2) + Math.pow(y0-y1,2))
    }


    function select_Line(){
        // if a black line has been selected, the camera moves to the point which is furthest and adds it to the active nodes

        var min_dist = 999999999999999999999;
        var center_x = 0.3
        var center_y = 0.3



        for (let i = 0; i < connected_nodes.length && null != active_node_element && shouldDraw(active_node_element); ++i){


            if (connected_nodes[i] != active_node_element && shouldDraw(connected_nodes[i])){
                
                var dist = distance_point_line(mouse.gx, mouse.gy, active_node_element.x, active_node_element.y, connected_nodes[i].x, connected_nodes[i].y)
                var inside_rect = pointInRect(mouse.gx, mouse.gy, active_node_element.x, active_node_element.y, connected_nodes[i].x, connected_nodes[i].y)

                if (dist < line_width_connected * 0.5 && dist < min_dist && inside_rect){

                    var dist_connected = distace_point_point(mouse.gx, mouse.gy, connected_nodes[i].x, connected_nodes[i].y)
                    var dist_active = distace_point_point(mouse.gx, mouse.gy, active_node_element.x, active_node_element.y)

                    animation.progress = 0 // new Animation starts 
                    animation.k = transform.k

                    animation.point0.x = -transform.x / transform.k
                    animation.point0.y = -transform.y / transform.k

                    //var connected_= distace_point_point(active_node_element.x , active_node_element.y,animation.point0.x,animation.point0.y);

                    if (dist_connected > dist_active){
                        // move to the connected node
                        animation.point1.x = connected_nodes[i].x - (screen.max_x - screen.min_x) * center_x
                        animation.point1.y = connected_nodes[i].y - (screen.max_y - screen.min_y) * center_y
                        animation.d = connected_nodes[i]
                    }else{
                        // move to the original node
                        animation.point1.x = active_node_element.x - (screen.max_x - screen.min_x) * center_x
                        animation.point1.y = active_node_element.y - (screen.max_y - screen.min_y) * center_y
                        animation.d = active_node_element
                    }
                    //i = connected_nodes.length;
                    min_dist = Math.min(min_dist, dist)
                }
            }
        }

    }

    function pointInRect(px,py,x_min,y_min, x_max, y_max){

        if (x_min > x_max){
            var x_maxx = x_max
            x_max = x_min
            x_min = x_maxx
        }

        if (y_min > y_max){
            var y_maxx = y_max
            y_max = y_min
            y_min = y_maxx
        }
        return x_min < px && px < x_max && y_min < py && py < y_max
    }

    function updateAnimation(){
        
        var delta = 1/100;
        animation.progress = animation.progress + delta


        var anim_x = animation.point0.x + animation.progress * (animation.point1.x - animation.point0.x)
        var anim_y = animation.point0.y + animation.progress * (animation.point1.y - animation.point0.y)

        var new_pos = [anim_x * animation.k, anim_y * animation.k]

        transform.x = -new_pos[0] 
        transform.y = -new_pos[1] 

    }

    function getPointColor(d, color){

        if (connected_nodes.includes(d)){
            return color;
        }

        if (vocab[d.id].level == 1){
            return color_1
        } else if (vocab[d.id].level == 2){
            return color_2
        } else if (vocab[d.id].level == 3){
            return color_3
        } else  if (vocab[d.id].level == 4){
            return color_4
        }
    }

    function getLineColor(d0, d1,highlighted){


        //return blendColors(color_red, color_text, vocab[d0.id].colorline + vocab[d1.id].colorline)
/**/
        var value = (vocab[d0.id].colorline + vocab[d1.id].colorline)
        
        if (value < 0){
            value = 0
        }else if (1 < value){
            value = 1
        }

        if (highlighted == 0){
            // not highlighted
            ctx.globalAlpha = 0.1;
            return blendColors(color_blue, color_red, value)
        }else if (highlighted == 1){
            // highlighted
            ctx.globalAlpha = 1;
            return blendColors(color_blue, color_red, value)
            return color_black //blendColors(color_red, color_black, value)
        }
        /**/
    }

    function shouldDraw(d){

        var search_kanji = vocab[d.id].kanji.includes(searchterm)
        var search_romaji = vocab[d.id].romaji.includes(searchterm)
        var search_hiragana = vocab[d.id].hiragana.includes(searchterm)
        var search_meaning = false

        for (let i = 0; i < vocab[d.id].meaning.length; ++i){
            search_meaning = search_meaning || vocab[d.id].meaning[i].includes(searchterm)
        }

        search_kanji = search_kanji && (searchfilter == 0 || searchfilter == 1)
        search_hiragana = search_hiragana && (searchfilter == 0 || searchfilter == 2)
        search_romaji = search_romaji && (searchfilter == 0 || searchfilter == 2)
        search_meaning = search_meaning && (searchfilter == 0 || searchfilter == 3)


        var search = search_meaning || search_kanji || search_romaji || search_hiragana



        return (level_to_display == 0 || vocab[d.id].level == level_to_display) && search
    }

    // https://stackoverflow.com/questions/6367010/average-2-hex-colors-together-in-javascript
// blend two hex colors together by an amount
    function blendColors(colorA, colorB, amount) {
        //console.log(colorA)
        //console.log(amount)
        const [rA, gA, bA] = colorA.match(/\w\w/g).map((c) => parseInt(c, 16));
        const [rB, gB, bB] = colorB.match(/\w\w/g).map((c) => parseInt(c, 16));
        const r = Math.round(rA + (rB - rA) * amount).toString(16).padStart(2, '0');
        const g = Math.round(gA + (gB - gA) * amount).toString(16).padStart(2, '0');
        const b = Math.round(bA + (bB - bA) * amount).toString(16).padStart(2, '0');
        //console.log("r " +r + " g " + g + " b " + b)
        return '#' + r + g + b;
    }

}







