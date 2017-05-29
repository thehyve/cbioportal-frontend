import * as React from 'react';
import {If} from 'react-if';
import * as _ from "lodash";
import OncoKbEvidenceCache from "shared/cache/OncoKbEvidenceCache";
import OncokbPmidCache from "shared/cache/PmidCache";
import CancerHotspots from "shared/components/annotation/CancerHotspots";
import MyCancerGenome from "shared/components/annotation/MyCancerGenome";
import OncoKB from "shared/components/annotation/OncoKB";
import Civic from "shared/components/annotation/Civic";
import {IOncoKbData} from "shared/model/OncoKB";
import {IMyCancerGenomeData, IMyCancerGenome} from "shared/model/MyCancerGenome";
import {IHotspotData} from "shared/model/CancerHotspots";
import {Mutation} from "shared/api/generated/CBioPortalAPI";
import {IndicatorQueryResp, Query} from "shared/api/generated/OncoKbAPI";
import {generateQueryVariantId, generateQueryVariant} from "shared/lib/OncoKbUtils";
import {isHotspot, is3dHotspot} from "shared/lib/AnnotationUtils";
import {CivicAPI} from "shared/api/CivicAPI.ts";
import {ICivicVariant, ICivicData, ICivicInstance, ICivicGeneVariant, ICivicGeneData} from "shared/model/Civic.ts";

export interface IAnnotationColumnProps {
    enableOncoKb: boolean;
    enableMyCancerGenome: boolean;
    enableHotspot: boolean;
    enableCivic: boolean;
    hotspots?: IHotspotData;
    myCancerGenomeData?: IMyCancerGenomeData;
    oncoKbData?: IOncoKbData;
    oncoKbEvidenceCache?: OncoKbEvidenceCache;
    pmidCache?: OncokbPmidCache;
    civicData?: ICivicData;
    civicVariants?: ICivicVariant;
}

export interface IAnnotation {
    isHotspot: boolean;
    is3dHotspot: boolean;
    myCancerGenomeLinks: string[];
    oncoKbIndicator?: IndicatorQueryResp;
    civicInstance?: ICivicInstance | null;
    isCivicDisabled: boolean;
}

/**
 * @author Selcuk Onur Sumer
 */
export default class AnnotationColumnFormatter
{
    public static getData(rowData:Mutation[]|undefined,
                          hotspotsData?:IHotspotData,
                          myCancerGenomeData?:IMyCancerGenomeData,
                          oncoKbData?:IOncoKbData,
                          civicData?:ICivicData,
                          civicVariants?:ICivicVariant)
    {
        let value: IAnnotation;

        if (rowData) {
            const mutation = rowData[0];

            value = {
                oncoKbIndicator: oncoKbData ?
                    AnnotationColumnFormatter.getIndicatorData(mutation, oncoKbData) : undefined,
                civicInstance: civicData && civicVariants ?
                    AnnotationColumnFormatter.getCivicInstance(mutation, civicData, civicVariants) : undefined,
                isCivicDisabled: false,
                myCancerGenomeLinks: myCancerGenomeData ?
                    AnnotationColumnFormatter.getMyCancerGenomeLinks(mutation, myCancerGenomeData) : [],
                isHotspot: hotspotsData ?
                    isHotspot(mutation, hotspotsData.single) : false,
                is3dHotspot: hotspotsData ?
                    is3dHotspot(mutation, hotspotsData.clustered) : false
            };
        }
        else {
            value = {
                myCancerGenomeLinks: [],
                isHotspot: false,
                is3dHotspot: false,
                isCivicDisabled: false
            };
        }

        return value;
    }

    /**
     * Returns an ICivicInstance if the civicData and civicVariants have information about the gene and the mutation (variant) specified. Otherwise it returns null.
     */
    public static getCivicInstance(mutation:Mutation, civicData:ICivicData, civicVariants:ICivicVariant): ICivicInstance | null
    {
        let geneSymbol: string = mutation.gene.hugoGeneSymbol;
        let geneVariants: {[name: string]: ICivicGeneVariant} = civicVariants[geneSymbol];
        let geneEntry: ICivicGeneData = civicData[geneSymbol];
        let civicInstance = null;
        //Only search for matching Civic variants if the gene exists in the Civic API
        if (geneVariants) {
            civicInstance = {name: geneEntry.name,
                             description: geneEntry.description,
                             url: geneEntry.url,
                             variants: geneVariants,
                            }
        }

        return civicInstance;
    }
    
    public static getIndicatorData(mutation:Mutation, oncoKbData:IOncoKbData):IndicatorQueryResp
    {
        const id = generateQueryVariantId(mutation.gene.entrezGeneId,
            oncoKbData.sampleToTumorMap[mutation.sampleId],
            mutation.proteinChange,
            mutation.mutationType);

        return oncoKbData.indicatorMap[id];
    }

    public static getEvidenceQuery(mutation:Mutation, oncoKbData:IOncoKbData): Query
    {
        return generateQueryVariant(mutation.gene.entrezGeneId,
            oncoKbData.sampleToTumorMap[mutation.sampleId],
            mutation.proteinChange,
            mutation.mutationType,
            mutation.proteinPosStart,
            mutation.proteinPosEnd
        );
    }

    public static getMyCancerGenomeLinks(mutation:Mutation, myCancerGenomeData: IMyCancerGenomeData):string[] {
        const myCancerGenomes:IMyCancerGenome[]|null = myCancerGenomeData[mutation.gene.hugoGeneSymbol];
        let links:string[] = [];

        if (myCancerGenomes) {
            // further filtering required by alteration field
            links = AnnotationColumnFormatter.filterByAlteration(mutation, myCancerGenomes).map(
                (myCancerGenome:IMyCancerGenome) => myCancerGenome.linkHTML);
        }

        return links;
    }

    // TODO for now ignoring anything but protein change position, this needs to be improved!
    public static filterByAlteration(mutation:Mutation, myCancerGenomes:IMyCancerGenome[]):IMyCancerGenome[]
    {
        return myCancerGenomes.filter((myCancerGenome:IMyCancerGenome) => {
            const proteinChangeRegExp:RegExp = /^[A-Za-z][0-9]+[A-Za-z]/;
            const numericalRegExp:RegExp = /[0-9]+/;

            const matched = myCancerGenome.alteration.trim().match(proteinChangeRegExp);

            if (matched && mutation.proteinChange)
            {
                const mutationPos = mutation.proteinChange.match(numericalRegExp);
                const alterationPos = myCancerGenome.alteration.match(numericalRegExp);

                return (mutationPos && alterationPos && mutationPos[0] === alterationPos[0]);
            }

            return false;
        });
    }

    public static sortValue(data:Mutation[],
                            hotspotsData?:IHotspotData,
                            myCancerGenomeData?:IMyCancerGenomeData,
                            oncoKbData?:IOncoKbData,
                            civicData?: ICivicData,
                            civicVariants?: ICivicVariant):number[] {
        const annotationData:IAnnotation = AnnotationColumnFormatter.getData(
            data, hotspotsData, myCancerGenomeData, oncoKbData, civicData, civicVariants);

        return _.flatten([
            OncoKB.sortValue(annotationData.oncoKbIndicator),
            MyCancerGenome.sortValue(annotationData.myCancerGenomeLinks),
            CancerHotspots.sortValue(annotationData.isHotspot, annotationData.is3dHotspot),
            Civic.sortValue(annotationData.civicInstance)
        ]);
    }

    public static renderFunction(data:Mutation[], columnProps:IAnnotationColumnProps)
    {
        const annotation:IAnnotation = AnnotationColumnFormatter.getData(
            data, columnProps.hotspots,
            columnProps.myCancerGenomeData,
            columnProps.oncoKbData,
            columnProps.civicData,
            columnProps.civicVariants);

        let evidenceQuery:Query|undefined;

        if (columnProps.oncoKbData) {
            evidenceQuery = this.getEvidenceQuery(data[0], columnProps.oncoKbData);
        }

        return AnnotationColumnFormatter.mainContent(annotation,
            columnProps,
            columnProps.oncoKbEvidenceCache,
            evidenceQuery,
            columnProps.pmidCache);
    }

    public static mainContent(annotation:IAnnotation,
                              columnProps:IAnnotationColumnProps,
                              evidenceCache?: OncoKbEvidenceCache,
                              evidenceQuery?: Query,
                              pmidCache?:OncokbPmidCache)
    {
        return (
            <span>
                <If condition={columnProps.enableOncoKb || false}>
                    <OncoKB
                        indicator={annotation.oncoKbIndicator}
                        evidenceCache={evidenceCache}
                        evidenceQuery={evidenceQuery}
                        pmidCache={pmidCache}
                    />
                </If>
                <If condition={columnProps.enableMyCancerGenome || false}>
                    <MyCancerGenome
                        linksHTML={annotation.myCancerGenomeLinks}
                    />
                </If>
                <If condition={columnProps.enableHotspot || false}>
                    <CancerHotspots
                        isHotspot={annotation.isHotspot}
                        is3dHotspot={annotation.is3dHotspot}
                    />
                </If>
                <If condition={columnProps.enableCivic || false}>
                    <Civic
                        civicInstance={annotation.civicInstance}
                        isCivicDisabled={annotation.isCivicDisabled}
                    />
                </If>
            </span>
        );
    }
}
