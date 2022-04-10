import { GasStation, TimeSpan, _getXML, _parseGasStation } from "./parser";


import nodeFetch from 'node-fetch';
import fs from 'fs';
// const nodeFetch = require('node-fetch');
// const fs = require("fs");






/**
 * Generic loading method
 * @param span time span. any of the following values: 'instantane' | 'jour' | 'annee'
 * @returns a zip file.
 */
const _loadPrices = async (span: TimeSpan): Promise<string> => {
    return (await fetch(`https://donnees.roulez-eco.fr/opendata/${span}`, {
        "credentials": "omit",
        'headers': {
            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:99.0) Gecko/20100101 Firefox/99.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-User": "?1",
            "Sec-GPC": "1"
        },
        "method": "GET",
        "mode": "cors",
    })).text();
}

/**
 * Load instant prices from government website
 * @returns Return a list of GasStations
 */
const getInstantPrices = async (): Promise<GasStation[]> => {
    return _parseGasStation(
        await _getXML(
            await _loadPrices('instantane'), 
            'instantane'
        )
    );
}




export { getInstantPrices };