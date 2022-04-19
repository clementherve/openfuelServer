import axios from 'axios';
import { readFileSync } from 'fs';
import { GasStation, TimeSpan, _getXML, _parseGasStation } from "./parsers/gas_station_parser.js";

/**
 * Generic loading method
 * @param span time span. any of the following values: 'instantane' | 'jour' | 'annee'
 * @returns a zip file.
 */
const _loadPrices = async (span: TimeSpan): Promise<Buffer> => {
    const response = (await axios({
        method: 'get',
        url: `https://donnees.roulez-eco.fr/opendata/${span}`,
        // url: `http://localhost:8080/zip`,
        responseType: 'arraybuffer',
        decompress: true,
        headers: {}
    }));

    return Buffer.from(response.data, 'base64');
}

/**
 * Load instant prices from government website
 * @returns Return a list of GasStations
 */
const getInstantPrices = async (): Promise<GasStation[]> => {
    return _parseGasStation(await _getXML(await _loadPrices('instantane')));
}

const getNames = async (): Promise<object> => {
    return JSON.parse(readFileSync('json/stations_names.json', 'utf-8'));
}

export { getInstantPrices, getNames };