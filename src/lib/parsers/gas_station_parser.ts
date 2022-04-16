import _getOr from '../utils/getor.js';
// @ts-ignore
import converter from 'xml-js';
import { Unzipped, unzipSync } from 'fflate';
import iconvlite from 'iconv-lite';


// Types
type TimeSpan = 'instantane' | 'jour' | 'annee';

type Fuel = {
    'fuelType': 'Gazole' | 'SP95' | 'SP98' | 'GPLc' | 'E10' | 'E85',
    'price': number,
    'lastUpdated': string
}
type OpeningHour = {
    'opening': string,
    'closing': string,
}
type OpeningDay = {
    'day': string,
    'humanOpeningHours'?: string,
    'openingHours': OpeningHour[],
}
type GasStation = {
    'id': number,
    'ville': string,
    'postal': number,
    'type': 'autoroute' | 'route',
    'address': string,
    'name': string | undefined,
    'hasAutomaton': boolean,
    'position': {
        'lat': number,
        'lng': number
    },
    'gatehouse': {
        'openingDays': OpeningDay[],
    }
    'prices': Fuel[]
}


/**
 * Unzip the file and extract a file named "PrixCarburants_*.csv"
 * @param zipData the raw data from the zip
 * @param span any value of: 'instantane' | 'jour' | 'annee'
 * @returns raw XML (unparsed).
 */
const _getXML = async (zipData: Buffer): Promise<string> => {
    const uncompressed: Unzipped = unzipSync(zipData);
    const xmlByteArray: Uint8Array = uncompressed[Object.keys(uncompressed)[0]];
    return iconvlite.decode(Buffer.from(xmlByteArray), 'ISO-8859-1');
}

const _parseFuel = (json: any): Fuel => {
    return {
        'fuelType': json['_attributes']['nom'],
        'price': Number.parseFloat(json['_attributes']['valeur']),
        'lastUpdated': json['_attributes']['maj'],
    }
}

const _parseOpeningDay = (json: any): OpeningDay | undefined => {
    if (json['_attributes']['ferme'] == 1) {
        return undefined;
    }

    let openingDays = {
        'day': json['_attributes']['nom'],
        'humanOpeningHours': 'n/a',
        'openingHours': !Array.isArray(json['horaire'])
            ? [_parseOpeningHour(json['horaire'])]
            : json['horaire'].map((e: any) => {
                return _parseOpeningHour(e);
            })
    };

    if (openingDays.openingHours.length == 1) {
        openingDays['humanOpeningHours'] = `${openingDays.openingHours[0].opening} - ${openingDays.openingHours[0].closing}`;
    }

    if (openingDays.openingHours.length == 2) {
        openingDays['humanOpeningHours'] = `${openingDays.openingHours[0].opening} - ${openingDays.openingHours[0].closing} & ${openingDays.openingHours[1].opening} - ${openingDays.openingHours[1].closing}`;
    }

    return openingDays;
}

const _parseTime = (str: string): string => {
    return str.replace('.', 'h');
}

const _parseOpeningHour = (json: any): OpeningHour => {
    if (json == undefined) {
        return {
            'closing': 'n/a',
            'opening': 'n/a',
        }
    }
    return {
        'opening': _parseTime(json['_attributes']['ouverture']),
        'closing': _parseTime(json['_attributes']['fermeture'])
    };
}

const _parseGasStation = (xml: string): GasStation[] => {
    const rawJSON = converter.xml2json(xml, { compact: true, spaces: 4 });

    const json = JSON.parse(rawJSON);
    return json['pdv_liste']['pdv'].map((station: any): GasStation | undefined => {
        if (station['prix'] == undefined) return undefined;

        const openingDays: OpeningDay[] = ((station['horaires'] == undefined
            ? []
            : Array.isArray(station['horaires']['jour'])
                ? station['horaires']['jour'].map((fuel: any) => _parseOpeningDay(fuel))
                : [_parseOpeningDay(station['horaires']['jour'])])
            .filter((e: OpeningDay | undefined) => e != undefined) as OpeningDay[]);


        return {
            'id': Number.parseInt(station['_attributes']['id']),
            'ville': station['ville']['_text'] ?? '--',
            'postal': Number.parseInt(station['_attributes']['cp']),
            'type': station['_attributes']['pop'] == 'A' ? 'autoroute' : 'route',
            'address': station['adresse']['_text'] ?? '--',
            'name': station['name'] ?? undefined,
            'hasAutomaton': _getOr(_getOr(station['horaires'], '_attributes'), 'automate-24-24') == '1',
            'position': {
                'lat': station['_attributes']['latitude'] / 100000,
                'lng': station['_attributes']['longitude'] / 100000
            },
            'gatehouse': {
                'openingDays': openingDays,
            },
            'prices': Array.isArray(station['prix'])
                ? station['prix'].map((fuel: any) => {
                    return _parseFuel(fuel);
                })
                : [_parseFuel(station['prix'])]
        };
    }).filter((station: any) => station != undefined);
}


export type { TimeSpan, GasStation, OpeningHour, OpeningDay, Fuel }
export { _parseGasStation, _getXML };