import React, { Component, useRef } from 'react';
import _ from 'lodash';
import { toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import {
    DataBinMethodConstants,
    GenericAssayChart,
    StudyViewPageStore,
} from 'pages/studyView/StudyViewPageStore';
import autobind from 'autobind-decorator';
import Select from 'react-select';
import ReactSelect from 'react-select1';
import singleCellStore, { SampleOption } from './SingleCellStore';
import {
    ChartMeta,
    ChartMetaDataTypeEnum,
    convertGenericAssayDataBinsToDataBins,
    DataBin,
    getHeightByDimension,
    getWidthByDimension,
} from 'pages/studyView/StudyViewUtils';
import internalClient from 'shared/api/cbioportalInternalClientInstance';
import client from 'shared/api/cbioportalClientInstance';
import {
    GenePanelDataMultipleStudyFilter,
    MolecularProfileFilter,
    GenericAssayMetaFilter,
    GenericAssayMeta,
    GenericAssayDataMultipleStudyFilter,
    GenericAssayFilter,
    MolecularProfile,
    GenericAssayData,
} from 'cbioportal-ts-api-client';
import PieChart from 'pages/studyView/charts/pieChart/PieChart';
import BarChart from './BarChart';
import StackedBarChart from './StackedBarChart';
import StackToolTip from './StackToolTip';
import PieToolTip from './PieToolTip';
import './styles.css';
import { selectable } from 'shared/components/query/styles/styles.module.scss';
import ComparisonScatterPlot from './ComparisonScatterPlot';
import BoxPlot from './BoxPlot';
import { observable, computed, action, makeObservable } from 'mobx';
import { Observer, observer } from 'mobx-react';
import LoadingIndicator from 'shared/components/loadingIndicator/LoadingIndicator';
import { remoteData } from 'cbioportal-frontend-commons';
import { isGenericAssaySelected } from './SingleCellTabUtils';
import { Sample } from 'cbioportal-ts-api-client/src';
import { ChartTypeEnum } from 'pages/studyView/StudyViewConfig';
export interface ISingleCellTabProps {
    store: StudyViewPageStore;
    genericAssayProfiles: any[];
    genericAssayData: { [profileID: string]: GenericAssayMeta[] } | undefined;
    sampleIds: Sample[];
    svgWidth: number;
    svgHeight: number;
    svgID: string;
}

interface Entity {
    stableId: string;
}

const PlotTypes = [
    { value: 'PieChart', label: 'Pie Chart' },
    { value: 'BoxPlotChart', label: 'Box Plot' },
    { value: 'HistogramChart', label: 'Histogram' },
];

enum ChartTypeSingleCellEnum {
    PIE_CHART = 'PieChart',
    BAR_CHART = 'BoxPlotChart',
    HISTOGRAM = 'HistogramChart',
}

interface Option {
    value: string;
    label: string;
    description: string;
    profileType: string;
    genericAssayType: string;
    dataType: string;
    genericAssayEntityId: string;
    patientLevel: boolean;
}
const jsondata = require('./jsonData/sample.json');
@observer
export default class SingleCellTab extends React.Component<
    ISingleCellTabProps,
    {}
> {
    @observable entityNames: string[];
    @observable molecularProfiles: Option[];
    @observable studyViewFilterFlag: boolean;
    @observable selectedEntity: Entity | null;
    @observable jsonDataLoading: boolean = true;
    @observable singleCellData: any = [];
    @observable tissueWithExpressionData: string[];
    @observable samplesWithExpressionData: string[];
    @observable selectedProfile: { label: string; value: string } | null = null;
    @observable selectedChart: { label: string; value: string } | null = null;
    @observable selectedMolecularProfile: string;

    constructor(props: ISingleCellTabProps) {
        super(props);
        makeObservable(this);
    }

    @action setSingleCellData() {
        this.singleCellData = jsondata;
        if (this.singleCellData != []) {
            this.jsonDataLoading = false;
        }
    }

    @computed get selectedSampleIds(): string[] {
        return this.props.store.selectedSamples.result.map(
            (sample: any) => sample.sampleId
        );
    }

    @computed get availableSingleCellTypes() {
        const genericAssays = this.props.genericAssayProfiles
            .filter(item => item.genericAssayType.includes('SINGLE_CELL_'))
            .map(item => ({
                value: item.genericAssayType,
                label: item.name,
            }));
        return genericAssays;
    }
    @computed get dataTypeSelected() {
        return this.selectedProfile !== null;
    }

    @action
    onProfileChange(profile: { label: string; value: string } | null): void {
        this.selectedProfile = profile;
    }

    @action
    onPlotTypeChange(type: { label: string; value: string } | null): void {
        this.selectedChart = type;
    }

    // Get the single cell data via generic assay
    readonly fetchSingleCellData = remoteData({
        invoke: async () => {
            if (!this.selectedProfile) {
                return Promise.resolve([]);
            } else {
                const singleCellData = await client.fetchGenericAssayDataInMolecularProfileUsingPOST(
                    {
                        molecularProfileId: this.selectedProfile.value,
                        genericAssayFilter: {
                            genericAssayStableIds: ['Astrocyte'],
                            sampleIds: this.props.sampleIds.map(
                                x => x.sampleId
                            ),
                        } as GenericAssayFilter,
                    }
                );
                console.log(singleCellData);
                return singleCellData;
            }
        },
    });

    @computed
    get chart() {
        // @ts-ignore
        switch (this.selectedChart.value) {
            case ChartTypeSingleCellEnum.PIE_CHART: {
                return () => (
                    <PieChart
                        width={500}
                        height={560}
                        ref={undefined}
                        onUserSelection={() => {}}
                        openComparisonPage={undefined}
                        filters={[]}
                        data={[
                            {
                                count: 10,
                                value: 'ten',
                                color: 'blue',
                                percentage: 10,
                                freq: 'test',
                            },
                            {
                                count: 50,
                                value: 'fifty',
                                color: 'blue',
                                percentage: 50,
                                freq: 'test2',
                            },
                            {
                                count: 100,
                                value: 'hundred',
                                color: 'blue',
                                percentage: 100,
                                freq: 'test',
                            },
                        ]}
                        placement={'right'}
                        label={'Type of cell'}
                        labelDescription={'dummy'}
                        patientAttribute={true}
                    />
                );
                break;
            }
            case ChartTypeSingleCellEnum.BAR_CHART: {
                return () => (
                    <PieChart
                        width={500}
                        height={560}
                        ref={undefined}
                        onUserSelection={() => {}}
                        openComparisonPage={undefined}
                        filters={[]}
                        data={[
                            {
                                count: 10,
                                value: 'ten',
                                color: 'blue',
                                percentage: 10,
                                freq: 'test',
                            },
                            {
                                count: 50,
                                value: 'fifty',
                                color: 'blue',
                                percentage: 50,
                                freq: 'test2',
                            },
                            {
                                count: 100,
                                value: 'hundred',
                                color: 'blue',
                                percentage: 100,
                                freq: 'test',
                            },
                        ]}
                        placement={'right'}
                        label={'Type of cell'}
                        labelDescription={'dummy'}
                        patientAttribute={true}
                    />
                );
            }
            case ChartTypeSingleCellEnum.HISTOGRAM: {
                return () => (
                    <PieChart
                        width={500}
                        height={560}
                        ref={undefined}
                        onUserSelection={() => {}}
                        openComparisonPage={undefined}
                        filters={[]}
                        data={[
                            {
                                count: 10,
                                value: 'ten',
                                color: 'blue',
                                percentage: 10,
                                freq: 'test',
                            },
                            {
                                count: 50,
                                value: 'fifty',
                                color: 'blue',
                                percentage: 50,
                                freq: 'test2',
                            },
                            {
                                count: 100,
                                value: 'hundred',
                                color: 'blue',
                                percentage: 100,
                                freq: 'test',
                            },
                        ]}
                        placement={'right'}
                        label={'Type of cell'}
                        labelDescription={'dummy'}
                        patientAttribute={true}
                    />
                );
            }
        }
        return [];
    }

    /*@computed getTissuesAndSamplesWithExpressionData(){
        let tmpTissueList:[]=[];
        let tmpSampleList:[]=[];
        /!*if(this.singleCellData!=undefined) {
            console.log(this.singleCellData);
            Object.entries(this.singleCellData).map((entry:any) => {
                tmpSampleList.push(entry[0]);
                tmpTissueList.push((Object.keys(entry[1])))
            })
            this.tissueWithExpressionData= [].concat(...tmpTissueList).filter((value, index, self) => self.indexOf(value) === index)
            this.samplesWithExpressionData=tmpSampleList;
            console.log(this.samplesWithExpressionData)
        }else{
            this.tissueWithExpressionData =[]
            this.samplesWithExpressionData = []*!/
        }
        this.tissueWithExpressionData =[]
        this.samplesWithExpressionData = []
    return []
    }*/

    render() {
        this.setSingleCellData();
        return (
            <div className="single-cell-data-container">
                <LoadingIndicator
                    isLoading={this.jsonDataLoading}
                    center={true}
                    size={'big'}
                />
                <div className="chart-configurations">
                    <div>
                        <label className="label-text">Data Type</label>
                        <div style={{ width: 300 }}>
                            <Select
                                className="basic-single"
                                name={'singleCellDataSelector'}
                                classNamePrefix={'selectSingleCellData'}
                                value={this.selectedProfile}
                                onChange={(option: any) =>
                                    this.onProfileChange(option)
                                }
                                options={this.availableSingleCellTypes}
                                searchable={false}
                                clearable={false}
                            />
                        </div>

                        {this.dataTypeSelected && (
                            <div>
                                <label className="label-text">Plot Type</label>
                                <div style={{ width: 300 }}>
                                    <Select
                                        className="basic-single"
                                        name={'selectPlotType'}
                                        classNamePrefix={'selectPlotType'}
                                        value={this.selectedChart}
                                        onChange={(option: any) =>
                                            this.onPlotTypeChange(option)
                                        }
                                        options={PlotTypes}
                                        searchable={false}
                                        clearable={false}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
