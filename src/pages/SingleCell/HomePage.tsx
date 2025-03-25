import React, { Component, useRef } from 'react';
import _ from 'lodash';
import { toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import {
    DataBinMethodConstants,
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
    GenericAssayData,
} from 'cbioportal-ts-api-client';
import PieChart from './PieChart';
import BarChart from './BarChart';
import StackedBarChart from './StackedBarChart';
import StackToolTip from './StackToolTip';
import PieToolTip from './PieToolTip';
import './styles.css';
import { selectable } from 'shared/components/query/styles/styles.module.scss';
import ComparisonScatterPlot from './ComparisonScatterPlot';
import BoxPlot from './BoxPlot';
import { Observer } from 'mobx-react';
import LoadingIndicator from 'shared/components/loadingIndicator/LoadingIndicator';

const jsondata = require('./jsonData/sample.json');

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

interface gaData {
    uniqueSampleKey: string;
    uniquePatientKey: string;
    molecularProfileId: string;
    sampleId: string;
    patientId: string;
    studyId: string;
    value: string;
    genericAssayStableId: string;
    stableId: string;
}
interface DropdownOption {
    label: string;
    value: string;
}
interface ProfileOptions {
    [key: string]: Option[];
}

interface Entity {
    stableId: string;
}

interface HomePageProps {
    store: StudyViewPageStore;
}
interface MolecularProfileDataItem {
    sampleId: string;
}
type CellOption = {
    value: string;
    label: string;
};

interface HomePageState {
    selectedOption: string | null;
    entityNames: string[];
    molecularProfiles: Option[];
    studyViewFilterFlag: boolean;
    chartInfo: {
        name: string;
        description: string;
        profileType: string;
        genericAssayType: string;
        dataType: string;
        genericAssayEntityId: string;
        patientLevel: boolean;
    };
    selectedEntity: Entity | null;
    selectedValue: string | null;
    dataBins: DataBin[] | null;
    chartType: string | null;
    pieChartData: GenericAssayData[];
    tooltipEnabled: boolean;
    downloadSvg: boolean;
    downloadPdf: boolean;
    downloadOption: string;
    BarDownloadData: gaData[];
    stackEntity: any;
    studyIdToStudy: string;
    hoveredSampleId: string;
    currentTooltipData: { [key: string]: { [key: string]: React.ReactNode } };
    map: { [key: string]: string };
    expressionFilter: DropdownOption[];
    expressionFilterTissue: DropdownOption[];
    dynamicWidth: number;
    increaseCount: number;
    decreaseCount: number;
    resizeEnabled: boolean;
    isHorizontal: boolean;
    isVisible: boolean;
    tooltipHovered: boolean;
    selectedSamples: SampleOption[];
    dropdownOptions: SampleOption[];
    isReverse: boolean;
    initialWidth: any;
    heading: any;
    isHovered: any;
    hoveredSliceIndex: any;
    selectedSamplesResult: any;
    stableIdBin: string;
    profileTypeBin: string;
    databinState: any;
    selectedIdBox: any;
    selectedKeyBox: any;
    selectedNestedKeyBox: any;
    optionsIdBox: any;
    optionsKeyBox: any;
    optionsNestedKeyBox: any;
    selectedObjectBox: any;
    transformedData: any;
    boxPlotData: any;
    scatterColor: string;
    loader: boolean;
    selectedGene: any;
    isComparision: boolean;
    compareGene1: string;
    compareGene2: string;
    cellOptions: CellOption[];
    geneCellSelect: string;
    gene1Map: any;
    gene2Map: any;
    gene1Data: any;
    gene2Data: any;
    selectedSamplesExpression: DropdownOption[];
    selectedSamplesExpressionTissue: DropdownOption[];
}

class HomePage extends Component<HomePageProps, HomePageState> {
    constructor(props: HomePageProps) {
        super(props);
        this.state = {
            selectedOption: null,
            selectedSamplesResult: props.store.selectedSamples.result,
            studyViewFilterFlag: false,
            entityNames: [],
            molecularProfiles: [],
            chartInfo: {
                name: '',
                description: '',
                profileType: '',
                genericAssayType: '',
                dataType: '',
                genericAssayEntityId: '',
                patientLevel: false,
            },
            selectedEntity: null,
            selectedValue: null,
            dataBins: null,
            chartType: null,
            pieChartData: [],
            tooltipEnabled: false,
            downloadSvg: false,
            downloadPdf: false,
            downloadOption: '',
            BarDownloadData: [],
            stackEntity: '',
            studyIdToStudy: '',
            hoveredSampleId: '',
            currentTooltipData: {},
            map: {},
            dynamicWidth: 0,
            increaseCount: 0,
            decreaseCount: 0,
            resizeEnabled: false,
            isHorizontal: false,
            isVisible: false,
            tooltipHovered: false,
            selectedSamples: [],
            dropdownOptions: [],
            isReverse: false,
            initialWidth: 0,
            heading: '',
            isHovered: false,
            hoveredSliceIndex: 0,
            profileTypeBin: '',
            stableIdBin: '',
            databinState: [],
            selectedIdBox: null,
            selectedKeyBox: null,
            selectedNestedKeyBox: null,
            optionsIdBox: Object.keys(jsondata),
            optionsKeyBox: [],
            optionsNestedKeyBox: [],
            selectedObjectBox: null,
            selectedGene: null,
            transformedData: [],
            boxPlotData: [],
            scatterColor: 'Default',
            loader: false,
            isComparision: false,
            compareGene1: '',
            compareGene2: '',
            cellOptions: [],
            geneCellSelect: '',
            gene1Map: [],
            gene2Map: [],
            gene1Data: [],
            gene2Data: [],
            expressionFilter: [],
            selectedSamplesExpression: [],
            expressionFilterTissue: [],
            selectedSamplesExpressionTissue: [],
        };
    }
    async fetchGenericAssayData(
        selectedValue: any,
        names: string[],
        sampleId: string[]
    ) {
        const { store } = this.props;
        const selectedPatientIds = this.props.store.selectedSamples.result.map(
            (sample: any) => sample.sampleId
        );

        const params = {
            molecularProfileId: selectedValue,
            genericAssayFilter: {
                genericAssayStableIds: names,
                sampleIds: selectedPatientIds,
            } as GenericAssayFilter,
        };

        try {
            const resp = await client.fetchGenericAssayDataInMolecularProfileUsingPOST(
                params
            );
            return resp;
        } catch (error) {
            toast.error('Error fetching generic assay data');
        }
    }

    @autobind
    handleTooltipCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
        singleCellStore.setTooltipEnabled(event.target.checked);
        this.setState({ tooltipEnabled: event.target.checked });
    }
    @autobind
    handleIsCompareChange(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({ isComparision: event.target.checked });
    }
    @autobind
    handleReverseChange(event: React.ChangeEvent<HTMLInputElement>) {
        singleCellStore.setIsReverse(event.target.checked);
        this.setState({ isReverse: event.target.checked });
    }
    async fetchDataBins(genericAssayEntityId: string, profileType: string) {
        singleCellStore.setHeading(profileType);
        singleCellStore.setStableIdBin(genericAssayEntityId);
        singleCellStore.setProfileTypeBin(
            this.props.store.genericAssayProfileOptionsByType.result[
                profileType
            ][0].value
        );
        this.setState({ heading: profileType });
        this.setState({ stableIdBin: genericAssayEntityId });
        this.setState({
            profileTypeBin: this.props.store.genericAssayProfileOptionsByType
                .result[profileType][0].value,
        });
        const { store } = this.props;
        const gaDataBins = await internalClient.fetchGenericAssayDataBinCountsUsingPOST(
            {
                dataBinMethod: DataBinMethodConstants.STATIC,
                genericAssayDataBinCountFilter: {
                    genericAssayDataBinFilters: [
                        {
                            stableId: genericAssayEntityId,
                            profileType: this.props.store
                                .genericAssayProfileOptionsByType.result[
                                profileType
                            ][0].value,
                        },
                    ] as any,
                    studyViewFilter: store.filters,
                },
            }
        );
        const dataBins = convertGenericAssayDataBinsToDataBins(gaDataBins);
        this.setState({ databinState: dataBins });
        singleCellStore.setDataBins(dataBins);
        this.setState({ dataBins });
    }
    @autobind
    handleDownloadClick(event: React.ChangeEvent<HTMLSelectElement>) {
        const selectedOption = event.target.value;
        singleCellStore.setDownloadOption(selectedOption);
        this.setState({ downloadOption: selectedOption });
        if (selectedOption === 'svg') {
            singleCellStore.setDownloadSvg(true);
            this.setState({ downloadSvg: true });
        } else if (selectedOption === 'pdf') {
            singleCellStore.setDownloadPdf(true);
            this.setState({ downloadPdf: true });
        } else {
            singleCellStore.setDownloadSvg(false);
            singleCellStore.setDownloadPdf(false);
            this.setState({ downloadSvg: false });
            this.setState({ downloadPdf: false });
        }
    }
    @autobind
    async handleSelectChange(event: any) {
        this.setState({ stackEntity: '' });
        singleCellStore.setStackEntity('');
        const selectedValue = event.value;
        console.log(event.value, 'this is value');
        if (event.value == 'gene_expression') {
            this.setState({ selectedValue: selectedValue });
            this.setState({ selectedOption: selectedValue });
            singleCellStore.setSelectedOption(selectedValue);
        } else {
            const studyId = 'gbm_cptac_2021';
            const selectedProfile = singleCellStore.molecularProfiles.find(
                profile => profile.value === selectedValue
            );
            singleCellStore.setChartType(null);
            this.setState({
                selectedValue,
                chartType: null,
                selectedEntity: null,
            });

            if (selectedProfile) {
                const { store } = this.props;
                const entities =
                    store.genericAssayEntitiesGroupedByProfileId.result;
                const entityArray = entities
                    ? entities[selectedProfile.genericAssayEntityId]
                    : [];
                const names = entityArray.map((entity: any) => entity.stableId);
                singleCellStore.setEntityNames(names);
                this.setState({ entityNames: names, selectedEntity: null });

                this.retrieveAllProfiledSamples(selectedValue)
                    .then(async MolecularProfileData => {
                        const extractedData: string[] = (
                            MolecularProfileData ?? []
                        ).map(({ sampleId }) => sampleId);
                        const pieChartData = await this.fetchGenericAssayData(
                            selectedValue,
                            names,
                            extractedData
                        );
                        singleCellStore.setPieChartData(
                            pieChartData as GenericAssayData[]
                        );
                        this.setState({
                            pieChartData: pieChartData as GenericAssayData[],
                        });
                    })
                    .catch(error => {
                        toast.error('Failed to fetch data:');
                    });

                const newChartInfo = {
                    name: '',
                    description: selectedProfile.description,
                    profileType: selectedProfile.profileType,
                    genericAssayType: selectedProfile.genericAssayType,
                    dataType: selectedProfile.dataType,
                    genericAssayEntityId: selectedProfile.genericAssayEntityId,
                    patientLevel: selectedProfile.patientLevel,
                };
                singleCellStore.setSelectedOption(selectedValue);
                this.setState(
                    {
                        selectedOption: selectedValue,
                        chartInfo: newChartInfo,
                    },

                    async () => {
                        await this.fetchDataBins(
                            newChartInfo.genericAssayEntityId,
                            newChartInfo.profileType
                        );
                    }
                );
            } else {
                singleCellStore.setSelectedOption('');
                singleCellStore.setEntityNames([]);
                this.setState({
                    selectedOption: null,
                    entityNames: [],
                    chartInfo: {
                        ...this.state.chartInfo,
                        name: '',
                        description: '',
                        profileType: '',
                        genericAssayType: '',
                        dataType: '',
                        genericAssayEntityId: '',
                        patientLevel: false,
                    },
                });
            }
        }
    }
    @autobind
    handleEntitySelectChangeStack(event: any) {
        singleCellStore.setStackEntity(event.value);
        this.setState({ stackEntity: event.value });
    }
    @autobind
    async handleEntitySelectChange(event: any) {
        const selectedEntityId = event.value;
        const selectedOption = singleCellStore.selectedOption;
        let studyId = '';
        const data = this.props.store.genericAssayProfiles.result;

        for (const item of data) {
            if (
                item.molecularAlterationType === 'GENERIC_ASSAY' &&
                item.genericAssayType.startsWith('SINGLE_CELL')
            ) {
                studyId = item.studyId;
                break;
            }
        }

        const Molecularprofiles = await this.molecularProfiles([studyId]);
        const selectedMolecularProfile = Molecularprofiles.find(
            (profile: any) => profile.molecularProfileId === selectedOption
        );

        const BarchartDownloadData = await this.getGenericAssayDataAsClinicalData(
            selectedMolecularProfile,
            selectedEntityId
        );
        singleCellStore.setBarDownloadData(BarchartDownloadData);
        this.setState({ BarDownloadData: BarchartDownloadData });
        const { store } = this.props;

        if (
            selectedOption &&
            store.genericAssayEntitiesGroupedByProfileId &&
            store.genericAssayEntitiesGroupedByProfileId.result
        ) {
            const newSelectedEntity = store.genericAssayEntitiesGroupedByProfileId.result[
                selectedOption
            ].find((entity: any) => entity.stableId === selectedEntityId);

            if (newSelectedEntity) {
                this.setState(
                    { selectedEntity: newSelectedEntity },
                    async () => {
                        this.setState(
                            prevState => ({
                                chartInfo: {
                                    ...prevState.chartInfo,
                                    name: newSelectedEntity.stableId,
                                    genericAssayEntityId:
                                        newSelectedEntity.stableId,
                                },
                            }),
                            async () => {
                                await this.fetchDataBins(
                                    newSelectedEntity.stableId,
                                    this.state.chartInfo.profileType
                                );
                            }
                        );
                    }
                );
            } else {
                toast.error('Selected entity is invalid.');
            }
        }
    }
    @autobind
    handleColorChange(selectedColorOption: any) {
        this.setState({ scatterColor: selectedColorOption.value });
    }
    @autobind
    handleChartTypeChange(event: any) {
        singleCellStore.setChartType(event.value);
        singleCellStore.setStackEntity('');
        this.setState({ chartType: event.value, selectedEntity: null });
        this.setState({ stackEntity: '' });
    }
    handleIdChangeBox = (selectedOption: any) => {
        const selectedIdBox = selectedOption.value;
        const optionsKeyBox = Object.keys(jsondata[selectedIdBox]).map(key => ({
            value: key,
            label: key,
        }));
        this.setState({
            selectedIdBox,
            optionsKeyBox,
            selectedKeyBox: null,
            optionsNestedKeyBox: [],
            selectedNestedKeyBox: null,
            selectedObjectBox: null,
        });
    };
    addJitter = (x: number) => {
        const jitterAmount = 0.4; // Adjust this value as needed
        return x + (Math.random() * jitterAmount - jitterAmount / 2);
    };
    handleKeyChangeBox = (selectedOption: any) => {
        const selectedKeyBox = selectedOption.value;
        const { selectedIdBox } = this.state;
        const optionsNestedKeyBox = Object.keys(
            jsondata[selectedIdBox][selectedKeyBox]
        ).map(key => ({
            value: key,
            label: key,
        }));
        this.setState({
            selectedKeyBox,
            optionsNestedKeyBox,
            selectedNestedKeyBox: null,
            selectedObjectBox: null,
        });
    };
    handleGeneChange = (selectedOption: any) => {
        this.setState({ loader: true });
        const selectedGene = selectedOption.value;
        if (selectedGene && this.state.transformedData[selectedGene]) {
            // Group by cellname for the selected gene
            const groupedByCellname = this.state.transformedData[
                selectedGene
            ].reduce((acc: any, tuple: any) => {
                const { cellname, ...rest } = tuple;
                if (!acc[cellname]) {
                    acc[cellname] = [];
                }
                acc[cellname].push(rest);
                return acc;
            }, {});

            // Add 'x' property to each element based on the cellname index
            let cellIndex = 1;
            for (let cellname in groupedByCellname) {
                groupedByCellname[cellname] = groupedByCellname[cellname].map(
                    (item: any) => ({
                        ...item,
                        x: this.addJitter(cellIndex),
                    })
                );
                cellIndex++;
            }

            // Update selectedGene state
            this.setState({ selectedGene });
            this.setState({ boxPlotData: groupedByCellname });
            // console.log("this is boxplotData",groupedByCellname)
        } else {
            console.log(`Gene '${selectedGene}' not found in the data.`);
        }
        this.setState({ loader: false });
    };
    processGeneData(
        transformedData: any,
        selectedGene: string,
        addJitter: (value: number) => number
    ) {
        if (selectedGene && transformedData[selectedGene]) {
            const groupedByCellname = transformedData[selectedGene].reduce(
                (acc: any, tuple: any) => {
                    const { cellname, ...rest } = tuple;
                    if (!acc[cellname]) {
                        acc[cellname] = [];
                    }
                    acc[cellname].push(rest);
                    return acc;
                },
                {}
            );

            // Add 'x' property to each element based on the cellname index
            let cellIndex = 1;
            for (let cellname in groupedByCellname) {
                groupedByCellname[cellname] = groupedByCellname[cellname].map(
                    (item: any) => ({
                        ...item,
                        x: addJitter(0),
                    })
                );
                cellIndex++;
            }

            return groupedByCellname;
        }

        return null;
    }

    generateComparePlot(gene1: string, gene2: string) {
        const groupedByCellname1 = this.processGeneData(
            this.state.transformedData,
            gene1,
            this.addJitter.bind(this)
        );
        if (groupedByCellname1) {
            this.setState({ gene1Map: groupedByCellname1 });

            const cellNamesArray = Object.keys(groupedByCellname1);
            const cellOptions = cellNamesArray.map(cellname => ({
                value: cellname,
                label: cellname,
            }));
            this.setState({ cellOptions: cellOptions });
        }

        const groupedByCellname2 = this.processGeneData(
            this.state.transformedData,
            gene2,
            this.addJitter.bind(this)
        );
        if (groupedByCellname2) {
            this.setState({ gene2Map: groupedByCellname2 });
        }
    }
    handleGene1Change = (selectedOption: any) => {
        this.setState({ compareGene1: selectedOption.value });
        if (this.state.compareGene2) {
            this.generateComparePlot(
                selectedOption.value,
                this.state.compareGene2
            );
        }
    };
    handleGene2Change = (selectedOption: any) => {
        this.setState({ compareGene2: selectedOption.value });
        if (this.state.compareGene1) {
            this.generateComparePlot(
                this.state.compareGene1,
                selectedOption.value
            );
        }
    };

    handleGeneCellChange = (selectedOption: any) => {
        this.setState({ geneCellSelect: selectedOption.value });
        this.setState({ gene1Data: this.state.gene1Map[selectedOption.value] });
        this.setState({ gene2Data: this.state.gene2Map[selectedOption.value] });
    };

    handleNestedKeyChangeBox = (selectedOption: any) => {
        const selectedNestedKeyBox = selectedOption.value;
        const { selectedIdBox, selectedKeyBox } = this.state;
        const selectedObjectBox =
            jsondata[selectedIdBox][selectedKeyBox][selectedNestedKeyBox];
        this.setState({ selectedNestedKeyBox, selectedObjectBox });
    };
    async componentDidMount() {
        const { store } = this.props;
        let transformedData: any = {};

        let colorPalette: string[] = [
            '#FF5733',
            '#33FFB8',
            '#336BFF',
            '#FF33E8',
            '#33FFA1',
            '#FF3333',
            '#33B8FF',
            '#FFC733',
            '#E833FF',
            '#33FFD7',
            '#A133FF',
            '#FF33A8',
            '#33FF4D',
            '#FF7F33',
            '#5B33FF',
            '#FF33B3',
            '#33FF70',
            '#FFA333',
            '#4D33FF',
            '#FF33FF',
            '#33FF33',
            '#FF5733',
            '#33FFB8',
            '#336BFF',
            '#FF33E8',
            '#33FFA1',
            '#FF3333',
            '#33B8FF',
            '#FFC733',
            '#E833FF',
            '#33FFD7',
            '#A133FF',
            '#FF33A8',
            '#33FF4D',
            '#FF7F33',
            '#5B33FF',
            '#FF33B3',
            '#33FF70',
            '#FFA333',
            '#4D33FF',
            '#FF33FF',
            '#33FF33',
        ];
        let colorPalettebw: string[] = ['#57ABF9'];
        let strokeColorPalette: string[] = [
            '#B33F26',
            '#26B388',
            '#263C99',
            '#B326A3',
            '#26B36D',
            '#B32626',
            '#2699B3',
            '#B38A26',
            '#A326B3',
            '#26B393',
            '#7126B3',
            '#B3266D',
            '#26B33A',
            '#B35A26',
            '#3F26B3',
            '#B32674',
            '#26B348',
            '#B37426',
            '#3A26B3',
            '#B326B3',
            '#26B326',
            '#B33F26',
            '#26B388',
            '#263C99',
            '#B326A3',
            '#26B36D',
            '#B32626',
            '#2699B3',
            '#B38A26',
            '#A326B3',
            '#26B393',
            '#7126B3',
            '#B3266D',
            '#26B33A',
            '#B35A26',
            '#3F26B3',
            '#B32674',
            '#26B348',
            '#B37426',
            '#3A26B3',
            '#B326B3',
            '#26B326',
        ];
        let strokeColorPalettebw: string[] = ['#4B95D7'];
        let tissueColorPalette: string[] = [
            '#FF8A33',
            '#33FFEC',
            '#3380FF',
            '#FF33B0',
            '#33FF80',
            '#FF3344',
            '#33C2FF',
            '#FFD133',
            '#E883FF',
            '#33FFE8',
            '#B833FF',
            '#FF33DC',
            '#33FF72',
            '#FF8C33',
            '#6733FF',
            '#FF33C1',
            '#33FF6A',
            '#FFC233',
            '#6733FF',
            '#FF33FF',
            '#33FF38',
            '#FF8A33',
            '#33FFEC',
            '#3380FF',
            '#FF33B0',
            '#33FF80',
            '#FF3344',
            '#33C2FF',
            '#FFD133',
            '#E883FF',
            '#33FFE8',
            '#B833FF',
            '#FF33DC',
            '#33FF72',
            '#FF8C33',
            '#6733FF',
            '#FF33C1',
            '#33FF6A',
            '#FFC233',
            '#6733FF',
            '#FF33FF',
            '#33FF38',
        ];
        let tissueStrokeColorPalette: string[] = [
            '#B35A33',
            '#26B3A0',
            '#2662B3',
            '#B32686',
            '#26B346',
            '#B3263A',
            '#266CB3',
            '#B39726',
            '#A326B3',
            '#26B3AA',
            '#6E26B3',
            '#B32693',
            '#26B350',
            '#B35F26',
            '#5126B3',
            '#B3268C',
            '#26B360',
            '#B38226',
            '#3926B3',
            '#B326B3',
            '#26B32E',
            '#B35A33',
            '#26B3A0',
            '#2662B3',
            '#B32686',
            '#26B346',
            '#B3263A',
            '#266CB3',
            '#B39726',
            '#A326B3',
            '#26B3AA',
            '#6E26B3',
            '#B32693',
            '#26B350',
            '#B35F26',
            '#5126B3',
            '#B3268C',
            '#26B360',
            '#B38226',
            '#3926B3',
            '#B326B3',
            '#26B32E',
        ];
        const generateRandomRGBColor = () => {
            const r = Math.floor(Math.random() * 256); // 0 to 255
            const g = Math.floor(Math.random() * 256); // 0 to 255
            const b = Math.floor(Math.random() * 256); // 0 to 255
            return `rgb(${r}, ${g}, ${b})`;
        };
        let tissueColorMapping: { [key: string]: string } = {};
        let tissueStrokeColorMapping: { [key: string]: string } = {};
        Object.keys(jsondata).forEach(sampleKey => {
            if (
                !this.state.expressionFilter.some(
                    option => option.value === sampleKey
                )
            ) {
                this.state.expressionFilter.push({
                    label: sampleKey,
                    value: sampleKey,
                });
            }
        });
        Object.keys(jsondata).forEach(sampleKey => {
            const sample = jsondata[sampleKey];

            Object.keys(sample).forEach(tissueKey => {
                if (
                    !this.state.expressionFilterTissue.some(
                        option => option.value === tissueKey
                    )
                ) {
                    this.state.expressionFilterTissue.push({
                        label: tissueKey,
                        value: tissueKey,
                    });
                }
            });
        });
        Object.keys(jsondata).forEach(sampleKey => {
            const sample = jsondata[sampleKey];

            Object.keys(sample).forEach(tissueKey => {
                const tissue = sample[tissueKey];

                Object.keys(tissue).forEach(cellTypeKey => {
                    const cellType = tissue[cellTypeKey];

                    Object.keys(cellType).forEach(geneName => {
                        const value = cellType[geneName];

                        const tuple = {
                            value: value,
                            cellname: cellTypeKey,
                            tissuename: tissueKey,
                            parentId: sampleKey,
                            color: '', // Placeholder for color assignment
                            bwColor: '', // Placeholder for bwColor assignment
                            bwStrokeColor: '', // Placeholder for bwStrokeColor assignment
                            strokeColor: '',
                            tissueColor: '', // Placeholder for tissue color assignment
                            tissueStrokeColor: '', // Placeholder for tissue stroke color assignment
                        };

                        if (!transformedData[geneName]) {
                            transformedData[geneName] = [];
                        }

                        // Check if parentId already has a color assigned
                        const existingTuple = transformedData[geneName].find(
                            (t: any) => t.parentId === sampleKey
                        );
                        if (existingTuple) {
                            tuple.color = existingTuple.color;
                            tuple.strokeColor = existingTuple.strokeColor;
                            tuple.bwColor = existingTuple.bwColor;
                            tuple.bwStrokeColor = existingTuple.bwStrokeColor;
                        } else {
                            // Assign a new color from the palette
                            tuple.color = generateRandomRGBColor();
                            tuple.strokeColor = tuple.color;
                            tuple.bwColor =
                                colorPalettebw[
                                    transformedData[geneName].length %
                                        colorPalettebw.length
                                ];
                            tuple.bwStrokeColor =
                                strokeColorPalettebw[
                                    transformedData[geneName].length %
                                        strokeColorPalettebw.length
                                ];
                        }

                        // Assign tissue color
                        if (tissueColorMapping[tissueKey]) {
                            tuple.tissueColor = tissueColorMapping[tissueKey];
                        } else {
                            const tissueColor =
                                tissueColorPalette[
                                    Object.keys(tissueColorMapping).length %
                                        tissueColorPalette.length
                                ];
                            tissueColorMapping[tissueKey] = tissueColor;
                            tuple.tissueColor = tissueColor;
                        }

                        // Assign tissue stroke color
                        if (tissueStrokeColorMapping[tissueKey]) {
                            tuple.tissueStrokeColor =
                                tissueStrokeColorMapping[tissueKey];
                        } else {
                            const tissueStrokeColor =
                                tissueStrokeColorPalette[
                                    Object.keys(tissueStrokeColorMapping)
                                        .length %
                                        tissueStrokeColorPalette.length
                                ];
                            tissueStrokeColorMapping[
                                tissueKey
                            ] = tissueStrokeColor;
                            tuple.tissueStrokeColor = tissueStrokeColor;
                        }

                        transformedData[geneName].push(tuple);
                    });
                });
            });
        });

        this.setState({ transformedData });
        console.log(transformedData, 'TransformedData');
        const geneToSelect = 'CSF3R';

        if (transformedData[geneToSelect]) {
            // Group by cellname
            const groupedByCellname = transformedData[geneToSelect].reduce(
                (acc: any, tuple: any) => {
                    const { cellname, ...rest } = tuple;
                    if (!acc[cellname]) {
                        acc[cellname] = [];
                    }
                    acc[cellname].push(rest);
                    return acc;
                },
                {}
            );
        } else {
            console.log(`Gene '${geneToSelect}' not found in the data.`);
        }

        let studyId = 'gbm_cptac_2021';
        const data = this.props.store.genericAssayProfiles.result;

        for (const item of data) {
            if (
                item.molecularAlterationType === 'GENERIC_ASSAY' &&
                item.genericAssayType.startsWith('SINGLE_CELL')
            ) {
                singleCellStore.setStudyIdToStudy(item.studyId);
                this.setState({ studyIdToStudy: item.studyId });
                studyId = item.studyId;
                break;
            }
        }

        const Molecularprofiles = await this.molecularProfiles([studyId]);

        const molecularProfileOptions = Molecularprofiles.map(
            (profile: any) => ({
                value: profile.molecularProfileId,
                label: profile.name,
                description: profile.description,
                profileType: profile.genericAssayType,
                genericAssayType: profile.genericAssayType,
                dataType: profile.datatype,
                genericAssayEntityId: profile.molecularProfileId,
                patientLevel: profile.patientLevel,
            })
        );
        singleCellStore.setMolecularProfiles(molecularProfileOptions);
        this.setState({ molecularProfiles: molecularProfileOptions });
    }

    async molecularProfiles(studyIds: string[]) {
        let profiles = await client.fetchMolecularProfilesUsingPOST({
            molecularProfileFilter: {
                studyIds: studyIds,
            } as MolecularProfileFilter,
        });

        return profiles;
    }
    async getGenericAssayDataAsClinicalData(
        selectedMolecularProfiles: any,
        genericAssayEntityId: any
    ) {
        const molecularProfiles = { 0: selectedMolecularProfiles };

        if (_.isEmpty(molecularProfiles)) {
            return [];
        }
        const molecularProfileMapByStudyId = _.keyBy(
            molecularProfiles,
            molecularProfile => molecularProfile.studyId
        );
        const samples = this.props.store.samples.result;
        const filteredSamples = samples.filter(
            (sample: any) => sample.studyId in molecularProfileMapByStudyId
        );
        const sampleMolecularIdentifiers = filteredSamples.map(
            (sample: any) => ({
                sampleId: sample.sampleId,
                molecularProfileId:
                    molecularProfileMapByStudyId[sample.studyId]
                        .molecularProfileId,
            })
        );

        const gaDataList = await client.fetchGenericAssayDataInMultipleMolecularProfilesUsingPOST(
            {
                projection: 'DETAILED',
                genericAssayDataMultipleStudyFilter: {
                    genericAssayStableIds: [genericAssayEntityId],
                    sampleMolecularIdentifiers: sampleMolecularIdentifiers,
                } as GenericAssayDataMultipleStudyFilter,
            }
        );
        return gaDataList;
    }
    async retrieveAllProfiledSamples(
        selectedValue: string
    ): Promise<MolecularProfileDataItem[]> {
        let data = await client.fetchGenePanelDataInMultipleMolecularProfilesUsingPOST(
            {
                genePanelDataMultipleStudyFilter: {
                    molecularProfileIds: [selectedValue],
                } as GenePanelDataMultipleStudyFilter,
            }
        );
        return data as MolecularProfileDataItem[];
    }

    truncateOptionLabel(label: string) {
        const words = label.split(' ');
        if (words.length > 3) {
            return `${words.slice(0, 3).join(' ')}...`;
        } else {
            return label;
        }
    }
    increaseWidth = () => {
        this.setState((prevState: any) => ({
            dynamicWidth: prevState.dynamicWidth + 10,
            increaseCount: prevState.increaseCount + 1,
        }));
    };

    decreaseWidth = () => {
        this.setState((prevState: any) => {
            const newWidth = Math.max(
                prevState.dynamicWidth - 10,
                prevState.initialWidth
            );

            if (newWidth === prevState.initialWidth) {
                const toastId = toast.loading('Processing...', {
                    theme: 'light',
                    position: 'top-center',
                    transition: Zoom,
                });
                setTimeout(() => {
                    toast.update(toastId, {
                        render: `Minimum ${
                            this.state.isHorizontal ? 'height' : 'width'
                        } limit reached`,
                        type: 'error',
                        theme: 'light',
                        isLoading: false,
                        position: 'top-center',
                        autoClose: 3500,
                    });
                }, 700);
                return null;
            }

            return {
                dynamicWidth: newWidth,
                decreaseCount: prevState.decreaseCount + 1,
            };
        });
    };

    handleWidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value);
        singleCellStore.handleWidthChange(value);
        this.setState((prevState: any) => ({
            dynamicWidth: Math.max(value, prevState.initialWidth),
        }));
    };

    handleResizeCheckboxChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        singleCellStore.setResizeEnabled(event.target.checked);
        this.setState({ resizeEnabled: event.target.checked });
    };
    toggleAxes = (event: React.ChangeEvent<HTMLInputElement>) => {
        singleCellStore.setIsHorizontal(event.target.checked);
        this.setState({ isHorizontal: event.target.checked });
    };
    handleSampleSelectionChange = (selectedOptions: any) => {
        const selectedSampleIds = selectedOptions
            ? selectedOptions.map((option: any) => option.value)
            : [];
        singleCellStore.setSelectedSamples(selectedSampleIds);
        this.setState({ selectedSamples: selectedSampleIds });
    };
    handleSampleSelectionChangeExpression = (selectedOptions: any) => {
        const selectedSampleIds = selectedOptions
            ? selectedOptions.map((option: any) => option.value)
            : [];
        console.log(selectedSampleIds, 'selectedSampleIdsselectedSampleIds');
        this.setState({ selectedSamplesExpression: selectedSampleIds });
    };
    handleSampleSelectionChangeExpressionTissue = (selectedOptions: any) => {
        const selectedSampleIds = selectedOptions
            ? selectedOptions.map((option: any) => option.value)
            : [];
        this.setState({ selectedSamplesExpressionTissue: selectedSampleIds });
    };

    componentDidUpdate(prevProps: any) {
        const selectedPatientIds = this.props.store.selectedSamples.result.map(
            (sample: any) => sample.sampleId
        );

        if (this.state.studyViewFilterFlag) {
            this.setState({ studyViewFilterFlag: false });
            const fetchData = async () => {
                try {
                    const pieChartData = await this.fetchGenericAssayData(
                        this.state.selectedValue,
                        this.state.entityNames,
                        selectedPatientIds
                    );
                    if (
                        !pieChartData ||
                        (Array.isArray(pieChartData) && pieChartData.length < 1)
                    ) {
                        const toastId = toast.loading('Processing...', {
                            theme: 'light',
                            position: 'top-center',
                            transition: Zoom,
                        });
                        setTimeout(() => {
                            toast.update(toastId, {
                                render: `No single cell data in selected samples.`,
                                type: 'warning',
                                theme: 'light',
                                isLoading: false,
                                position: 'top-center',
                                autoClose: 3500,
                            });
                        }, 700);
                        return;
                    }
                    this.setState({
                        pieChartData: pieChartData as GenericAssayData[],
                    });
                    singleCellStore.setPieChartData(
                        pieChartData as GenericAssayData[]
                    );
                    this.setState({ studyViewFilterFlag: false });
                } catch (error) {
                    toast.error('Error fetching pie chart data');
                }
            };
            fetchData();
        }
    }

    render() {
        const { selectedEntity, selectedValue, pieChartData } = this.state;
        const {
            optionsIdBox,
            optionsKeyBox,
            optionsNestedKeyBox,
            selectedIdBox,
            selectedKeyBox,
            selectedNestedKeyBox,
            transformedData,
            isComparision,
        } = this.state;
        const geneOptions = Object.keys(transformedData).map(gene => ({
            value: gene,
            label: gene,
        }));
        console.log(pieChartData, 'fasfasf');
        const selectedOption = singleCellStore.selectedOption;
        const entityNames = singleCellStore.entityNames;
        const molecularProfiles = singleCellStore.molecularProfiles;
        const dataBins = singleCellStore.dataBins;
        const chartType = singleCellStore.chartType;
        const tooltipEnabled = singleCellStore.tooltipEnabled;
        const downloadSvg = singleCellStore.downloadSvg;
        const downloadPdf = singleCellStore.downloadPdf;
        const BarDownloadData = singleCellStore.BarDownloadData;

        const filteredOptions = molecularProfiles.filter(
            option =>
                option.profileType &&
                option.profileType.startsWith('SINGLE_CELL')
        );

        const options = [
            {
                value: 'gene_expression',
                label: 'Gene Expression',
                title: 'Gene Expression',
                isDisabled: false,
                isHidden: false,
            }, // Default option
            ...filteredOptions.map(option => ({
                value: option.value,
                label:
                    option.label.length > 35
                        ? `${option.label.slice(0, 35)}...`
                        : option.label,
                title: option.label.length > 35 ? option.label : '',
                isDisabled: false,
                isHidden: false,
            })),
        ];
        const chartOptions =
            this.state.selectedOption === 'gene_expression'
                ? [
                      { value: 'box', label: 'Box Plot' },
                      { value: 'comparison', label: 'Co-expression plot' },
                  ]
                : [
                      { value: 'pie', label: 'Pie Chart' },
                      { value: 'bar', label: 'Histogram' },
                      { value: 'stack', label: 'Stacked Bar Chart' },
                  ];
        return (
            <div className="home-page-container">
                <div
                    className="plotsTab leftColumn axisBlock"
                    style={{
                        background: '#eee',
                        padding: '10px',
                        borderRadius: '4px',
                        minWidth: '300px',
                        maxHeight:
                            chartType === 'bar'
                                ? '250px'
                                : chartType === 'pie'
                                ? '200px'
                                : '400px',
                    }}
                >
                    <h2>Chart Configurations</h2>
                    <div>
                        <div className="dropdown-container">
                            <ReactSelect
                                value={selectedOption || ''}
                                onChange={this.handleSelectChange}
                                options={options}
                                placeholder="Select a single cell profile..."
                                clearable={false}
                                searchable={true}
                            />
                        </div>

                        {selectedOption && (
                            <div className="dropdown-container">
                                <ReactSelect
                                    id="chartTypeSelect"
                                    onChange={this.handleChartTypeChange}
                                    value={chartType}
                                    options={chartOptions}
                                    placeholder="Select type of chart..."
                                    isDisabled={!selectedOption}
                                    clearable={false}
                                    searchable={true}
                                />
                            </div>
                        )}

                        {chartType === 'bar' && (
                            <div className="dropdown-container">
                                <ReactSelect
                                    id="entitySelect"
                                    onChange={this.handleEntitySelectChange}
                                    value={
                                        selectedEntity
                                            ? {
                                                  value:
                                                      selectedEntity.stableId,
                                                  label: selectedEntity.stableId.replace(
                                                      /_/g,
                                                      ' '
                                                  ),
                                              }
                                            : ''
                                    }
                                    options={entityNames.map(entityName => ({
                                        value: entityName,
                                        label: entityName.replace(/_/g, ' '),
                                    }))}
                                    placeholder="Select cell type..."
                                    isDisabled={!selectedOption}
                                    clearable={false}
                                    searchable={true}
                                />
                            </div>
                        )}
                        {chartType === 'box' && (
                            <div>
                                <div className="dropdown-container">
                                    <ReactSelect
                                        id="geneSelect"
                                        onChange={this.handleGeneChange}
                                        value={
                                            this.state.selectedGene
                                                ? {
                                                      value: this.state
                                                          .selectedGene,
                                                      label: this.state
                                                          .selectedGene,
                                                  }
                                                : null
                                        }
                                        options={geneOptions}
                                        placeholder="Select a gene..."
                                        isClearable={true}
                                        isSearchable={true}
                                    />
                                </div>
                                {this.state.selectedGene && (
                                    <div className="dropdown-container">
                                        <ReactSelect
                                            id="colorBySelect"
                                            onChange={this.handleColorChange}
                                            value={
                                                this.state.scatterColor
                                                    ? {
                                                          value: this.state
                                                              .scatterColor,
                                                          label:
                                                              this.state
                                                                  .scatterColor ==
                                                              'Default'
                                                                  ? 'Default color'
                                                                  : `Color by ${this.state.scatterColor}`,
                                                      }
                                                    : null
                                            }
                                            options={[
                                                {
                                                    value: 'sample id',
                                                    label: 'Color by sample id',
                                                },
                                                {
                                                    value: 'tissue name',
                                                    label: 'Color by tissue',
                                                },
                                                {
                                                    value: 'Default',
                                                    label: 'Default',
                                                },
                                            ]}
                                            placeholder="Color by..."
                                            clearable={false}
                                            searchable={true}
                                        />
                                    </div>
                                )}

                                {selectedIdBox && (
                                    <div className="dropdown-container">
                                        <ReactSelect
                                            id="keySelectBox"
                                            onChange={this.handleKeyChangeBox}
                                            value={
                                                selectedKeyBox
                                                    ? {
                                                          value: selectedKeyBox,
                                                          label: selectedKeyBox,
                                                      }
                                                    : ''
                                            }
                                            options={optionsKeyBox}
                                            placeholder="Select Key..."
                                            isDisabled={!selectedIdBox}
                                        />
                                    </div>
                                )}

                                {selectedKeyBox && (
                                    <div className="dropdown-container">
                                        <ReactSelect
                                            id="nestedKeySelectBox"
                                            onChange={
                                                this.handleNestedKeyChangeBox
                                            }
                                            value={
                                                selectedNestedKeyBox
                                                    ? {
                                                          value: selectedNestedKeyBox,
                                                          label: selectedNestedKeyBox,
                                                      }
                                                    : ''
                                            }
                                            options={optionsNestedKeyBox}
                                            placeholder="Select Nested Key..."
                                            isDisabled={!selectedKeyBox}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {chartType === 'comparison' && (
                            <div>
                                <div className="dropdown-container">
                                    <ReactSelect
                                        id="geneSelect1"
                                        onChange={this.handleGene1Change}
                                        value={
                                            this.state.compareGene1
                                                ? {
                                                      value: this.state
                                                          .compareGene1,
                                                      label: this.state
                                                          .compareGene1,
                                                  }
                                                : null
                                        }
                                        options={geneOptions}
                                        placeholder="Select first gene..."
                                        isClearable={true}
                                        isSearchable={true}
                                    />
                                </div>
                                <div className="dropdown-container">
                                    <ReactSelect
                                        id="geneSelect2"
                                        onChange={this.handleGene2Change}
                                        value={
                                            this.state.compareGene2
                                                ? {
                                                      value: this.state
                                                          .compareGene2,
                                                      label: this.state
                                                          .compareGene2,
                                                  }
                                                : null
                                        }
                                        options={geneOptions}
                                        placeholder="Select second gene..."
                                        isClearable={true}
                                        isSearchable={true}
                                    />
                                </div>
                                {this.state.compareGene1 &&
                                    this.state.compareGene2 && (
                                        <div className="dropdown-container">
                                            <ReactSelect
                                                id="geneCellSelect"
                                                onChange={
                                                    this.handleGeneCellChange
                                                }
                                                value={
                                                    this.state.geneCellSelect
                                                        ? {
                                                              value: this.state
                                                                  .geneCellSelect,
                                                              label: this.state
                                                                  .geneCellSelect,
                                                          }
                                                        : null
                                                }
                                                options={this.state.cellOptions}
                                                placeholder="Select Cell type..."
                                                isClearable={true}
                                                isSearchable={true}
                                            />
                                        </div>
                                    )}
                            </div>
                        )}
                        {/* {chartType === 'pie' && (
                            <div className="checkbox-wrapper-3">
                                <input
                                    type="checkbox"
                                    id="cbx-3"
                                    checked={singleCellStore.tooltipEnabled}
                                    onChange={this.handleTooltipCheckboxChange}
                                />
                                <label htmlFor="cbx-3" className="toggle">
                                    <span></span>
                                </label>
                                <label
                                    htmlFor="cbx-3"
                                    className="toggle-label"
                                    style={{
                                        fontWeight: 'normal',
                                        fontSize: '14px',
                                        marginLeft: '10px',
                                    }}
                                >
                                    Show the data table
                                </label>
                            </div>
                        )} */}

                        {chartType === 'stack' && (
                            <>
                                <div className="dropdown-container">
                                    <ReactSelect
                                        id="entitySelect"
                                        onChange={
                                            this.handleEntitySelectChangeStack
                                        }
                                        value={
                                            singleCellStore.stackEntity
                                                ? singleCellStore.stackEntity
                                                : ''
                                        }
                                        options={entityNames.map(
                                            entityName => ({
                                                value: entityName,
                                                label: entityName.replace(
                                                    /_/g,
                                                    ' '
                                                ),
                                            })
                                        )}
                                        placeholder={
                                            selectedOption &&
                                            selectedOption.includes('type')
                                                ? 'Sort by cell type...'
                                                : selectedOption &&
                                                  selectedOption.includes(
                                                      'cycle'
                                                  )
                                                ? 'Sort by cycle phase...'
                                                : 'Sort by ...'
                                        }
                                        isDisabled={!selectedOption}
                                        clearable={false}
                                        searchable={true}
                                    />
                                </div>

                                <div className="checkbox-wrapper-3">
                                    <input
                                        type="checkbox"
                                        id="cbx-3"
                                        checked={this.state.resizeEnabled}
                                        onChange={
                                            this.handleResizeCheckboxChange
                                        }
                                    />
                                    <label htmlFor="cbx-3" className="toggle">
                                        <span></span>
                                    </label>
                                    <label
                                        htmlFor="cbx-3"
                                        className="toggle-label"
                                        style={{
                                            fontWeight: 'normal',
                                            fontSize: '14px',
                                            marginLeft: '10px',
                                        }}
                                    >
                                        Resize Graph
                                    </label>
                                </div>

                                <div className="checkbox-wrapper-4">
                                    <input
                                        type="checkbox"
                                        id="cbx-4"
                                        checked={this.state.isHorizontal}
                                        onChange={this.toggleAxes}
                                    />
                                    <label htmlFor="cbx-4" className="toggle">
                                        <span></span>
                                    </label>
                                    <label
                                        htmlFor="cbx-4"
                                        className="toggle-label"
                                        style={{
                                            fontWeight: 'normal',
                                            fontSize: '14px',
                                            marginLeft: '10px',
                                        }}
                                    >
                                        Toggle axes
                                    </label>
                                </div>

                                {singleCellStore.stackEntity != '' && (
                                    <div className="checkbox-wrapper-5">
                                        <input
                                            type="checkbox"
                                            id="cbx-5"
                                            checked={this.state.isReverse}
                                            onChange={this.handleReverseChange}
                                        />
                                        <label
                                            htmlFor="cbx-5"
                                            className="toggle"
                                        >
                                            <span></span>
                                        </label>
                                        <label
                                            htmlFor="cbx-5"
                                            className="toggle-label"
                                            style={{
                                                fontWeight: 'normal',
                                                fontSize: '14px',
                                                marginLeft: '10px',
                                            }}
                                        >
                                            Reverse sort
                                        </label>
                                    </div>
                                )}

                                {this.state.resizeEnabled && (
                                    <div className="throttle-container">
                                        <label className="throttle-label">
                                            {this.state.isHorizontal
                                                ? 'Height:'
                                                : 'Width:'}
                                        </label>

                                        <button
                                            className="throttle-button"
                                            onClick={this.decreaseWidth}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            className="throttle-input"
                                            value={this.state.dynamicWidth}
                                            onChange={this.handleWidthChange}
                                            min="10"
                                            max="100"
                                        />
                                        <button
                                            className="throttle-button"
                                            onClick={this.increaseWidth}
                                        >
                                            +
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div
                    className={
                        chartType == ('bar' || 'pie') ? 'chart-display' : ''
                    }
                    style={
                        chartType == 'stack'
                            ? {
                                  width: '52%',
                                  marginLeft: '5px',
                                  marginTop: '30px',
                              }
                            : chartType == 'pie'
                            ? {
                                  width: '80%',
                              }
                            : chartType == 'box' || chartType == 'comparison'
                            ? {
                                  width: '78%',
                              }
                            : {}
                    }
                >
                    {chartType == 'stack' && (
                        <>
                            <Select
                                placeholder="Select SampleId.."
                                options={this.state.dropdownOptions}
                                isMulti
                                onChange={this.handleSampleSelectionChange}
                                value={this.state.selectedSamples.map(
                                    (sampleId: any) => ({
                                        value: sampleId,
                                        label: sampleId,
                                    })
                                )}
                                style={{
                                    padding: '10px',
                                    marginTop: '5px',
                                    marginBottom: '5px',
                                    width: '350px',
                                }}
                            />
                        </>
                    )}
                    {chartType == 'box' && (
                        <>
                            <div
                                style={{
                                    margin: '12px auto',
                                    marginLeft: '10px',
                                }}
                            >
                                <Select
                                    placeholder="Select SampleId.."
                                    options={this.state.expressionFilter}
                                    isMulti
                                    onChange={
                                        this
                                            .handleSampleSelectionChangeExpression
                                    }
                                    value={this.state.selectedSamplesExpression.map(
                                        (sampleId: any) => ({
                                            value: sampleId,
                                            label: sampleId,
                                        })
                                    )}
                                    style={{
                                        padding: '1000px',
                                        marginTop: '5px',
                                        marginBottom: '5px',
                                        width: '350px',
                                    }}
                                />
                            </div>
                            <div
                                style={{
                                    margin: '12px auto',
                                    marginLeft: '10px',
                                }}
                            >
                                <Select
                                    placeholder="Select Tissue.."
                                    options={this.state.expressionFilterTissue}
                                    isMulti
                                    onChange={
                                        this
                                            .handleSampleSelectionChangeExpressionTissue
                                    }
                                    value={this.state.selectedSamplesExpressionTissue.map(
                                        (sampleId: any) => ({
                                            value: sampleId,
                                            label: sampleId,
                                        })
                                    )}
                                    style={{
                                        marginTop: '5px',
                                        marginBottom: '5px',
                                        width: '350px',
                                    }}
                                />
                            </div>
                        </>
                    )}
                    {((dataBins && chartType != 'box') ||
                        chartType == 'box' ||
                        chartType == 'comparison') && (
                        <div
                            className="custom-scrollbar"
                            style={
                                chartType == 'stack'
                                    ? {
                                          width: '100%',
                                          overflowX: this.state.isHorizontal
                                              ? 'hidden'
                                              : 'scroll',
                                          border: '1px dashed lightgrey',
                                          padding: '10px',
                                          marginTop: '20px',
                                          borderRadius: '5px',
                                          height: '720px',
                                          overflowY: this.state.isHorizontal
                                              ? 'scroll'
                                              : 'hidden',
                                      }
                                    : chartType == 'pie'
                                    ? {
                                          width: '60%',
                                          border: '1px dashed lightgrey',
                                          borderRadius: '5px',
                                          paddingRight: '5px',
                                          paddingBottom: '10px',
                                          marginLeft: '10px',
                                      }
                                    : chartType == 'box' ||
                                      chartType == 'comparison'
                                    ? {
                                          width: '100%',
                                          border: '1px dashed lightgrey',
                                          padding: '10px',
                                          marginTop: '20px',
                                          marginLeft: '10px',
                                          borderRadius: '5px',
                                          height: '900px',
                                          overflow: 'scroll',
                                      }
                                    : chartType == 'bar'
                                    ? {
                                          margin: '12px auto',
                                          border: '1px dashed lightgrey',
                                          borderRadius: '5px',
                                          padding: '8px',
                                          width: '750px',
                                          marginLeft: '0px',
                                      }
                                    : {
                                          margin: '0px',
                                          border: '0px',
                                          borderRadius: '0px',
                                          padding: '0px',
                                          width: '0px',
                                      }
                            }
                        >
                            {chartType === 'bar' ? (
                                <BarChart
                                    singleCellStore={singleCellStore}
                                    selectedEntity={this.state.selectedEntity}
                                    store={this.props.store}
                                    databinState={this.state.databinState}
                                    setDatabinState={(value: any) =>
                                        this.setState({ databinState: value })
                                    }
                                />
                            ) : chartType === 'pie' ? (
                                <PieChart
                                    singleCellStore={singleCellStore}
                                    pieChartData={pieChartData}
                                    store={this.props.store}
                                    studyViewFilterFlag={
                                        this.state.studyViewFilterFlag
                                    }
                                    setStudyViewFilterFlag={(value: any) =>
                                        this.setState({
                                            studyViewFilterFlag: value,
                                        })
                                    }
                                />
                            ) : chartType === 'stack' ? (
                                <>
                                    <StackedBarChart
                                        store={this.props.store}
                                        pieChartData={pieChartData}
                                        studyViewFilterFlag={
                                            this.state.studyViewFilterFlag
                                        }
                                        setStudyViewFilterFlag={(value: any) =>
                                            this.setState({
                                                studyViewFilterFlag: value,
                                            })
                                        }
                                        setPieChartData={(
                                            value: GenericAssayData[]
                                        ) =>
                                            this.setState({
                                                pieChartData: value,
                                            })
                                        }
                                        setSelectedOption={(value: any) =>
                                            singleCellStore.setSelectedOption(
                                                value
                                            )
                                        }
                                        stackEntity={this.state.stackEntity}
                                        studyIdToStudy={
                                            this.state.studyIdToStudy
                                        }
                                        hoveredSampleId={
                                            this.state.hoveredSampleId
                                        }
                                        setHoveredSampleId={(value: string) =>
                                            this.setState({
                                                hoveredSampleId: value,
                                            })
                                        }
                                        currentTooltipData={
                                            this.state.currentTooltipData
                                        }
                                        setCurrentTooltipData={(value: {
                                            [key: string]: {
                                                [key: string]: React.ReactNode;
                                            };
                                        }) =>
                                            this.setState({
                                                currentTooltipData: value,
                                            })
                                        }
                                        map={this.state.map}
                                        setMap={(value: {
                                            [key: string]: string;
                                        }) => this.setState({ map: value })}
                                        dynamicWidth={this.state.dynamicWidth}
                                        setDynamicWidth={(value: number) =>
                                            this.setState({
                                                dynamicWidth: value,
                                            })
                                        }
                                        setInitialWidth={(value: any) =>
                                            this.setState({
                                                initialWidth: value,
                                            })
                                        }
                                        isHorizontal={this.state.isHorizontal}
                                        setIsHorizontal={(value: any) =>
                                            this.setState({
                                                isHorizontal: value,
                                            })
                                        }
                                        isVisible={this.state.isVisible}
                                        setIsVisible={(value: boolean) =>
                                            this.setState({ isVisible: value })
                                        }
                                        tooltipHovered={
                                            this.state.tooltipHovered
                                        }
                                        setTooltipHovered={(value: boolean) =>
                                            this.setState({
                                                tooltipHovered: value,
                                            })
                                        }
                                        selectedSamples={
                                            this.state.selectedSamples
                                        }
                                        setSelectedSamples={(
                                            value: SampleOption[]
                                        ) => {
                                            this.setState({
                                                selectedSamples: value,
                                            });
                                        }}
                                        dropdownOptions={
                                            this.state.dropdownOptions
                                        }
                                        setDropdownOptions={(
                                            value: SampleOption[]
                                        ) => {
                                            this.setState({
                                                dropdownOptions: value,
                                            });
                                        }}
                                        isReverse={this.state.isReverse}
                                    />
                                </>
                            ) : chartType === 'box' &&
                              this.state.selectedGene ? (
                                <>
                                    <BoxPlot
                                        data={this.state.boxPlotData}
                                        scatterColor={this.state.scatterColor}
                                        selectedSamplesExpression={
                                            this.state.selectedSamplesExpression
                                        }
                                        selectedSampleExpressionTissue={
                                            this.state
                                                .selectedSamplesExpressionTissue
                                        }
                                    />
                                </>
                            ) : chartType === 'comparison' &&
                              this.state.geneCellSelect ? (
                                <>
                                    <ComparisonScatterPlot
                                        gene1Data={this.state.gene1Data}
                                        gene2Data={this.state.gene2Data}
                                        selectedGene1={this.state.compareGene1}
                                        selectedGene2={this.state.compareGene2}
                                        geneCellSelect={
                                            this.state.geneCellSelect
                                        }
                                    />
                                </>
                            ) : null}
                        </div>
                    )}
                </div>
                {chartType == 'stack' && (
                    <div
                        style={{
                            width: '25%',
                            marginTop: '85px',
                            marginLeft: '10px',
                            textAlign: 'left',
                        }}
                    >
                        <StackToolTip
                            studyIdToStudy={this.state.studyIdToStudy}
                            hoveredSampleId={this.state.hoveredSampleId}
                            setHoveredSampleId={(value: string) =>
                                this.setState({ hoveredSampleId: value })
                            }
                            currentTooltipData={this.state.currentTooltipData}
                            setCurrentTooltipData={(value: {
                                [key: string]: {
                                    [key: string]: React.ReactNode;
                                };
                            }) => this.setState({ currentTooltipData: value })}
                            map={this.state.map}
                            setMap={(value: { [key: string]: string }) =>
                                this.setState({ map: value })
                            }
                            isVisible={this.state.isVisible}
                            setIsVisible={(value: boolean) =>
                                this.setState({ isVisible: value })
                            }
                            tooltipHovered={this.state.tooltipHovered}
                            setTooltipHovered={(value: boolean) =>
                                this.setState({ tooltipHovered: value })
                            }
                        />
                    </div>
                )}
                {chartType === null && (
                    <>
                        <div
                            className={'alert alert-info'}
                            style={{
                                height: '32px',
                                marginLeft: '10px',
                            }}
                        >
                            Please select profile or type of chart.
                        </div>
                    </>
                )}
            </div>
        );
    }
}

export default HomePage;
