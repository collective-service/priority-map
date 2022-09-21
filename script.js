const geodataUrl = 'world.json';

const dataURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSD2zLHZWMu29R-iWNMb_dAVAmPAIttvOl-31PP6TyrtKKCi5-LfGNbru8M15_s-holGrQF8jXTNDZG/pub?gid=0&single=true&output=csv";
const settingsURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSD2zLHZWMu29R-iWNMb_dAVAmPAIttvOl-31PP6TyrtKKCi5-LfGNbru8M15_s-holGrQF8jXTNDZG/pub?gid=1974885344&single=true&output=csv";

let geomData,
    prioritiesData,
    settings;
let legendEntries = [];


$(document).ready(function() {
    function getData() {
        Promise.all([
            d3.json(geodataUrl),
            d3.csv(dataURL),
            d3.csv(settingsURL),
        ]).then(function(data) {
            geomData = topojson.feature(data[0], data[0].objects.geom);

            prioritiesData = data[1];
            prioritiesData.forEach(element => {
                element.x = "0";
                element.y = "0";
                const interventions = splitMultiValues(element['Intervention type']);
                interventions.forEach(type => {
                    legendEntries.includes(type) ? null : legendEntries.push(type);
                });
            });

            prioritiesData = prioritiesData.filter(d => { return d.ISO3 != ''; });
            settings = data[2];

            //remove loader and show vis
            $('.loader').hide();
            $('#mainOfIframe').css('opacity', 1);


            initiateMap();
        }); // then
    } // getData

    getData();
});


function findOneValue(arrTest, arr) {
    return arr.some(function(v) {
        return arrTest.indexOf(v) >= 0;
    });
};

function splitMultiValues(arr, sep = ",") {
    const splitArr = arr.split(sep);
    var values = [];
    for (let index = 0; index < splitArr.length; index++) {
        values.push(splitArr[index]);
    }
    return values;
} //splitMultiValues

function updateLatLon(iso3, x, y) {
    for (let index = 0; index < prioritiesData.length; index++) {
        const element = prioritiesData[index];
        if (element.ISO3 == iso3) {
            element.x = x;
            element.y = y;
            break;
        }
    }

}

const isMobile = $(window).width() < 767 ? true : false;

const viewportWidth = window.innerWidth;
let currentZoom = 1;

const mapFillColor = '#001e3f', //00acee F9F871 294780 6077B5 001e3f
    mapInactive = '#001e3f',
    mapActive = '#D90368',
    hoverColor = '#D90368';

let g, mapsvg, projection, width, height, zoom, path, maptip;
let countriesISO3Arr = [];

function initiateMap() {
    width = document.getElementById("mainOfIframe").offsetWidth; //viewportWidth;
    height = (isMobile) ? 400 : 500;
    var mapScale = (isMobile) ? width / 5.2 : width / 10.1;
    var mapCenter = (isMobile) ? [12, 25] : [25, 25];
    projection = d3.geoMercator()
        .center(mapCenter)
        .scale(mapScale)
        .translate([width / 2.1, height / 1.9]);

    path = d3.geoPath().projection(projection);
    zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);


    mapsvg = d3.select('#map').append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", null);

    mapsvg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        // .attr("fill", "#d9d9d9");
        .attr("fill", "#1b365e"); //294780 //1b365e //cdd4d9
    // .attr("fill-opacity", "0.5");

    d3.select('#title').style('right', width / 2 + 'px');

    prioritiesData.forEach(element => {
        countriesISO3Arr.includes(element.ISO3) ? null : countriesISO3Arr.push(element.ISO3);
    });
    //map tooltips
    maptip = d3.select('#map').append('div').attr('class', 'd3-tip map-tip hidden');

    g = mapsvg.append("g"); //.attr('id', 'countries')
    g.selectAll("path")
        .data(geomData.features)
        .enter()
        .append("path")
        .attr('d', path)
        .attr('id', function(d) {
            return d.properties.ISO_A3;
        })
        .attr('class', function(d) {
            var className = (countriesISO3Arr.includes(d.properties.ISO_A3)) ? 'priority' : 'inactive';
            if (className == 'priority') {
                var centroid = path.centroid(d),
                    x = centroid[0],
                    y = centroid[1];
                updateLatLon(d.properties.ISO_A3, x, y);
            }
            return className;
        })
        .attr('fill', function(d) {
            return countriesISO3Arr.includes(d.properties.ISO_A3) ? mapFillColor : mapInactive;
        })
        .attr('stroke-width', 0.05)
        .attr('stroke', '#fff')
        .on("mousemove", function(d) {
            countriesISO3Arr.includes(d.properties.ISO_A3) ? mousemove(d) : null;
        })
        .on("mouseout", function(d) {

            maptip.classed('hidden', true);
        });
    // .on("click", function(d) {
    //     if (countriesISO3Arr.includes(d.properties.ISO_A3)) {
    //         const countryInfo = prioritiesData.filter((c) => { return c.iso3 == d.properties.ISO_A3 })[0];
    //         generateEmergencyInfo(countryInfo);
    //     }

    // });

    const circlesR = (isMobile) ? 2 : 4;
    const circles = g.append("g")
        .attr("class", "cercles")
        .selectAll(".cercle")
        .data(prioritiesData)
        .enter()
        .append("g")
        .append("circle")
        .attr("class", "cercle")
        .attr("r", function(d) {
            const numIntervention = splitMultiValues(d["Intervention type"]).length;
            return circlesR * numIntervention;
        })
        .attr("transform", function(d) {
            return "translate(" + [d.x, d.y] + ")";
        })
        .attr("fill", function(d) { return getColor(d["Intervention type"]); })
        .on("mousemove", function(d) {
            mousemove(d);
        })
        .on("mouseout", function() {
            maptip.classed('hidden', true);
        });
    // .on("click", function(d) {
    //     generateEmergencyInfo(d);
    //     g.selectAll("circle").attr('r', circlesR);
    //     $(this).attr('r', circlesR * 2);
    // });

    mapsvg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);

    //zoom controls
    d3.select("#zoom_in").on("click", function() {
        zoom.scaleBy(mapsvg.transition().duration(500), 1.5);
    });
    d3.select("#zoom_out").on("click", function() {
        zoom.scaleBy(mapsvg.transition().duration(500), 0.5);
    });

    var legendSVG = d3.select('#legend').append("svg")
        .attr("widht", "100%")
        .attr("height", "100%");

    d3.select('#worldwide').style("bottom", height / 2 + "px");

    var worldwideSVG = d3.select('#worldwide').append("svg")
        .attr("widht", "100%")
        .attr("height", "100%");

    const xcoord = 10;
    legendSVG.append("g")
        .selectAll("legend-item")
        .data(legendEntries)
        .enter()
        .append("circle").attr("r", 6)
        .attr("cx", xcoord)
        .attr("cy", function(d, i) {
            if (i == 0) {
                return xcoord;
            }
            return xcoord + i * 25;
        })
        .attr("fill", function(legend) { return getColor(legend); });
    legendSVG
        .select("g")
        .selectAll("text")
        .data(legendEntries).enter()
        .append("text")
        .attr("x", xcoord * 2)
        .attr("y", function(d, i) {
            if (i == 0) {
                return xcoord + 5;
            }
            return xcoord + 5 + i * 25;
        })
        .text(function(d) { return d; });


} //initiateMap

function mousemove(d) {
    var html = '<div class="survole">';
    var countryName = "",
        interventions,
        agencies;

    if (d.hasOwnProperty('properties')) {
        const arr = prioritiesData.filter((e) => { return e.ISO3 == d.properties.ISO_A3; });
        countryName = arr[0]["Country"];
        interventions = splitMultiValues(arr[0]["Intervention type"]);
        agencies = splitMultiValues(arr[0]["Agencies"]);

    } else {
        countryName = d["Country"];
        interventions = splitMultiValues(d["Intervention type"]);
        agencies = splitMultiValues(d["Agencies"]);
    }

    for (let index = 0; index < interventions.length; index++) {
        const intervention = interventions[index];
        html += '<button type="button" class="btn tag-intervention">' + intervention + '</button>';
    }
    html += '<h6>' + countryName + '</h6>';

    for (let index = 0; index < agencies.length; index++) {
        const agency = agencies[index];
        html += '<button type="button" class="btn tag-agency">' + agency + '</button>';
    }

    html += '</div>'
    var mouse = d3.mouse(mapsvg.node()).map(function(d) { return parseInt(d); });
    maptip
        .classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 5) + 'px; top:' + (mouse[1] + 10) + 'px')
        .html(html);
} //mousemove

// zoom on buttons click
function zoomed() {
    const { transform } = d3.event;
    currentZoom = transform.k;

    if (!isNaN(transform.k)) {
        g.attr("transform", transform);
        g.attr("stroke-width", 1 / transform.k);

        // updateCerclesMarkers()
    }
}


function getColor(type) {
    var color = '#C3C3C3';

    for (let index = 0; index < settings.length; index++) {
        const element = settings[index];
        element["Intervention type"] == type ? color = element["Legend Color"] : null;
        break;
    }
    return color;
}