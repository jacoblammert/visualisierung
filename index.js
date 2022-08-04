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

function findpairs(kanji,vocab){

    for (let i = 0; i < vocab.length; ++i){
        vocab[i].meaning = vocab[i].meaning.split(";")
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
      

      console.log("max connections")
      console.log(max_connections)
    drawNetwork(data,vocab);
}


function drawNetwork(data,vocab){

    // https://d3-graph-gallery.com/graph/network_basic.html - graph
    // https://observablehq.com/@john-guerra/force-directed-graph-with-link-highlighting - highlighting selected subgraph
    // https://bl.ocks.org/heybignick/3faf257bbbbc7743bb72310d03b86ee8 - text
    // https://observablehq.com/@severo/drag-zoom-canvas - zoom

    // https://observablehq.com/@grantcuster/using-three-js-for-2d-data-visualization - maybe zoom + lables

    var svg_width = 1500;
    var svg_height = 1000;

    var node_repulsion = -100;
    var circle_radius = 10;

    var transform = d3.zoomIdentity;

    var color_node = "#59b3a2";
    
    var color_link = "#aaa";
    var line_width = circle_radius * 0.25
    var color_link_connected = "black";
    var line_width_connected = circle_radius * 0.4
    
    var color_text_background = "grey";
    var color_text = "black";
    var color_active = "red";
    var color_connected = "orange";

    var clicked_element = false // if a circle has been clicked or not

    let mouse = Object()
    mouse.cx = 0 // mouse x in canvas space
    mouse.cy = 0 // mouse y in canvas space
    mouse.gx = 0 // mouse x in graph space
    mouse.gy = 0 // mouse y in graph space

    var view_mode_old = 0;
    var view_mode = 0;

    var active_node_id = -1 // id of the active node
    var active_node_element // active node
    var active_node_id_old = -2 // id of the active node
    var connected_nodes = [] // array with connected nodes

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
        if (0 <= animation.progress && animation.progress < 1){
            updateAnimation()
            render()
        }
      }
      var interval = setInterval(test, 10);




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
                        connected_nodes.push(d)
                        active_node_element = d;
                    }
                });/**/
                if (active_node_id != active_node_id_old){
                    active_connected_nodes = []
                    active_connected_nodes.push(active_node_element)
                }/**/
            }
            render()
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
            render()
        }
    })


    d3.select(ctx.canvas)
    .call(d3.zoom().scaleExtent([0.05, 40])
    .on("zoom", () => render())).on("dblclick.zoom", null);


        
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








        link.each(function(d) {
            // draws all grey lines
            var number = drawLine(d.source.x, d.source.y, d.target.x, d.target.y, color_link,d.source.id, d.target.id, line_width);
            
            if (1 == number){
                connected_nodes.push(d.source)
            }else if (0 == number){
                connected_nodes.push(d.target)
            }
        });
        // Black lines
        for (let i = 0; i < connected_nodes.length && null != active_node_element; ++i){
            // draws all black lines connected to the selected object
            drawLine(active_node_element.x, active_node_element.y, connected_nodes[i].x, connected_nodes[i].y, color_link_connected, -1, -1, line_width_connected);
        }

        active_node_id_old = active_node_id

     




        node.each(function(d){
            //console.log(d.connections)
            if (drawPointHere(d.x,d.y, circle_radius)){
                var color_range = color_in_range(d)
                drawPoint(d.x, d.y, color_range, circle_radius)
            }

        });

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




    function drawLine(x1, y1, x2, y2,color, id0, id1, line_width){
        

        if (id0 == active_node_id || id1 == active_node_id){
            
            if (active_node_id != active_node_id_old){
                if (id0 == active_node_id){
                    return 0
                }else{
                    return 1
                }
            }
        }
        
        if (drawLineHere(x1,y1,x2,y2,)){

            ctx.globalAlpha = 0.2;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = line_width
            ctx.moveTo(x1, y1);    
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            drawn_lines++;
        }
    }



    function drawActivePoints(){
        
        // nodes
        var color = color_connected
        for (let i = 0; i < connected_nodes.length; ++i){
            if (connected_nodes[i] == active_node_element){
                color = color_active
            }else{
                color = color_connected
            }
            drawPoint(connected_nodes[i].x,connected_nodes[i].y,color, circle_radius)
        }
        //console.log(view_mode)
        if (view_mode != 0){
            /**/
            for (let i = 0; i < connected_nodes.length; ++i){

                if (connected_nodes[i] == active_node_element){
                    color = color_active
                }else{
                    color = color_connected
                }

                drawText(connected_nodes[i].x,connected_nodes[i].y,connected_nodes[i], color, false)
        
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

                if (connected_nodes.includes(active_connected_nodes[i])){
                    if (active_connected_nodes[i] == active_node_element){
                        color = color_active
                    }else{
                        color = color_connected
                    }
                    drawPoint(active_connected_nodes[i].x,active_connected_nodes[i].y,color, circle_radius)
                    drawText(active_connected_nodes[i].x,active_connected_nodes[i].y,active_connected_nodes[i], color, true)
                }
            }
        }
        
            
    }


    function drawPoint(x,y,color,radius){
        
        ctx.beginPath();/**/
        ctx.arc(x, y, radius, 0, Math.PI*2, false);
        /*/        
        ctx.rect(x - circle_radius,y - circle_radius,2*circle_radius,2*circle_radius);
        /**/

         
        ctx.fillStyle = color;
        ctx.fill();
        drawn_points++
        
    }

    function findActive(d){
        // checks if a not yet connected node has been selected 
        

        if (distace_point_point(d.x ,d.y, mouse.gx, mouse.gy) <= circle_radius){
            
            clicked_element = true;

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
            if (active_node_id == active_node_id_old){
                view_mode = (view_mode + 1) % 3;
            }else {
                //view_mode = 0;
            }
        }
    }

    function findNewActive(d){
        if (distace_point_point(d.x, d.y, mouse.gx, mouse.gy) <= circle_radius){
            clicked_element = true;
            active_node_id = d.id
        }
    }
    



    function drawText(x,y,d, color, active){
    
        var text = vocab[d.id].kanji 
        var text_width = (text.length + 0.5) * circle_radius;

        var draw_text = active && view_mode == 2


        // Red background text
        if (draw_text){

            var rect = calculateTextRect(x,y,d)


            if (!mouseInRect(rect[0],rect[1],rect[2], rect[3])){
                ctx.globalAlpha = 0.5 + 0.5 * (active_connected_nodes.indexOf(d) + 1) / active_connected_nodes.length;
            }
            ctx.fillStyle = color;
            ctx.fillRect(rect[0],rect[1],rect[2] - rect[0], rect[3] - rect[1]);
            ctx.globalAlpha = 1;
        }


        ctx.font = circle_radius * 2 + 'px'
        x += circle_radius * 0.0

        ctx.fillStyle = color;
        ctx.fillRect(x, y - circle_radius, text_width, 2 * circle_radius);
        ctx.fillStyle = color_text;
        ctx.fillText(text,x,y)

        // hiragana + meaning
        if (draw_text){
            
            text = vocab[d.id].hiragana 
            ctx.fillText(text,x,y + 2 * circle_radius)
            for (let i = 0; i < vocab[d.id].meaning.length; ++i){
                text = vocab[d.id].meaning[i]
                ctx.fillText(text,x,y + 2 * circle_radius * (2 + i))
            }
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

        for (let i = 0; i < connected_nodes.length && null != active_node_element; ++i){
            if (connected_nodes[i] != active_node_element){
                var dist = distance_point_line(mouse.gx, mouse.gy, active_node_element.x, active_node_element.y, connected_nodes[i].x, connected_nodes[i].y)

                var inside_rect = pointInRect(mouse.gx, mouse.gy, active_node_element.x, active_node_element.y, connected_nodes[i].x, connected_nodes[i].y)

                if (dist < line_width_connected * 0.5 && dist < min_dist && inside_rect){

                    var dist_connected = distace_point_point(mouse.gx, mouse.gy, connected_nodes[i].x, connected_nodes[i].y)
                    var dist_active = distace_point_point(mouse.gx, mouse.gy, active_node_element.x, active_node_element.y)

                    animation.progress = 0 // new Animation starts 

                    animation.point0.x = -transform.x / transform.k
                    animation.point0.y = -transform.y / transform.k

                    //var connected_= distace_point_point(active_node_element.x , active_node_element.y,animation.point0.x,animation.point0.y);

                    if (dist_connected > dist_active){
                        // move to the connected node
                        animation.point1.x = connected_nodes[i].x - (screen.max_x - screen.min_x) * 0.5
                        animation.point1.y = connected_nodes[i].y - (screen.max_y - screen.min_y) * 0.5
                    }else{
                        // move to the original node
                        animation.point1.x = active_node_element.x - (screen.max_x - screen.min_x) * 0.5
                        animation.point1.y = active_node_element.y - (screen.max_y - screen.min_y) * 0.5
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

        var new_pos = [anim_x * transform.k, anim_y * transform.k]

        transform.x = -new_pos[0] 
        transform.y = -new_pos[1] 


    }


}







