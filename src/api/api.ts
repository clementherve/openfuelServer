// const express = require('express');
// const app = express();

import { getInstantPrices } from "../cron/cron";


(async () => {
    await getInstantPrices();
    // const tmp = fs.readFileSync('./test/data/instant.zip');
    // const stations = await _parseGasStation(await _getXML(tmp, 'instantane'));
    
    // console.log(JSON.stringify(stations.filter((station: GasStation) => {
    //     return station.id == 63300003
    // }), undefined, 4));
})(); // station.id == 69800016 || 


// app.get('/stations/prices/instant', (req: any, res: any): void => {
//     res.status(200).send('{"price": "0.00"}');
// })


// app.get('/stations/names', (req: any, res: any): void => {

// })


// app.listen(80, () => {

// })