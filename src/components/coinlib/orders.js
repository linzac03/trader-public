import React, {useEffect, useState} from "react"
import { Link } from "gatsby"
import moment from "moment"

const Orders = ({productId, granularity}) => {

  let [orders,setOrders] = useState(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      let fetchedOrders = await fetch("http://trader-logic-server.local:3000/orders",
        {
          method: 'GET'
        } 
      );
      fetchedOrders.json().then(data => {
        if (data) setOrders(data);
      });
    }, granularity);
    return () => clearInterval(interval);
  });

  if (!orders) return (<>Waiting...</>);
  if (orders.error || !orders.data) return (<>Waiting...</>);
  let orderData = orders.data;
  if (!orderData.map) return (<>Waiting...</>);
  const cancelOpenOrders = async (ev) => {
    let resp = await fetch("http://trader-logic-server.local:3000/cancel-open-orders",
      {
        method: 'GET'
      }
    );
    resp.json().then(data => {
      console.log(data);
    });
  }  

  return (
    <div id="orders">
      <span><h2 className="orders-title inline">Open Orders</h2></span>
      <span><button id="cancel-orders" onClick={cancelOpenOrders}>Cancel Orders and Exit Position</button></span>
			<ul className="orders-list">
				{ orderData.length ? orderData.map(order => {
						return (
							<li key={order.id}>
								<span className="order-side">{order.side}: </span>
								<span className="order-details"> 
                  {order.size}BTC @ ${parseFloat(order.stop_price).toFixed(2)} for ${parseFloat(order.price).toFixed(2)}
                </span>
							</li>
						)
				}) : <>no current orders</> }
			</ul>
    </div>
  )
}

export default Orders;

export const Fills = ({productId, granularity}) => {

  let [fills,setFills] = useState(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      let fetchedFills = await fetch("http://trader-logic-server.local:3000/fills",
        {
          method: 'GET'
        } 
      );
      fetchedFills.json().then(data => {
        if (data) setFills(data);
      });
    }, granularity);
    return () => clearInterval(interval);
  });

  if (!fills) return (<>Waiting...</>);
  if (fills.error || !fills.data) return (<>Waiting...</>);
  let fillData = fills.data;
  if (!fillData.map) return (<>Waiting...</>);

  return (
    <div id="fills">
      <span><h2 className="fills-title inline">Recent Fills</h2></span>
			<ul className="fills-list">
				{ fillData.length ? fillData.filter(fill => fill.side == 'sell').slice(0,5).map(fill => {
						return (
							<li key={fill.id}>
								<span className="fill-side">{moment(fill.created_at).format('MM/DD/YY HH:mm')} {fill.side}: </span>
								<span className="fill-details"> 
                  {fill.size}BTC @ ${parseFloat(fill.price).toFixed(2)}
                </span>
							</li>
						)
				}) : <>no sell fills</> }
			</ul>
    </div>
  )
}

