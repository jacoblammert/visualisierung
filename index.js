import * as d3 from "d3";
import * as Papa from "papaparse"

// cmd to this folder then:
// npm install papaparse
// npm install d3@5
// npm run start 


var path_kanji = "data\\kanji.csv";
var path_vocab = "data\\vocab_small.csv";


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
                
                print(results1.data)
                print(results.data)

                findpairs(results.data, results1.data);

            }
        });
    }
});


function findpairs(kanji,vocab){



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
    //console.log(all_hiragana);



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

            for (let j = i + 1; j < vocab.length; j++) { //an element can (will) contain itself -> connection
                
                for (let k = 0; k < current_vocab.length; k++){

                    //console.log("current_vocab[k] i " + i + " j " + j + " k " + k);
                    //console.log(current_vocab[k]);
                    //console.log("vocab[j].kanji");
                    //console.log(vocab[j].kanji);

                    if (null != vocab[j].kanji){
                        if (vocab[j].kanji.includes(current_vocab[k]) && !all_hiragana.includes(current_vocab[k])){
                            //linked_vocab.push(vocab[j].kanji + " " + j);
                            linked_vocab.push(j);


                            var link = new Object();
                            link.source = i;
                            link.target = j;
                            list_links.push(link);

                            k = current_vocab.length; // dont need to check this jth word any more
                        }
                    }
                }
            }
        }

        if (longest_chain.length < linked_vocab.length){
            longest_chain = linked_vocab;
        }

        linked_vocabs.push(linked_vocab);
      }

      var data = new Object();
      data.nodes = list_nodes;
      data.links = list_links;
      
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


    let mouse_x = 0
    let mouse_y = 0


    var active_node = -1 // id of the active node
    var active_node_element // active node
    var active_node_old = -2 // id of the active node
    var connected_nodes = [] // array with connected nodes

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

        if (e.button == 0){
            var pos = getMousePos(this, e)
            mouse_x = pos.x
            mouse_y = pos.y
            
            var mx = (((mouse_x) - transform.x) / transform.k);
            var my = (((mouse_y) - transform.y) / transform.k);

            node.each(function(d){

                findactive(d.x,d.y,mx,my, d.id)
    
                if (d.id == active_node){
                    active_node_element = d;
                }
            });
            render()
        }
    })


    d3.select(ctx.canvas).call(d3
        .zoom()
        .scaleExtent([0.05, 2])
        .on("zoom", () => render()));

        
    function render(){

        transform = d3.zoomTransform(canvas);

        ctx.save();
        ctx.clearRect(0, 0, svg_width, svg_height);
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.k, transform.k);
        
        if (active_node_old != active_node){
            connected_nodes = []
        }

        link.each(function(d) {
            var number = drawLine(d.source.x, d.source.y, d.target.x, d.target.y, color_link,d.source.id, d.target.id);
            
            if (1 == number){
                connected_nodes.push(d.source)
            }else if (0 == number){
                connected_nodes.push(d.target)
            }
        });
        
        for (let i = 0; i < connected_nodes.length; ++i){
            drawLine(active_node_element.x, active_node_element.y, connected_nodes[i].x, connected_nodes[i].y, "black", -1, -1);
        }

        active_node_old = active_node

        var mx = (((mouse_x) - transform.x) / transform.k);
        var my = (((mouse_y) - transform.y) / transform.k);
        //console.log("xm: " + mx + " ym: " + my) // mouse position in point space


        node.each(function(d){
            drawPoint(d.x, d.y, color_node, d)
            

        });
        
        ctx.restore();
    }




    function drawLine(x1, y1, x2, y2,color, id0, id1){
        

        if (id0 == active_node || id1 == active_node){
            
            if (active_node != active_node_old){
                if (id0 == active_node){
                    return 0
                }else{
                    return 1
                }
            }
            return;
        }
        

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.moveTo(x1, y1);    
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    function drawPoint(x,y,color, d){

        ctx.beginPath();/**/
        ctx.arc(x, y, circle_radius, 0, Math.PI*2, false);
        /*/        
        ctx.rect(x - circle_radius,y - circle_radius,2*circle_radius,2*circle_radius);
        /**/

        if (connected_nodes.includes(d)){
            color = "orange"
        }else if (active_node == d.id){
            color = "red"
        }

        ctx.fillStyle = color;
        ctx.fill();
    }

    function findactive(x,y,mx,my, id){

        var dist = Math.sqrt( (x - mx) * (x - mx) + (y - my) * (y - my) )

        if (dist <= circle_radius){
            active_node = id
        }
    }
}







