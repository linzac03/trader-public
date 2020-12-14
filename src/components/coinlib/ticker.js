/**
 * 
 * This will house the ticker component that just wraps a websocket.
 *
 * Basically the goal with this is to maintain an up to date value of whatever currency I'm interested in
 * This data most likely gets piped into candles.js and ultimately will be the triggering value for opening and closing a trade.
 *
 */
import React, {useEffect, useState} from "react"
import { Link } from "gatsby"

const Ticker = ({client, productId, granularity}) => {  
  let [tick,setTick] = useState({data: {price: 0}, latestOpen: 0});

  useEffect(() => {
    const interval = setInterval(async () => {
        //const ticker = await client.rest.product.getProductTicker(productId);
        let ticker = await fetch("http://trader-logic-server.local:3000/ticker", 
          {
            method: 'GET', 
          }
        );
        ticker.json().then(data => {
          setTick(data);
        });
    }, granularity)
    
    return () => clearInterval(interval);
  })
  if (!tick || tick.error) return (<>Waiting...</>) 
  return ( 
		<div id={productId} >
			<span className="label">{productId}: </span>
			<span className="price">{tick.data.price} | Current Candle: {(((tick.data.price - tick.latestOpen) / tick.latestOpen) * 100).toFixed(2)}%</span>
		</div>
  )
}

export default Ticker;
