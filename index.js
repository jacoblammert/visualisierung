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
      //console.log("data");
      //console.log(data)


      //console.log(linked_vocabs)
      //console.log("longest_chain:")
      //console.log(longest_chain)
      //console.log("data")
      //console.log(data)
      //console.log( "done")

      
    drawNetwork(data,vocab);
}


function drawNetwork(data,vocab){

    // https://d3-graph-gallery.com/graph/network_basic.html - graph
    // https://observablehq.com/@john-guerra/force-directed-graph-with-link-highlighting - highlighting selected subgraph
    // https://bl.ocks.org/heybignick/3faf257bbbbc7743bb72310d03b86ee8 - text
    // https://observablehq.com/@borowski-9ld/d3-force-directed-graph - zoom

    // https://observablehq.com/@grantcuster/using-three-js-for-2d-data-visualization - maybe zoom + lables

    var svg_width = 1000;
    var svg_height = 800;

    var node_repulsion = -100;
    var circle_radius = 10;

    var transform = d3.zoomIdentity;

    // set the dimensions and margins of the graph
    var margin = {top: 10, right: 30, bottom: 30, left: 40},
      width = svg_width - margin.left - margin.right,
      height = svg_height - margin.top - margin.bottom;
    
    // append the svg object to the body of the page
    var svg = d3.select("#network")/*/
    .append("svg")
      .attr("id","svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)/*/
    .append("canvas")
        .attr("id","canvas")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)/**/
    .append("g")
      .attr("id", "container")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
    

/**/
    var canvas = document.getElementById("canvas");

    console.log("canvas")
    console.log(canvas)

    var ctx = canvas.getContext('2d');
/**/


      // Initialize the links
      var link = svg
        .selectAll("line")
        .data(data.links)
        .enter()
        .append("line")
        .style("stroke", "#aaa")
    



      // Initialize the nodes
      var node = svg
        .selectAll("circle")
        .data(data.nodes)
        .enter()
        .append("circle")
        .attr("id", "circle")
        .attr("r", circle_radius)
        .style("fill", "#69b3a2")
        .on("mouseenter", (evt, d) => {
            link
              .attr("display", "none")
              .filter(l => l.source.id === d.id || l.target.id === d.id)
              .attr("display", "block");



              context.beginPath();    
    
                // start at point x=5 y=10      
                context.moveTo( d.x, d.y );     
                // create line from point x=5 y=10 to x=45 y=50     
                context.lineTo( l.x, l.y );     
                // draw path to canvas      
                context.stroke(); 
              ctx.fillStyle = 'red';
              ctx.fill();


        })
        .on("mouseleave", evt => {
            link.attr("display", "block");


            context.beginPath();    
    
            // start at point x=5 y=10      
            context.moveTo( 5, 10 );     
            // create line from point x=5 y=10 to x=45 y=50     
            context.lineTo( 45, 50 );     
            // draw path to canvas      
            context.stroke(); 
          ctx.fillStyle = 'red';
          ctx.fill();






        });


        var lables = node.append("text")
        .text(function(d) {
          return vocab[d.id].kanji;
        })
        .attr('x', 6)
        .attr('y', 3);
  
        node.append("title")
        .text(function(d) { return vocab[d.id].kanji; });





        const zoomRect = svg
        .append("rect")
        .attr("width", width * 2)
        .attr("height", height * 2)
        .style("fill", "none")
        .style("pointer-events", "all");
    
      const zoom = d3
        .zoom()
        .scaleExtent([0.1, 128])
        .on("zoom", zoomed);
    
      //ZOOM
      zoomRect.call(zoom).call(zoom.translateTo, svg_width / 2, svg_height / 2);
    
      //ZOOM
      

      function zoomed() {
        //d3.event.transform
        transform = d3.event.transform;
        node.attr("transform", d3.event.transform);
        link.attr("transform", d3.event.transform);
        lables.attr("transform", d3.event.transform);

        console.log("transform")
        console.log(d3.event.transform)
        
      node
      .attr("cx", function (d) { return d.x; })
      .attr("cy", function(d) {
     /**/
         ctx.beginPath();
         ctx.arc(d.x * d3.event.transform.k + d3.event.transform.x
             , d.y * d3.event.transform.k + d3.event.transform.y
             , circle_radius, 0, Math.PI*2, false);
         ctx.fillStyle = 'red';
         ctx.fill();
/**/
         return d.y; });
      }





      // Let's list the force we wanna apply on the network
      var simulation = d3.forceSimulation(data.nodes)                 // Force algorithm is applied to data.nodes
          .force("link", d3.forceLink()                               // This force provides links between nodes
                .id(function(d) { return d.id; })                     // This provides the id of a node
                .links(data.links)                                    // and this the list of links
          )
          .force("charge", d3.forceManyBody().strength(node_repulsion))         // This adds repulsion between nodes. Play with the -400 for the repulsion strength
          .force("center", d3.forceCenter(width / 2, height / 2))     // This force attracts nodes to the center of the svg area
          .on("end", ticked);
    
      // This function is run at each iteration of the force algorithm, updating the nodes position.
      function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
    
        node
             .attr("cx", function (d) { return d.x; })
             .attr("cy", function(d) {
                ctx.beginPath();
                ctx.arc(d.x * transform.k + transform.x
                    , d.y * transform.k + transform.y
                    , circle_radius, 0, Math.PI*2, false);
                ctx.fillStyle = 'red';
                ctx.fill();
                return d.y; });
      }
    





}







