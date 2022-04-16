import express from 'express';
import { GasStation, getInstantPrices, getNames } from './lib';

const app = express();


type cacheType = {
    'instant': GasStation[],
    'names': string[]
}
const cache: cacheType = {
    'instant': [],
    'names': []
}

// DEBUG
app.get('/zip', (_:any, res:any) => {
    res.sendFile('/home/clement/Documents/Codes/JS/openfuel-serv/instant.zip');
})

app.get('/prices/instant', (_: any, res: any): void => {
    res.status(200).json(cache.instant);
})

app.get('/prices/', (_: any, res:any) => {
    res.status(200).json({
        'average': {
            'e10': 1
        },
        'max': {
            'e10': {
                'value': 0,
                'stationID': 0
            }
        },
        'min': {
            'e10': 1
        }
    });
})

app.get('/names', (_: any, res: any): void => {
    res.status(200).json(cache.names);
})

app.get('/cron/instant', async (_: any, res: any) => {
    const instant: GasStation[] = await getInstantPrices();

    if (instant.length > 0) {
        cache.instant = instant;
        // save to mongo
    }
    res.status(instant.length > 0 ? 200 : 500).send();
})

app.get('/cron/names', async (_: any, res: any) => {
    const names: string[] = await getNames();
    
    if (names.length > 0) {
        cache.names = names;
        // save to mongo
    }
    res.status(names.length > 0 ? 200 : 500).send();
})

app.listen(8080);