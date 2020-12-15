import {CoinbasePro, CandleGranularity} from 'coinbase-pro-node';
import {checkBuy, checkOrders, exitPosition} from './BuyLogic.js'
import moment from 'moment';
const http = require('http');
const fs = require('fs');

require('dotenv').config()

const hostname = 'trader-logic-server.local';
const port = 3000;
const sandboxAuth = {
  apiKey: process.env.REACT_APP_SANDBOX_API_KEY,
  apiSecret: process.env.REACT_APP_SANDBOX_API_SECRET,
  passphrase: process.env.REACT_APP_SANDBOX_PASSPHRASE
  // The Sandbox is for testing only and offers a subset of the       products/assets:
  // https://docs.pro.coinbase.com/#sandbox
  useSandbox: true,
}

const auth = {
  apiKey: process.env.REACT_APP_API_KEY,
  apiSecret: process.env.REACT_APP_API_SECRET,
  passphrase: process.env.REACT_APP_PASSPHRASE
}

const client = new CoinbasePro(sandboxAuth);
//const client = new CoinbasePro(auth);

client.rest.account.listAccounts().then(accounts => {
  const message = `You can trade "${accounts.length}" different pairs.`;
  console.log(message);
}).catch(error => console.log("ERROR ON INIT", error));

let reqQueue = [];
let orders = {};
let fills = {};
let accounts = [];
let candles = [];
let currentPrice = 0.00;
let priceAtLastBuy = 0.00;
let wins = 0;
let losses = 0;
let lineOfSupport = 0.00;
let lineOfResistance = 0.00;
let lineOfProfit = 0.00;

function handleExit(headers,res) {
	client.rest.order.cancelOpenOrders()
		.then(msg => { 
			exitPosition(headers,orders,fills,accounts,candles,client)
				.catch(error => console.log('ERROR ON EXIT POSITION: ', error));
			res.end(JSON.stringify(msg));
		}) 
		.catch(error => { 
			res.end(JSON.stringify({ error: error })) 
		});
}

function _getHandler(req, res) {
  const {url, headers} = req;
  switch(url) {
    case '/orders':
      client.rest.order.getOpenOrders()
        .then(msg => { 
          res.end(JSON.stringify(msg));
          orders = msg; 
        }) 
        .catch(error => { 
          res.end(JSON.stringify({ error: error })) 
        });
      break;
    case '/fills':
      client.rest.fill.getFillsByProductId('BTC-USD')
        .then(msg => { 
          res.end(JSON.stringify(msg));
          fills = msg; 
        }) 
        .catch(error => { 
          res.end(JSON.stringify({ error: error })) 
        });
      break;
    case '/cancel-open-orders':
      handleExit(headers,res);
      break;
    case '/check-buy':
      checkBuy(headers,orders,fills,accounts,candles,client)
        .then(resp => {
          if (resp.priceAtLastBuy) {
            priceAtLastBuy = resp.priceAtLastBuy 
          } else if (priceAtLastBuy) {
            //check current price against priceAtLastBuy
            //if price is lower than last buy, we're at a 1.5% loss, and the trend is down, then we sell and exit position
            if (priceAtLastBuy > resp.currentPrice && ((priceAtLastBuy - resp.currentPrice)/priceAtLastBuy) > 0.015 && !resp.upward) {
              handleExit(headers,res);
              resp.didntJustSell = true;
              priceAtLastBuy = null;
              losses++;
            } else if (priceAtLastBuy < resp.currentPrice && resp.accounts) {
               let btcBalance = resp.accounts.filter(account => account.currency == 'BTC')[0].balance;
               if ((btcBalance * resp.currentPrice) < 0.25) {
                 wins++;
                 priceAtLastBuy = null;
               }
            }
          } else {
            priceAtLastBuy = null;
          }
          lineOfSupport = resp.support
          lineOfResistance = resp.resistance
          lineOfProfit = ((resp.profitPoint * resp.currentPrice) + resp.currentPrice).toFixed(2)
          resp.wins = wins
          resp.losses = losses
          resp.priceAtLastBuy = resp.priceAtLastBuy ? resp.priceAtLastBuy : priceAtLastBuy
          let jsonString = JSON.stringify(resp)
					fs.writeFile('state.txt', jsonString, function(err, fd) {
						if (err) {
							return console.error(err);
						}
					}); 
          console.log(resp.priceAtLastBuy)
          res.end(JSON.stringify(resp)) 
        })
        .catch(error => { 
          console.log("ERROR IN CHECK BUY", error) 
          res.end() 
        });
      break;
    case '/accounts':
      client.rest.account.listAccounts()
        .then(msg => {
          if (msg.length) {
						let ret = { list: msg, currentPrice: currentPrice };
						res.end(JSON.stringify(ret));
						accounts = msg;
          }
        })
        .catch(error => { 
          res.end(JSON.stringify({ error: error })) 
        });
      break;
    case '/ticker':
      client.rest.product.getProductTicker('BTC-USD')
        .then(data => {
          let ret = { data: data, latestOpen: candles ? candles[candles.length - 1].open : 0.00 }; 
          res.end(JSON.stringify(ret));
          currentPrice = data.price;
        })
        .catch(error => { 
          res.end(JSON.stringify({ error: error })) 
        });
      break;
    case '/candles':
			client.rest.product.getCandles('BTC-USD', {
        end: moment().format(),
				granularity: CandleGranularity.SIX_HOURS,
        start: moment().subtract(14, 'days').format()
		  })
        .then(msg => {
          let ret = {lines: {support: lineOfSupport, resistance: lineOfResistance, profit: lineOfProfit}, candles: msg} 
          res.end(JSON.stringify(ret)); 
          candles = msg;
        })
        .catch(error => { 
          res.end(JSON.stringify({ error: error })) 
        });
      break;
    default: 
      res.end('This endpoint is unsupported');
  }
}

function _posthandler(req, res) {
  const {url, headers} = req;
}

const server = http.createServer((req, res) => {
 /*
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
 */
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', 'http://trader.local:8000');
  const {method, url, headers} = req;
  console.log(moment().format('LTS'));
  console.log(method, url);
  switch(method) {
    case 'GET':
      _getHandler(req,res);
      break;
    case 'POST':
      _postHandler(req,res);
      break;
    default:
      res.statusCode = 500;
      res.end('Method not supported');
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  fs.readFile("state.txt", function (err, data) {
    if (err) return
    let state = JSON.parse(data.toString()); 
		accounts = state.accounts ? state.accounts : accounts;
		currentPrice = state.currentPrice ? state.currentPrice : currentPrice;
		priceAtLastBuy = state.priceAtLastBuy ? state.priceAtLastBuy : priceAtLastBuy;
		wins = state.wins ? state.wins : wins;
		losses = state.losses ? state.losses : losses;
		lineOfSupport = state.lineOfSupport ? state.lineOfSupport : lineOfSupport;
		lineOfResistance = state.lineOfResistance ? state.lineOfResistance : lineOfResistance;
  })
});
