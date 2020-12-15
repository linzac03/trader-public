# trader-public

public, semi-cleaned up, version of my crypto trader

I do not, in any way, make any promises about this being a profitable trader and take no responsibility for any use of this project

refer to [gatsby](https://www.gatsbyjs.com/docs/) and [node](https://nodejs.org/en/docs/guides/getting-started-guide/) to get started
I highly suggest familiarizing yourself with both gatsbyjs and nodejs

# commands I use:

`gatsby develop -H [my local hostname, see code]` or `gatsby build && gatsby serve -H [my local hostname, see code] -p 8000` -- this starts a frontend server for gatsby, this is the main dashboard for the app

`node -r esm app.js` -- this starts the server that interfaces with coinbase's API via [coinbase-pro-node](https://github.com/bennycode/coinbase-pro-node)

# how it works:

The gatsby frontend makes requests based on intervals (I'd like to migrate to websockets at some point) to the node server which then returns direct data from the coinbase API at most endpoints

However at `/check-buy` a function is called that checks whether a buy should happen, and subsequently what the sell price should be

This function is a rough estimate of how _I_ think about the market in short term and is no way validated in terms of any correctness/profitability

Another note, this is not meant to be public facing, this is purely meant as a locally facing application only
requests to `/cancel-open-orders` will cancel open orders which I'm sure any user would want control over, and as this application provides no frontend authentication currently I again advise against publicly hosting this thing

This is currently hardcoded in more than a few places as well, and will only work for the BTC-USD pairing

# This is a learning project, for learning and fun, because learning is fun

