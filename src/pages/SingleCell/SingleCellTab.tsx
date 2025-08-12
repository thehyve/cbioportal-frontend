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
import BarChart from 'pages/studyView/charts/barChart/BarChart';
import MultipleCategoryBarPlot from 'pages/groupComparison/MultipleCategoryBarPlot';
import StackedBarChart from './StackedBarChart';
import StackToolTip from './StackToolTip';
import PieToolTip from './PieToolTip';
import './styles.css';
import { selectable } from 'shared/components/query/styles/styles.module.scss';
import ComparisonScatterPlot from './ComparisonScatterPlot';
import BoxPlot from './BoxPlot';
import { observable, computed, action, makeObservable, toJS } from 'mobx';
import { Observer, observer } from 'mobx-react';
import LoadingIndicator from 'shared/components/loadingIndicator/LoadingIndicator';
import { remoteData } from 'cbioportal-frontend-commons';
import { isGenericAssaySelected } from './SingleCellTabUtils';
import { Sample } from 'cbioportal-ts-api-client/src';
import { ChartTypeEnum } from 'pages/studyView/StudyViewConfig';
import { PlotType } from 'shared/components/plots/PlotsTab';
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
    { value: 'StackedBarChart', label: 'Stacked Bar Chart' },
    { value: 'HistogramChart', label: 'Histogram' },
];

enum ChartTypeSingleCellEnum {
    PIE_CHART = 'PieChart',
    STACKED_BAR_CHART = 'StackedBarChart',
    BAR_CHART = 'HistogramChart',
}

enum EventKey {
    horz_logScale,
    vert_logScale,
    utilities_horizontalBars,
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

const testPieData = [
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
];

const testBarChartData: DataBin[] = [
    {
        id: 'bin1',
        count: 10,
        start: 0,
        end: 10,
        specialValue: 'normal',
    },
    {
        id: 'bin2',
        count: 50,
        start: 11,
        end: 20,
        specialValue: 'normal',
    },
    {
        id: 'bin3',
        count: 100,
        start: 21,
        end: 30,
        specialValue: 'normal',
    },
    {
        id: 'binNA',
        count: 20,
        specialValue: 'NA',
    },
];

const testhorzData = [
    {
        uniqueSampleKey: 'sample_001',
        value: 'Positive',
        // thresholdType: '>',
    },
    {
        uniqueSampleKey: 'sample_002',
        value: ['Negative', 'Borderline'],
        // thresholdType: '<',
    },
    {
        uniqueSampleKey: 'sample_003',
        value: 'Unknown',
        // thresholdType: '<',
    },
    {
        uniqueSampleKey: 'sample_004',
        value: ['High', 'Low'],
        // thresholdType: '>',
    },
];

const testvertData = [
    {
        uniqueSampleKey: 'sample_001',
        value: 'Positive',
        // thresholdType: '>',
    },
    {
        uniqueSampleKey: 'sample_002',
        value: ['Negative', 'Borderline'],
        // thresholdType: '<',
    },
    {
        uniqueSampleKey: 'sample_003',
        value: 'Unknown',
        // thresholdType: '<',
    },
    {
        uniqueSampleKey: 'sample_004',
        value: ['High', 'Low'],
        // thresholdType: '>',
    },
];

const testBarPlotData = [
    {
        minorCategory: 'Cell Type A',
        counts: [
            { majorCategory: 'Sample 1', count: 30, percentage: 30.0 },
            { majorCategory: 'Sample 2', count: 20, percentage: 25.0 },
            { majorCategory: 'Sample 3', count: 30, percentage: 37.5 },
        ],
    },
    {
        minorCategory: 'Cell Type B',
        counts: [
            { majorCategory: 'Sample 1', count: 10, percentage: 20.0 },
            { majorCategory: 'Sample 2', count: 25, percentage: 50.0 },
            { majorCategory: 'Sample 3', count: 15, percentage: 25.0 },
        ],
    },
    {
        minorCategory: 'Cell Type C',
        counts: [
            { majorCategory: 'Sample 1', count: 5, percentage: 50.0 },
            { majorCategory: 'Sample 2', count: 10, percentage: 25.0 },
            { majorCategory: 'Sample 3', count: 35, percentage: 37.5 },
        ],
    },
];

const categoryToColor: { [cat: string]: string } = {
    'Cell Type A': '#1f77b4',
    'Cell Type B': '#ff7f0e',
    'Cell Type C': '#2ca02c',
};

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
    @observable horizontalBars = false;
    @observable filterNA: boolean = true;

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

    @action.bound
    private onInputClick(event: React.MouseEvent<HTMLInputElement>) {
        switch (parseInt((event.target as HTMLInputElement).value, 10)) {
            case EventKey.utilities_horizontalBars:
                this.horizontalBars = !this.horizontalBars;
                break;
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

    @computed get getAxisXLabel() {
        if (this.horizontalBars) {
            return 'Sample Count';
        } else {
            return 'Sample Type';
        }
    }

    @computed get getAxisYLabel() {
        if (this.horizontalBars) {
            return 'Sample Type';
        } else {
            return 'Sample Count';
        }
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

    @action.bound
    private handleCheckboxChange() {
        this.filterNA = !this.filterNA;
    }

    @computed
    get chart() {
        // @ts-ignore
        if (!this.selectedChart) {
            return (
                <div className="alert alert-info" style={{ height: '32px' }}>
                    Please select a plot.
                </div>
            );
        }
        switch (this.selectedChart.value) {
            case ChartTypeSingleCellEnum.PIE_CHART: {
                return (
                    <div className="borderedChart posRelative">
                        <PieChart
                            width={500}
                            height={560}
                            ref={undefined}
                            onUserSelection={() => {}}
                            openComparisonPage={undefined}
                            filters={[]}
                            data={testPieData}
                            placement={'right'}
                            label={'Type of cell'}
                            labelDescription={'dummy'}
                            patientAttribute={true}
                            disableClickEvents={true}
                        />
                    </div>
                );
            }
            case ChartTypeSingleCellEnum.BAR_CHART: {
                return (
                    <div className="borderedChart posRelative">
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '10px',
                                marginTop: '10px',
                                textAlign: 'end',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={this.filterNA}
                                onChange={this.handleCheckboxChange}
                            />{' '}
                            Show NA values
                        </label>

                        <BarChart
                            data={testBarChartData}
                            width={500}
                            height={560}
                            filters={[]}
                            onUserSelection={() => {}}
                            showNAChecked={this.filterNA}
                            xAxisLabel={'Counts'}
                            yAxisLabel={'Number Of Samples'}
                            customLeftPadding={100}
                            customBottomPadding={100}
                        />
                    </div>
                );
            }
            case ChartTypeSingleCellEnum.STACKED_BAR_CHART: {
                return (
                    <div className="borderedChart posRelative">
                        <MultipleCategoryBarPlot
                            svgId={'testsvgId'}
                            domainPadding={10}
                            // horzData={testhorzData}
                            // vertData={testvertData}
                            plotData={testBarPlotData}
                            categoryToColor={categoryToColor}
                            barWidth={20}
                            chartBase={800}
                            horizontalBars={this.horizontalBars}
                            horzCategoryOrder={[
                                'Cell Type A',
                                'Cell Type B',
                                'Cell Type C',
                            ]}
                            vertCategoryOrder={[
                                'Sample 1',
                                'Sample 2',
                                'Sample 3',
                            ]}
                            // axisLabelX={this.getAxisXLabel}
                            // axisLabelY={this.getAxisYLabel}
                            legendLocationWidthThreshold={100}
                            percentage={true}
                            stacked={true}
                            ticksCount={5}
                            axisStyle={{
                                fontSize: '12px',
                                fontFamily: 'Arial',
                                fill: '#333',
                            }}
                            countAxisLabel={'Cell Counts'}
                            countName={'cell'}
                            tooltip={undefined}
                            svgRef={undefined}
                            // pValue={0.1}
                            // qValue={0.05}
                        />
                    </div>
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
            <div
                className="single-cell-data-container"
                style={{ display: 'flex' }}
            >
                <LoadingIndicator
                    isLoading={this.jsonDataLoading}
                    center={true}
                    size={'big'}
                />
                <div>
                    <div
                        className="plotsTab leftColumn axisBlock"
                        style={{
                            background: '#eee',
                            padding: '10px',
                            borderRadius: '4px',
                            minWidth: '300px',
                        }}
                    >
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
                                    <label className="label-text">
                                        Plot Type
                                    </label>
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
                            {this.dataTypeSelected &&
                                this.selectedChart?.value ==
                                    ChartTypeSingleCellEnum.STACKED_BAR_CHART && (
                                    <div>
                                        <label className="label-text">
                                            Filter samples
                                        </label>
                                        <Select
                                            className="Select"
                                            isClearable={true}
                                            isSearchable={true}
                                            value={toJS(['test1', 'test2'])}
                                            isMulti
                                            options={['test1', 'test2']}
                                            // onChange={(options: any[] | null) => {
                                            //     axisSelection.selectedCategories =
                                            //         options || [];
                                            // }}
                                        />
                                    </div>
                                )}
                        </div>
                    </div>
                    {this.selectedChart?.value ==
                        ChartTypeSingleCellEnum.STACKED_BAR_CHART && (
                        <div className="checkbox">
                            <label>
                                <input
                                    data-test="horizontalBars"
                                    type="checkbox"
                                    name="utilities_horizontalBars"
                                    value={EventKey.utilities_horizontalBars}
                                    checked={this.horizontalBars}
                                    onClick={this.onInputClick}
                                />{' '}
                                Horizontal Bars
                            </label>
                        </div>
                    )}
                </div>
                <div className={'chartArea'}>
                    <div
                        className="chartWrapper"
                        style={{ marginLeft: '10px' }}
                    >
                        {this.chart}
                    </div>
                </div>
            </div>
        );
    }
}
