/**
 * check if key is valid before accessing
 * @param json 
 * @param key 
 * @returns 
 */
const _getOr = (json: any, key: string): string => {
    if (json == undefined) return '--';
    return json.hasOwnProperty(key) ? json[key] : '--';
}

export { _getOr };
