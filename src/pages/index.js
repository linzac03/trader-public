import React, {useEffect, useState} from "react"
import { Link } from "gatsby"
import {Candle, CandleGranularity, ProductEvent} from 'coinbase-pro-node';
import CoinbaseApi from "../components/coinlib/coinbase"
import Ticker from "../components/coinlib/ticker" 
import WatchCandle from "../components/coinlib/candles" 
import Accounts from "../components/coinlib/accounts" 
import Orders, {Fills} from "../components/coinlib/orders" 
import {CheckBuy} from "../components/coinlib/util" 
import Layout from "../components/layout"
import Image from "../components/image"
import SEO from "../components/seo"
import moment from "moment"
import '../../node_modules/carbon-components/css/carbon-components.min.css'
import '../assets/scss/dashboard.scss'

const client = CoinbaseApi();

// set base values
const productId = 'BTC-USD';
const tickGranularity = 5000;
const checkBuyGranularity = 10000;
const candleGranularity = CandleGranularity.ONE_MINUTE;

const IndexPage = () => { 

  return (
		<Layout>
			<h1>Your Markets</h1>
      <div className="main">
				<span className="product-data inline-block">
					<Ticker client={client} granularity={tickGranularity} productId={productId} />
					<WatchCandle client={client} granularity={tickGranularity + 500} productId={productId} />
				</span>
				<span className="trade-data inline-block absolute">
					<Accounts client={client} granularity={tickGranularity * 4} />
          <CheckBuy granularity={checkBuyGranularity} />
          <Orders granularity={checkBuyGranularity} productId={productId}  />
          <Fills granularity={checkBuyGranularity} productId={productId}  />
				</span>
      </div>
		</Layout>
  )
}

export default IndexPage
