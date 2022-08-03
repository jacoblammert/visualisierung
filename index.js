import * as d3 from "d3";
import { text } from "d3";
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
    var line_width_black = circle_radius * 0.4
    var line_width_grey = circle_radius * 0.25
    
    var color_text_background = "grey";
    var color_text = "black";
    var color_active = "red";
    var color_connected = "orange";

    let mouse_x = 0
    let mouse_y = 0

    var view_mode = 0;

    var active_node_id = -1 // id of the active node
    var active_node_element // active node
    var active_node_id_old = -2 // id of the active node
    var connected_nodes = [] // array with connected nodes

    var min_x = 0
    var min_y = 0
    var max_x = 0
    var max_y = 0

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
              //.attr("color",color_node)
              .links(data.links)                                    // and this the list of links
        )
        .force("charge", d3.forceManyBody().strength(node_repulsion))         // This adds repulsion between nodes. Play with the -400 for the repulsion strength
        .force("center", d3.forceCenter(svg_width / 2, svg_height / 2))     // This force attracts nodes to the center of the svg area
        .on("tick", render);


    

    function getMousePos(canvas, e){
        var rect = canvas.getBoundingClientRect()
        return {x: e.clientX - rect.left, y: e.clientY - rect.top}
    }

    ctx.canvas.addEventListener('mousedown', function(e){

        var pos = getMousePos(this, e)
        mouse_x = pos.x
        mouse_y = pos.y
        
        var mx = (((mouse_x) - transform.x) / transform.k);
        var my = (((mouse_y) - transform.y) / transform.k);

        if ( transform.k < 0.3){
            return
        }

        if (e.button == 0){

            // check if on a position in the text

            var selected_element = false;

            if (view_mode == 2){
                // Select text element?

            }
            if (!selected_element){
                // no text element was selected
                // has a new node been selected?
                node.each(function(d){

                    findActive(d,mx,my)
                
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
        }else{
            
            // Take over a connected node or select a new one

            node.each(function(d){

                findNewActive(d,mx,my)
            
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
                    active_connected_nodes.splice(active_connected_nodes.indexOf(active_node_element),1) // remove the element
                    active_connected_nodes.push(active_node_element)                                     // put it back in front
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






        min_x = ((0 - transform.x) / transform.k);
        min_y = ((0 - transform.y) / transform.k);

        max_x = ((svg_width - transform.x) / transform.k);
        max_y = ((svg_height - transform.y) / transform.k);








        link.each(function(d) {
            // draws all grey lines
            var number = drawLine(d.source.x, d.source.y, d.target.x, d.target.y, color_link,d.source.id, d.target.id, line_width_grey);
            
            if (1 == number){
                connected_nodes.push(d.source)
            }else if (0 == number){
                connected_nodes.push(d.target)
            }
        });
        // Black lines
        for (let i = 0; i < connected_nodes.length && null != active_node_element; ++i){
            // draws all black lines connected to the selected object
            drawLine(active_node_element.x, active_node_element.y, connected_nodes[i].x, connected_nodes[i].y, "black", -1, -1, line_width_black);
        }

        active_node_id_old = active_node_id

     




        node.each(function(d){
            //console.log(d.connections)
            if (drawPointHere(d.x,d.y, circle_radius)){
                drawPoint(d.x, d.y, color_node, circle_radius)
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

    function findActive(d,mx,my){
        // checks if a not yet connected node has been selected 
        if (Math.sqrt(Math.pow(d.x - mx,2)+ Math.pow(d.y - my,2)) <= circle_radius){
            
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

    function findNewActive(d,mx,my){

        if (Math.sqrt(Math.pow(d.x - mx,2)+ Math.pow(d.y - my,2)) <= circle_radius){
            
            active_node_id = d.id
        }
    }
    



    function drawText(x,y,d, color, active){
    
        var text = vocab[d.id].kanji 
        var text_width = (text.length + 0.5) * circle_radius;


        // Red background text
        if (active && view_mode == 2){

            text_width = 0

            for (let i = 0; i < vocab[d.id].meaning.length; ++i){
                text_width = Math.max(text_width, vocab[d.id].meaning[i].length)
            }


            var margin_left = circle_radius * 0.2

            var height = circle_radius * 2 * (vocab[d.id].meaning.length + 2)
            var width = Math.max(circle_radius * 7, text_width * circle_radius * 0.5) + margin_left

            ctx.fillStyle = color;
            ctx.fillRect(x - margin_left, y - circle_radius, width, height);
        }


        ctx.font = circle_radius * 2 + 'px'
        x += circle_radius * 0.0

        ctx.fillStyle = color;
        ctx.fillRect(x, y - circle_radius, text_width, 2 * circle_radius);
        ctx.fillStyle = color_text;
        ctx.fillText(text,x,y)

        // hiragana + meaning
        if (active && view_mode == 2){
            
            text = vocab[d.id].hiragana 
            ctx.fillText(text,x,y + 2 * circle_radius)
            for (let i = 0; i < vocab[d.id].meaning.length; ++i){
                text = vocab[d.id].meaning[i]
                ctx.fillText(text,x,y + 2 * circle_radius * (2 + i))
            }
        }

    }



    function drawPointHere(x,y,radius){ // Point
        return ( min_x - radius * 5 < x && x < max_x + radius * 5 &&
            min_y - radius * 5 < y && y < max_y + radius * 5)
    }

    function drawLineHere(x0,y0,x1,y1){ // Line

        if (x0 < min_x && x1 < min_x ||
            y0 < min_y && y1 < min_y ||
            x0 > max_x && x1 > max_x ||
            y0 > max_y && y1 > max_y){
            return false;
        }
        return true
/*/
        if (min_x < x0 && x0 < max_x &&
            min_y < y0 && y0 < max_y ||
            min_x < x1 && x1 < max_x &&
            min_y < y1 && y1 < max_y){
            return true
        }
        return true
        /**/
    }


}







