var Client = require('node-rest-client').Client;
var waitUntil = require('wait-until');
var fs = require('fs');

var client = new Client();

var pools_list = [];
const maxPages = 2;
const minTradingVolume = 500;
let k = 0;
let api_finished = false;

let date_ob = new Date();
// current date
// adjust 0 before single digit date
let date = ("0" + date_ob.getDate()).slice(-2);
// current month
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
// current year
let year = date_ob.getFullYear();
// current hours
let hours = ("0" + date_ob.getHours()).slice(-2);
// current minutes
let minutes = ("0" + date_ob.getMinutes()).slice(-2);
// current seconds
let seconds = ("0" + date_ob.getSeconds()).slice(-2);

// prints date & time in YYYY-MM-DD HH:MM:SS format
console.log(year + "-" + month + "-" + date + "-" + hours + "" + minutes + "" + seconds);

var fs_pools = fs.createWriteStream('pools-' + year + "-" + month + "-" + date + "-" + hours + "" + minutes + "" + seconds + '.csv', {
    flags: 'a' // 'a' means appending (old data will be preserved)
  });

for(let pageNum = 1; pageNum <= maxPages; pageNum ++){
    // https://eigenphi.io/api/v2/arbitrage/stat/lp/hotLp/?chain=ethereum&pageNum=1&pageSize=15&period=30&sortBy=volume
    client.get("https://eigenphi.io/api/v2/arbitrage/stat/lp/hotLp/?chain=ethereum&pageNum="+ pageNum + "&pageSize=1000&sortBy=volume", function (data, response) {
        // parsed response body as js object
        console.log("Got ", data.result.data.length, " Hot Pools.");    
        
        for(let i = 0 ; i < data.result.data.length; i++){
            if(data.result.data[i].tradingVolume > minTradingVolume && data.result.data[i].tokens.length == 2 && (data.result.data[i].tokens[0].symbol == 'WETH' || data.result.data[i].tokens[1].symbol == 'WETH')){
                k++;
                //console.log("########################### pool", k, "    tradingVolume = ", data.result.data[i].tradingVolume);
                /**
                {
                chain: { name: 'ethereum', id: 1, type: 'EVM' },
                lpAddress: '0x126b3e5bfe28244626d4b294a84c50d8a2297859',
                lpName: 'UniswapV3 LP',
                protocol: {
                    name: 'Uniswap V3',
                    icon: 'https://eigenphi.io/images/tokens/protocols/uniswap_v3.png',
                    website: 'https://info.uniswap.org/',
                    showName: 'Uniswap V3'
                },
                protocolIcon: 'https://eigenphi.io/images/tokens/protocols/uniswap_v3.png',
                tokens: [
                    {
                    address: '0xbe9375c6a420d2eeb258962efb95551a5b722803',
                    symbol: 'STMX',
                    decimals: 18
                    },
                    {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    symbol: 'WETH',
                    decimals: 18
                    }
                ],
                labelList: [ 'uniswap' ],
                tradingVolume: 28233.28010672631,
                changeRate: 55.79
                }
                **/

                // console.log(data.result.data[i]);
                pools_list.push(data.result.data[i]);
            }
        }

        if(pageNum == maxPages)
            api_finished = true;
    });
}

waitUntil()
    .interval(500)
    .times(10)
    .condition(function(cb) {
        process.nextTick(function() {
            cb(api_finished ? true : false);
        });
    })
    .done(function(result) {
        console.log("Got ", pools_list.length, " WETH Pools of Hot Pools.");    

        var paired_pools_list = [];
        for(let i = 0 ; i < pools_list.length; i++){
            let e = false;
            for(let j = 0; j < pools_list.length; j++){
                if(i != j){
                    if((pools_list[i].tokens[0].address == pools_list[j].tokens[0].address && pools_list[i].tokens[1].address == pools_list[j].tokens[1].address) ||
                    pools_list[i].tokens[0].address == pools_list[j].tokens[1].address && pools_list[i].tokens[1].address == pools_list[j].tokens[0].address){
                        e = true;
                    }
                }
            }
            if(e){
                paired_pools_list.push(pools_list[i]);
                console.log(paired_pools_list.length, "[" + pools_list[i].lpName + "]", pools_list[i].tokens[0].symbol + "/" + pools_list[i].tokens[1].symbol,"    \ttradingVolume = ", pools_list[i].tradingVolume);

                fs_pools.write(pools_list[i].lpName + ',' + 
                    pools_list[i].lpAddress + ',' +
                    pools_list[i].tokens[0].symbol + '/' + pools_list[i].tokens[1].symbol + "," + 
                    pools_list[i].tokens[0].symbol + ',' +
                    pools_list[i].tokens[0].decimals + ',' +
                    pools_list[i].tokens[0].address + ',' +
                    pools_list[i].tokens[1].symbol + ',' +
                    pools_list[i].tokens[1].decimals + ',' +
                    pools_list[i].tokens[1].address + '\n'
                    );
            }
        }

        console.log("Found ", paired_pools_list.length, " Pools");   
});






