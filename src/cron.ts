const JSZip = require('jszip');
const nodeFetch = require('node-fetch');
const fs = require("fs");
const convert = require('xml-js');

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
        'openingDays': OpeningHour[],
    }
    'prices': Fuel[]
}

/**
 * Generic loading method
 * @param span time span. any of the following values: 'instantane' | 'jour' | 'annee'
 * @returns a zip file.
 */
const loadPrices = async (span: TimeSpan): Promise<string> => {
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
 * @returns prices in JSON format
 */
const loadInstantPrices = async (): Promise<string> => {
    return loadPrices('instantane');
}


/**
 * Unzip the file and extract a file named "PrixCarburants_*.csv"
 * @param zipData the raw data from the zip
 * @param span any value of: 'instantane' | 'jour' | 'annee'
 * @returns raw XML (unparsed).
 */
const getXML = async (zipData: string, span: TimeSpan): Promise<string> => {
    return (await JSZip.loadAsync(zipData))
        .file(`PrixCarburants_${span}.xml`)
        .async("string");
}


/**
 * check if key is valid before accessing
 * @param json 
 * @param key 
 * @returns 
 */
const getOr = (json: any, key: string): string => {
    if (json == undefined) return '--';
    return json.hasOwnProperty(key) ? json[key] : '--';
}


const _parseFuel =  (json: any): Fuel => {
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
    const rawJSON = convert.xml2json(xml, { compact: true, spaces: 4 });

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
            'hasAutomaton': getOr(getOr(station['horaires'], '_attributes'), 'automate-24-24') == '1',
            'position': {
                'lat': station['_attributes']['latitude']/100000,
                'lng': station['_attributes']['longitude']/100000
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


(async () => {
    const tmp = fs.readFileSync('./test/data/instant.zip');
    const stations = await _parseGasStation(await getXML(tmp, 'instantane'));
    console.log(JSON.stringify(stations.filter((station: GasStation) => {
        return station.id == 63300003
    }), undefined, 4));
})(); // station.id == 69800016 || 