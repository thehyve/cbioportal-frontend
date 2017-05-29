import $ from 'jquery';
import {ICivicGene, ICivicGeneData, ICivicVariant, ICivicVariantData} from "shared/model/Civic.ts";

type CivicAPIGene = {
    id: number;
    name: string;
    description: string;
    variants: Array<CivicAPIGeneVariant>;
    [propName: string]: any;
};

type CivicAPIGeneVariant = {
    name: string;
    id: number;
    [propName: string]: any; 
};

type CivicAPIVariant = {
    description: string;
    evidence_items: Array<Evidence>;
    [propName: string]: any;
};

type Evidence = {
    evidence_type: string;
    [propName: string]: any;
};

/**
 * Returns a map with the different types of evidence and the number of times that each evidence happens.
 */
function countEvidenceTypes(evidenceItems: Array<Evidence>): {[evidenceType: string]: number} {
    let evidence: {[evidenceType: string]: number} = {};
    evidenceItems.forEach(function (evidenceItem: Evidence) {
        let evidenceType = evidenceItem.evidence_type;
        if (evidence.hasOwnProperty(evidenceType)) {
            evidence[evidenceType] += 1;
        }
        else {
            evidence[evidenceType] = 1;
        }
    });
    return evidence;
};

/**
 * Returns a map with the different variant names and their variant id.
 */
function createVariantMap(variantArray: Array<CivicAPIGeneVariant>): {[variantName: string]: number} {
    let variantMap: {[variantName: string]: number} = {};
    if (variantArray && variantArray.length > 0) {
        variantArray.forEach(function(variant) {
            variantMap[variant.name] = variant.id;
        });
    }
    return variantMap;
};

/**
 * CIViC
 */
export default class CivicAPI {
  
      /**
       * Retrieves the gene entries for the ids given, if they are in the Civic API.
       */
       getCivicGenesBatch(ids: string): JQueryPromise<Array<ICivicGeneData>> {
        return $.ajax({
            type: 'GET',
            url: 'https://civic.genome.wustl.edu/api/genes/' + ids,
            dataType: 'json',
            data: {
                identifier_type: 'entrez_symbol'
            }
        }).then(function (response: CivicAPIGene | Array<CivicAPIGene>) {
            let result: Array<CivicAPIGene>;
            if (response instanceof Array) {
              result = response;
            } else {
              result = [response];
            }
            return result.map((record: CivicAPIGene) => ({
                id: record.id,
                name: record.name,
                description: record.description,
                url: 'https://civic.genome.wustl.edu/#/events/genes/'
                + record.id + '/summary',
                variants: createVariantMap(record.variants)
            }));
        }, function () {
            return [];
        });
    }
    
    /**
     * Returns a promise that resolves with the variants for parameters given.
     */
     getVariant(variantId: number, name: string, geneId: number): JQueryPromise<ICivicVariantData> {
        return $.ajax({
            type: 'GET',
            url: 'https://civic.genome.wustl.edu/api/variants/' + variantId,
            dataType: 'json'
            })
            .then(function (result: CivicAPIVariant) {
                // Aggregate evidence items per type
                return {
                    id: variantId,
                    name: name,
                    geneId: geneId,
                    description: result.description,
                    url: 'https://civic.genome.wustl.edu/#/events/genes/' + geneId +
                         '/summary/variants/' + variantId + '/summary#variant',
                    evidence: countEvidenceTypes(result.evidence_items)
                };
            });
    }
}