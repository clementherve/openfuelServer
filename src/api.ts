const express = require('express');
const app = express();

app.get('/stations/prices/instant', (req: any, res: any): void => {
    res.status(200).send('{"price": "0.00"}');
})


app.get('/stations/names', (req: any, res: any): void => {

})


app.listen(80, () => {

})