import React, {useEffect, useState} from "react"
import { Link } from "gatsby"

const Accounts = ({client,granularity}) => {

  let [accounts,setAccounts] = useState(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      let accounts = await fetch("http://trader-logic-server.local:3000/accounts",
        {
          method: 'GET'
        } 
      );
      accounts.json().then(data => {
        setAccounts(data);
      });
    }, granularity);
    return () => clearInterval(interval);
  });

  if (!accounts) return (<>Waiting...</>);
  if (accounts.error || !accounts.list) return (<>Waiting...</>);
  return (
    <div id="accounts">
      <h2 className="accounts-title">Accounts</h2>
      <ul className="accounts-list">
        { accounts.list.filter(account => account.available > 0 || ["BTC","USD"].includes(account.currency) ).map(account => {
            return (
              <li key={account.currency}>
                <span className="currency-label">{account.currency}: </span>
                <span className="currency-value">{account.available}/{account.balance}</span>
              </li>
            )
        }) }
      </ul>
      <div id="holding-value">
        <span className="label">BTC holding value: </span>
        <span className="currency-value">
          ${accounts.list.filter(account => account.currency == 'BTC')[0].balance * accounts.currentPrice}
        </span>
      </div>
    </div>
  )
}

export default Accounts;
