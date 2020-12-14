import {
  CoinbasePro, 
  OrderSide, 
  OrderType, 
  FeeUtil, 
  CandleGranularity} from 'coinbase-pro-node';
import moment from 'moment';

// Buy logic
// TODO: The current comments need to account for a margin of error
// it isn't always going to be the case that the lows on the line of support are going to be exactly equal
// need to also be aware of the timing I get the 7 days worth of candles, although I don't think the time difference will have a big effect
// ideally I'm able to program the whole buy and sell in one go here in checkBuy
export async function checkBuy(headers, orders, fills, accounts, candles, client) {
  //console.log(headers);

  if (!orders.data || !accounts.length || !candles.length) return {};
  let slicedCandles = candles.slice(candles.length - 24);
  const lows = lastLows(slicedCandles);
  const low1 = lows.low1;
  const low2 = lows.low2;

  const highs = lastHighs(slicedCandles);
  const high1 = highs.high1;
  const high2 = highs.high2;

  const lineOfSupportValue = calcSupportValue(low1.close, low2.close);
  const lineOfResistanceValue = calcResistanceValue(high1.close, high2.close);

  const curr = currCandle(slicedCandles); 
  const prev = prevCandle(slicedCandles);
  const tertiary = slicedCandles[slicedCandles.length - 3]


  const isUpwardTrend = low1.close >= low2.close;
  // previous candle / area of value check
  // if (
  //   prevCandle.open > prevCandle.close && 
  //   currCandle.open < currCandle.close && 
  //   highs.high1 > highs.high2 && 
  //   lows.low1.close > lows.low2.close
  // )

  const isAreaOfValue = 
       prev.open > prev.close && 
       curr.open < curr.close && 
       highs.high1.close >= highs.high2.close && 
       lows.low1.close >= lows.low2.close;

  // check entry condition
  // if (lineOfSupportValue <= supportThreshold && currCandle.close > currCandle.low)
  const supportThresholdValue = (((low1.low + low2.low)/(low1.close + low2.close)) * lineOfSupportValue);
  const lineOfSupportDelta = (lineOfSupportValue / ((low1.close + low2.close) / 2)) * lineOfSupportValue;
  const supportTheta = ((lineOfResistanceValue-lineOfSupportDelta)/2) + lineOfSupportValue;
  const resistanceTheta = ((lineOfResistanceValue - high1.open)/2) + lineOfSupportValue;
  const isEntry = 
    (
      curr.close > curr.low && 
      curr.close <= supportTheta &&
      curr.close >= lineOfSupportValue
    ) || 
    (      
      curr.close > curr.low && 
      curr.close > lineOfResistanceValue
    );

  // check for trend: are the lows moving up or down? (up = long trade, down = short trade) [ lastLowest > lastLastLowest ]
  // |_
  //   check for area of value: are we currently moving up? [ (prevCandle.close < prevCandle.open) && (currCandle.open < currCandle.close) ] 
  //    |_
  //      check for entry condition: are we on a line of support? [ isPreviousLow && (currCandle.close > currCandle.low) ]
  const profitPoint = checkSell(slicedCandles);

  // amount should be projected available funds for this buy divided by current price of BTC
	const sellFunds = (parseFloat(accounts.filter(account => account.currency === 'BTC')[0].balance) - 0.0000001).toFixed(7);
	const funds = (parseFloat(accounts.filter(account => account.currency === 'USD')[0].balance) - 0.01).toFixed(2);
  const amount = funds > 0.09 ? funds / curr.close : (sellFunds * curr.close) / curr.close;
  const feeTier = await client.rest.fee.getCurrentFees();
  const counter = 'USD';
  const estimatedFee = FeeUtil.estimateFee(amount, curr.close, OrderSide.BUY, OrderType.MARKET, feeTier, counter);
  const projectedExit = funds > 0.09 ? 
   ((profitPoint * (parseFloat(funds) - parseFloat(estimatedFee.totalFee))) + (parseFloat(funds) - parseFloat(estimatedFee.totalFee))) :
   ((profitPoint * ((parseFloat(sellFunds) * curr.close) - parseFloat(estimatedFee.totalFee))) + ((parseFloat(sellFunds) * curr.close) - parseFloat(estimatedFee.totalFee)));
  const isBuy = isUpwardTrend && isAreaOfValue && isEntry && parseFloat(funds) < projectedExit;
  const recentSellFillPrice = fills.data
    .filter(fill => fill.side == 'sell')
    .sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
    .pop();
  const prevSellOrder = await client.rest.order.getOrder(recentSellFillPrice.order_id);
  const didntJustSell = moment(recentSellFillPrice.created_at).add(3, 'h').isBefore(moment()); 

  let buys = fills.data.filter(order => order.side == 'buy');
  //let priceAtLastBuy = buys.length ? buys[0].price : null;
  let priceAtLastBuy;
  if (isBuy && funds > 10 && didntJustSell) {
    priceAtLastBuy = curr.close
    const buyOrder = {
      product_id: 'BTC-USD',
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      funds: funds
    };
    client.rest.order.placeOrder(buyOrder)
      .then(async (msg) => { 
        console.log("BUY SUCCESS", msg) 
      })
      .catch(error => { console.log("ERROR ON BUY", error) });
  } else if (orders.data && 
             !orders.data.filter(order => order.side == 'sell').length && funds < 10 &&
             projectedExit > (parseFloat(sellFunds) * curr.close)) { 
			const sellOrder = {
				product_id: 'BTC-USD',
				side: OrderSide.SELL,
				type: OrderType.LIMIT,
				stop: 'entry',
        stop_price: ((curr.close * profitPoint) + curr.close).toFixed(2),
				size: sellFunds
			};
      sellOrder.price = (parseFloat(sellOrder.stop_price) - (parseFloat(sellOrder.stop_price) * 0.000005)).toFixed(2);
			client.rest.order.placeOrder(sellOrder)
				.then(msg => { console.log("SELL SUCCESS", msg) })
        .catch(error => console.log("ERROR ON SELL", error)); 
  } else if (orders.data && orders.data.filter(order => order.side == 'sell').length) {
    // check for losing trade
    /*
    for (let i = 0; i < order.data; i++) {
      let currOrder = order.data[i];
      let currTradeValue = currOrder.size * curr.close;
      if (currTradeValue < prevFilleOrder.size) cancelAllOrders();
      // set lower bound limit trade
    }
    */
  }

  const ret = {
    buy: isBuy,
    uptrend: isUpwardTrend,
    areaOfValue: isAreaOfValue,
    entry: isEntry,
    highs: highs,
    lows: lows,
    support: lineOfSupportValue,
    supportThreshold: supportThresholdValue,
    supportDelta: lineOfSupportDelta,
    supportTheta: supportTheta,
    resistance: lineOfResistanceValue,
    resistanceTheta: resistanceTheta,
    profitPoint: profitPoint,
    currentPrice: curr.close,
    estimatedFee: estimatedFee,
    accounts: accounts,
    didntJustSell: didntJustSell,
    projectedExit: projectedExit,
    funds: funds,
    priceAtLastBuy: priceAtLastBuy
  };
  return ret;
}

export async function exitPosition(headers, orders, fills, accounts, candles, client) {
	const sellFunds = (parseFloat(accounts.filter(account => account.currency === 'BTC')[0].balance) - 0.0000001).toFixed(7);
	const sellOrder = {
		product_id: 'BTC-USD',
		side: OrderSide.SELL,
		type: OrderType.MARKET,
		size: sellFunds
	};
	client.rest.order.placeOrder(sellOrder)
		.then(msg => { console.log("SELL SUCCESS", msg) })
		.catch(error => console.log("ERROR ON SELL", error)); 
}

// Sell logic
export function checkSell(candles) {
  // check for trend: are the lows moving up or down? (up = long trade, down = short trade)
  // |_
  // | check for area of value: are we currently moving down?
  // |  |_
  // |    check for entry condition: are we on a line of resistance?
  // |_
  //   have we hit stop loss?
  // just make a stop limit sell at profit point
  // how to calc profit point??? 
  let pp = 0.00;
  let npp = 0.00;
  let currHigh = candles[candles.length - 1];
  let currLow = candles[candles.length - 1];
  let avgMoveSum = 0.00;
  let moves = 0;
  let setHigh = false;
  /*
  for (let i = candles.length-2; i >= 0; i--) {
    let itrCandle = candles[i];
    if (itrCandle.close >= currHigh.close && itrCandle.close > itrCandle.open) {
      currHigh = itrCandle;
      setHigh = true;
    } else if (itrCandle.close < currLow.close && itrCandle.close < itrCandle.open) {
      currLow = itrCandle;
    } else if (setHigh) {
      avgMoveSum += ( (currHigh.close - currLow.close) / currLow.close );
      moves++;
      setHigh = false;
    } 
  }
  */
  for (let candle of candles) {
    if (candle.close > candle.open) {
      pp += (candle.close - candle.open) / candle.close;
    } else {
      npp += (candle.close - candle.open) / candle.open;
    }
  }
  //pp = avgMoveSum / moves;
  return Math.abs(pp + npp);
}

export async function checkOrders(headers, client) {
  let orders = await client.rest.order.getOpenOrders();
  return orders;
}

export async function cancelOrders(headers, client) {
  let orders = await client.rest.order.cancelOpenOrders();
  return orders;
}

const calcSupportValue = (low1, low2) => {
  let movement;
  let supportThreshold = 0.05;
  let diff = Math.abs(low1 - low2);
  let declining = low1 < low2;
  if (declining) {
    movement = diff / low1;
  } else {
    movement = diff / low2;
  }
	if (movement <= supportThreshold) {
		return (low1 + low2) / 2;
	}
  if (declining) {
    return low1;
  }
  return low2;
}

const calcResistanceValue = (high1, high2) => {
  let movement;
  let resistanceThreshold = 0.05;
  let diff = Math.abs(high1 - high2);
  let declining = high1 < high2;
  if (declining) {
    movement = diff / high1;
  } else {
    movement = diff / high2;
  }
	if (movement <= resistanceThreshold) {
		return (high1 + high2) / 2;
	}
  if (declining) {
    return high1;
  }
  return high2;
}

const getTicker = async (client) => {
	 let ticker = await client.rest.product.getProductTicker('BTC-USD');
   return ticker;
}

const getThisWeeksCandles = async (client) => {
	return await client.rest.product.getCandles('BTC-USD', {
		end: moment().format(),
		granularity: CandleGranularity.ONE_HOUR,
		start: moment().subtract(7, 'days').format()
	})
}

const lastLowestFrom = (candle,candles) => {
  // currLow.close < itrCandle.close
  // currLow.open < itrCandle.open
  let currLow = {...candle};
  let hitCurr = false;
  let hitPosCandle = false;
  for (let i = candles.length-1; i >= 0; i--) {
    let itrCandle = {...candles[i]};
    if (hitCurr && hitPosCandle) {
      if (itrCandle.close != candle.close && 
          itrCandle.open > itrCandle.close && 
          !(
            itrCandle.open < currLow.open &&
            itrCandle.close > currLow.close 
          ) && 
          ((itrCandle.open - itrCandle.close)/itrCandle.open) > 0.0065) {
        currLow = {...itrCandle};
        break;
      } 
    }
    if (hitCurr && itrCandle.open < itrCandle.close) hitPosCandle = true;
    if (candle.close == itrCandle.close) hitCurr = true;
  }
  return currLow;
}

const lastHighestFrom = (candle,candles) => {
  let currHigh = {...candle};
  let hitCurr = false;
  let hitNegCandle = false;
  for (let i = candles.length-1; i >= 0; i--) {
    let itrCandle = {...candles[i]};
    if (hitCurr && hitNegCandle) {
      if (itrCandle.close != candle.close && 
          itrCandle.open < itrCandle.close &&
          !(
            itrCandle.open < currHigh.open &&
            itrCandle.close > currHigh.close 
          ) &&
          ((itrCandle.close - itrCandle.open)/itrCandle.open) > 0.0065) {
        currHigh = {...itrCandle};
        break;
      } 
    }
    if (hitCurr && itrCandle.open > itrCandle.close) hitNegCandle = true;
    if (candle.close == itrCandle.close) hitCurr = true;
  }
  return currHigh;
}

const currCandle = (candles) => {
  return candles[candles.length - 1];
}

const prevCandle = (candles) => {
  return candles[candles.length - 2];
}

const lastLows = (candles) => {
  let cCandle = currCandle(candles);
  
  let lastLow = lastLowestFrom(cCandle, candles);
  let lastLastLow = lastLowestFrom(lastLow, candles);

  return { low1: lastLow, low2: lastLastLow };
}

const lastHighs = (candles) => {
  let cCandle = currCandle(candles);
  
  let lastHigh = lastHighestFrom(cCandle, candles);
  let lastLastHigh = lastHighestFrom(lastHigh, candles);

  return { high1: lastHigh, high2: lastLastHigh };
}


