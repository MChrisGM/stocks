var chart;
var STOCK;
let socket;

const GRAPH_LENGTH = 15;

const currency_formatter = new Intl.NumberFormat('en-US', {
    style: 'currency', 
    currency: 'USD'
  });

function update_stocks_div(stocks){

  let stocks_div = document.getElementById("stocks");
  let stock_info_div = document.getElementById("stock_info");
  let graph_div = document.getElementById("graph");
  let stock_actions_div = document.getElementById("stock_actions");
  
    stocks_div.innerHTML = '';
    for(let stock of stocks){
      let stock_tab = document.createElement("div");
      
      let seperator = document.createElement("hr");
      seperator.className = "item_seperator";
      stock_tab.className = "stock_item";

      let ticker = document.createElement("h3");
      ticker.innerText = stock.TKR;
      stock_tab.appendChild(ticker);
      
      stock_tab.addEventListener("click", function(){
        select_stock(stock.TKR);
      });
      stock_tab.appendChild(seperator);
      stocks_div.appendChild(stock_tab);
    }
  }

function update_stock_info_div(stock){

  let stocks_div = document.getElementById("stocks");
  let stock_info_div = document.getElementById("stock_info");
  let graph_div = document.getElementById("graph");
  let stock_actions_div = document.getElementById("stock_actions");
  
  stock_info_div.innerHTML = '';
  let stock_tab = document.createElement("div");

  let seperator = document.createElement("hr");
  seperator.className = "item_seperator";

  let ticker = document.createElement("h2");
  ticker.className = "stock_info_item";
  ticker.innerText = stock.TKR;

  let description = document.createElement("h5");
  description.className = "stock_info_item";
  description.innerHTML = "<strong>DESCRIPTION: </strong>"+stock.DES;

  let equity = document.createElement("h5");
  equity.className = "stock_info_item";
  equity.innerHTML = "<strong>EQUITY: </strong>"+currency_formatter.format(stock.EQT);
  
  stock_tab.appendChild(ticker);
  stock_tab.appendChild(seperator.cloneNode(true));
  stock_tab.appendChild(description);
  stock_tab.appendChild(seperator.cloneNode(true));
  stock_tab.appendChild(equity);
  stock_tab.appendChild(seperator.cloneNode(true));
  
  stock_info_div.appendChild(stock_tab);

  STOCK = stock;
  // console.log(stock);
  update_graph();
  
}

function tooltip(point) {
  var color = point.options('close') > point.options('open') ? 'green' : 'red';
  return (
    'Change: <span style="color:' +
    color +
    '">{%close-%open}</span><br>Open: %open<br/>High: %high<br/>Low: %low<br/>Close: %close'
  );
}

function getClose(){
  let data = {};
  let inline = "";
  for(let s in STOCK["HIS"]){
    data[STOCK["HIS"][s]["TS"]] = STOCK["HIS"][s]["CLOSE"];
    inline+=STOCK["HIS"][s]["TS"]+","+STOCK["HIS"][s]["CLOSE"]+'\n';
    console.log(STOCK["HIS"][s]["TS"]+","+STOCK["HIS"][s]["CLOSE"])
  }
  copy(inline);
  // console.log(data);
}

function graph_data(){
  let graph_points = [];
  let stock = STOCK;
  let his;
  
  if(stock.HIS){his = Object.values(stock.HIS);}else{his = [];}
  
  for(let point of his.slice(-GRAPH_LENGTH)){
    let p = [];
    p.push(new Date(point.TS));
    p.push(point.OPEN);
    p.push(point.HIGH);
    p.push(point.LOW);
    p.push(point.CLOSE);
    graph_points.push(p);
  }
  return graph_points
}

function update_graph(){

  let ticker = STOCK.TKR || "";
  let data = graph_data() || [];
  
  chart = JSC.chart('chartDiv', {
      debug: false,
      type: 'candlestick',
      palette: 'fiveColor18',
      legend: {
        template: '%icon %name',
        position: 'inside top left'
      },
      yAxis: {
        formatString: 'c',
        markers: []
      },
      xAxis_crosshair_enabled: true,
      defaultPoint: {
        outline_width: 0,
        altColor: '#ff4734',
        color: '#33ae5b',
        subvalue_line_color: '#555',
        tooltip: tooltip
      },
      xAxis_scale_type: 'time',
      series: [
        {
          name: ticker,
          points: data
        }
      ]
    });
  
}

function select_stock(ticker){
  socket.emit("getStock", {ticker:ticker, n:GRAPH_LENGTH});
}

window.onload = function(){
  socket = io(location.href);
  
  socket.on("stocks", function(stocks){
    update_stocks_div(stocks);
  });
  
  socket.on("returnStock", function(stock){
    update_stock_info_div(stock);
  });
  
}

document.addEventListener('DOMContentLoaded', function () {
	const resizable = function (resizer) {
		const direction = resizer.getAttribute('data-direction') || 'horizontal';
		const prevSibling = resizer.previousElementSibling;
		const nextSibling = resizer.nextElementSibling;

		let x = 0;
		let y = 0;
		let prevSiblingHeight = 0;
		let prevSiblingWidth = 0;

		const mouseDownHandler = function (e) {
			x = e.clientX;
			y = e.clientY;
			const rect = prevSibling.getBoundingClientRect();
			prevSiblingHeight = rect.height;
			prevSiblingWidth = rect.width;

			document.addEventListener('mousemove', mouseMoveHandler);
			document.addEventListener('mouseup', mouseUpHandler);
		};

		const mouseMoveHandler = function (e) {
			const dx = e.clientX - x;
			const dy = e.clientY - y;

			switch (direction) {
				case 'vertical':
					const h =
						((prevSiblingHeight + dy) * 100) /
						resizer.parentNode.getBoundingClientRect().height;
					prevSibling.style.height = `${h}%`;
					break;
				case 'horizontal':
				default:
					const w =
						((prevSiblingWidth + dx) * 100) / resizer.parentNode.getBoundingClientRect().width;
					prevSibling.style.width = `${w}%`;
					break;
			}

			const cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
			resizer.style.cursor = cursor;
			document.body.style.cursor = cursor;

			prevSibling.style.userSelect = 'none';
			prevSibling.style.pointerEvents = 'none';

			nextSibling.style.userSelect = 'none';
			nextSibling.style.pointerEvents = 'none';
		};

		const mouseUpHandler = function () {
			resizer.style.removeProperty('cursor');
			document.body.style.removeProperty('cursor');

			prevSibling.style.removeProperty('user-select');
			prevSibling.style.removeProperty('pointer-events');

			nextSibling.style.removeProperty('user-select');
			nextSibling.style.removeProperty('pointer-events');

			document.removeEventListener('mousemove', mouseMoveHandler);
			document.removeEventListener('mouseup', mouseUpHandler);
		};

		resizer.addEventListener('mousedown', mouseDownHandler);
	};

	document.querySelectorAll('.resizer').forEach(function (ele) {
		resizable(ele);
	});
});
