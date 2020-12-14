/**
 *
 * These functions are just for retrieving and displaying candle stick info
 * 
 * Things like:
 *   - Opening and closing prices
 *   - High/Low of an interval
 *   - Setting current interval to look at
 *
 */
import React, {useEffect, useState} from "react"
import { Link } from "gatsby"
import {Candle, CandleGranularity, ProductEvent} from 'coinbase-pro-node';
import {VictoryLine, VictoryTooltip, VictoryLabel, VictoryTheme, VictoryChart, VictoryAxis, VictoryCandlestick} from 'victory';

const WatchCandle = ({client, productId, granularity}) => {
  const [candles,setCandles] = useState([]);
  const [support,setSupport] = useState(0.00);
  const [resistance,setResistance] = useState(0.00);
  const [profit,setProfit] = useState(0.00);

  function interpolateCandleData(candle) {
    // [ time, low, high, open, close, volume ]
    let tmpCandle = {};
    tmpCandle.x = new Date(candle.openTimeInMillis);
    tmpCandle.low = candle.low;
    tmpCandle.high = candle.high;
    tmpCandle.open = candle.open;
    tmpCandle.close = candle.close;
    //tmpCandle.volume = candle[5];
    return tmpCandle;
  }

  useEffect(() => {
		async function setWatch() {
			let candles = await fetch("http://trader-logic-server.local:3000/candles");
			candles.json().then(data => {
        if (data && data.candles && data.candles.slice && data.lines) {
				  let interpolatedCandles = data.candles.map(interpolateCandleData)
			 	  setCandles(interpolatedCandles)
          setSupport(data.lines.support)
          setResistance(data.lines.resistance)
          setProfit(data.lines.profit)
        }
			});
		}
    const interval = setInterval(() => {
      setWatch()
    }, granularity);
    return () => clearInterval(interval);
  });
  VictoryTheme.grayscale.candlestick.candleColors = {
    positive: '#47ff8b',
    negative: '#ed3e3e'
  }
  VictoryTheme.grayscale.axis.style.axis.stroke = '#ffffff';
  VictoryTheme.grayscale.axis.style.axisLabel.fill = '#ffffff';
  VictoryTheme.grayscale.axis.style.tickLabels.fill = '#ffffff';
  VictoryTheme.grayscale.candlestick.style.data.stroke = '#969696';
  VictoryTheme.grayscale.candlestick.style.labels.fontSize = 12;
  VictoryTheme.grayscale.axis.style.grid = VictoryTheme.material.axis.style.grid
  VictoryTheme.grayscale.axis.style.grid.opacity = 0.5
  console.log(VictoryTheme.grayscale)
  console.log(VictoryTheme.material)
  const CustomTickLabel = (props) => {
    return <VictoryLabel {...props} style={{fontSize: 8}} />
  }
	const timeFormat = (t) => {
		let hours = t.getHours() < 10 ? '0' + t.getHours() : t.getHours();
		let minutes = t.getMinutes() < 10 ? '0' + t.getMinutes() : t.getMinutes();
		//return hours + ':' + minutes;
    return (t.getMonth() + 1) + '/' + t.getDate() 
	}
  return ((candles && candles.length) || candles.error) ? (
    <div className="candles"> 
			<VictoryChart
				theme={VictoryTheme.grayscale}
				//domain={{ y: [9500.00, 10000.00]}}
        domain={{x: [candles[0].x, candles[candles.length - 1].x]}}
        style={{fontSize: 8}}
				height={500}
        width={500}
				domainPadding={{ x: 8, y: 10 }}
				scale={{ x: 'time' }}
			>
				<VictoryAxis 
					axisLabelComponent={<CustomTickLabel />}
					tickFormat={timeFormat}
           
				/>      
				<VictoryAxis dependentAxis axisLabelComponent={<CustomTickLabel />} />
        <VictoryLine
          style={{ data: { stroke: "#57ff6d", opacity: 0.6 }}}
          y={() => profit} 
        />
        <VictoryLine
          style={{ data: { stroke: "#75aaff", opacity: 0.6 }}}
          y={() => resistance}
        />
        <VictoryLine
          style={{ data: { stroke: "#ff7a7a", opacity: 0.6 }}}
          y={() => support}
        />
				<VictoryCandlestick
					candleRatio={0.8}
					candleWidth={5}
					candleColors={{
						positive: '#47ff8b',
						negative: '#ed3e3e'
					}} 
					data={candles}
					closeLabels
					closeLabelComponent={<VictoryTooltip text={(data) => {
            return data.datum ? ((data.datum.close - data.datum.open) / data.datum.open * 100).toFixed(2) + '%\n' + data.datum.close : "0%"
          }} pointerLength={0} flyoutStyle={{fill: "black"}} />}
					events={[{
						target: "data",
						eventHandlers: {
							onMouseOver: () => ({
								target: "closeLabels", mutation: () => ({ active: true })
							}),
							onMouseOut: () => ({
								target: "closeLabels", mutation: () => ({ active: false })
							})
						}
					}]}
				/>
			</VictoryChart>
    </div>
  ) : (<>Loading...</>)
}

export default WatchCandle;
