import express from 'express';
import mongoose from 'mongoose';
import { GasStation, getInstantPrices, getNames } from './lib/index.js';

const app = express();
const mongo = await mongoose.connect('mongodb://root:root@localhost/admin');

const name = new mongoose.Schema({
    'id': Number,
    'name': String,
});


const GasStationSchema = new mongoose.Schema<GasStation>({
    'id': { type: Number, required: true },
    'ville': { type: String, required: true },
    'postal': { type: Number, required: true },
    'type': { type: String, required: true },
    'address': { type: String, required: true },
    'hasAutomaton': { type: Boolean, required: true },
    'position': { type: Object, required: true },
    'gatehouse': { type: Object, required: true },
    'prices': { type: [], required: true },
})
const GasStationModel = mongoose.model<GasStation>('GasStation', GasStationSchema);


type cacheType = {
    'instant': GasStation[],
    'names': object,
    'analytics': any
}
const cache: cacheType = {
    'instant': [],
    'analytics': {},
    'names': []
}

// DEBUG
app.get('/zip', (_: any, res: any) => {
    res.sendFile('/home/clement/Documents/Codes/JS/openfuel-serv/test/data/instant/instant.zip');
})

app.get('/prices/instant', (_: any, res: any): void => {
    res.status(200).json(cache.instant);
})

app.get('/prices/analytics', async (_: any, res: any) => {
    res.status(200).json(cache.analytics);
})

app.get('/names', (_: any, res: any): void => {
    res.status(200).json(cache.names);
})

app.get('/cron/instant', async (_: any, res: any) => {
    try {
        const instant: GasStation[] = await getInstantPrices();
        if (instant.length > 0) {
            cache.instant = instant;
            const instantModel = instant.map((s: GasStation) => {
                return new GasStationModel({
                    'address': s.address,
                    'id': s.id,
                    'hasAutomaton': s.hasAutomaton,
                    'position': s.position,
                    'postal': s.postal,
                    'prices': s.prices,
                    'ville': s.ville,
                    'type': s.type,
                    'gatehouse': s.gatehouse
                });
            });

            // calculate analytics based on price
            const analytics = await GasStationModel.aggregate([
                { $unwind: "$prices" },
                {
                    $group: {
                        _id: '$prices.fuelType',
                        min: { $min: '$prices.price' },
                        max: { $max: '$prices.price' },
                        avg: { $avg: '$prices.price' }
                    }
                }
            ]);

            // caching analytics
            for (let price of analytics) {
                cache.analytics[price['_id']] = {
                    'min': {
                        'price': price['min'],
                    },
                    'max': {
                        'price': price['max'],
                    },
                    'avg': price['avg'],
                };
            }

            // saving to mongoDB
            await GasStationModel.collection.drop();
            await GasStationModel.insertMany(instantModel);
        } else {
            res.status(instant.length > 0 ? 200 : 500).send();
        }
    } catch (e) {
        res.status(500).send({
            'message': e
        });
    }
})

app.get('/cron/names', async (_: any, res: any) => {
    cache.names = await getNames();
    res.status(200).send();
})

app.listen(8080);