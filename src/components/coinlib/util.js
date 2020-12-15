/**
 *
 * This will house general utility functions.
 * Hopefully won't be using this too much, but for anything that would not otherwise be implemented somewhere else lands here.
 *
 */
import React, {useEffect, useState} from "react"
import { Link } from "gatsby"


const EstimateFee = () => {
  
}

export const CheckBuy = ({granularity}) => {  
  let [buyData,setBuyData] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
        //const ticker = await client.rest.product.getProductTicker(productId);
        let req = await fetch("http://trader-logic-server.local:3000/check-buy", 
          {
            method: 'GET', 
          }
        );
        req.json().then(data => {
          setBuyData(data);
        });
    }, granularity)
    
    return () => clearInterval(interval);
  })

/*
  return {
    buy: isBuy,
    uptrend: isUpwardTrend,
    areaOfValue: isAreaOfValue,
    entry: isEntry,
    highs: highs,
    lows: lows,
    support: lineOfSupportValue,
    supportThreshold: supportThreshold,
    supportDelta: lineOfSupportDelta,
    resistance: lineOfResistanceValue,
    currentPrice: curr.close,
    estimateFee: estimatedFee,
    accounts: accounts
  }
*/
  if (buyData && buyData.hasOwnProperty('buy') && !buyData.error) {
    let funds = 0.00;
    let holdingAccount = buyData.accounts.filter(account => account.balance > 0.0000001);
    if (!holdingAccount[0]) {
      return (<>Waiting...</>);
    }
    if (holdingAccount[0].currency == 'BTC') {
      funds = parseFloat(holdingAccount[0].balance) * buyData.currentPrice;
    } else if (holdingAccount[0].currency == 'USD') {
      funds = parseFloat(holdingAccount[0].balance);
    }
		return ( 
			<>
        <p><small>
          W/L: {buyData.wins}/{buyData.losses} ({buyData.losses ? ((buyData.wins / (buyData.wins + buyData.losses)) * 100).toFixed(2) : '100'}%)
        </small></p>
        <h2>Buy Data</h2>
        <div id="last-buy-price">
          <span className="label">Price at last buy: </span>
          <span className="price">{ buyData.priceAtLastBuy ? buyData.priceAtLastBuy : 'no active trade' }</span>
        </div>
				<div id="just-sold">
					<span className="label">Did we just sell?: </span>
					<span className="did-sell">{buyData.didntJustSell ? "No " : "Yes"}</span>
				</div>
				<div><span className="uptrend">Trend: </span>{buyData.uptrend ? "Up" : "Down"}</div>
				<div><span className="area-of-value">Area of value: </span>{buyData.areaOfValue ? "True" : "False"}</div>
				<div><span className="entry">Entry point: </span>{buyData.entry ? "Good" : "No good"}</div>
				<div id="check-buy">
					<span className="label">Do buy: </span>
					<span className="is-buy">{buyData.buy ? "True " : "False "}</span>
				</div>
				<div id="buy-data">
          <div>
            <span className="label">Fee on current entry: </span>{buyData.estimatedFee.totalFee.slice(0,4)}
          </div> 
					<div>
            <span className="profit-point">Profit Point: </span>
            {(buyData.profitPoint * 100).toFixed(4)}% | 
            ${((buyData.profitPoint * buyData.currentPrice) + buyData.currentPrice).toFixed(2)} |
            ${buyData.projectedExit.toFixed(2)}
          </div>
					<div>
            <span className="label">H1: </span>{buyData.highs.high1.close} 
            <span className="label"> H2: </span>{buyData.highs.high2.close}
          </div>
					<div>
            <span className="label">L1: </span>{buyData.lows.low1.close} 
            <span className="label"> L2: </span>{buyData.lows.low2.close}
          </div>
					<div><span className="resistance">Resistance Line: </span>{buyData.resistance.toFixed(2)}</div>
					<div><span className="resistance">Resistance Theta: </span>{buyData.resistanceTheta.toFixed(2)}</div>
					<div><span className="support">Support Theta: </span>{buyData.supportTheta.toFixed(2)}</div>
					<div><span className="support">Support Line: </span>{buyData.support.toFixed(2)}</div>
					<div><span className="support-delta">Support Delta: </span>{buyData.supportDelta.toFixed(2)}</div>
					<div><span className="support-threshold">Support Threshold: </span>{buyData.supportThreshold.toFixed(2)}</div>
				</div>
			</>
		)
  }
  return <>Waiting...</>
}

