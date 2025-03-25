import React, { useState, useEffect, useRef } from 'react';
import { VictoryPie, VictoryTooltip, VictoryChart, VictoryAxis } from 'victory';
import {
    handleDownloadSvgUtils,
    handleDownloadDataUtils,
} from './downloadUtils';
import './styles.css';
import { jsPDF } from 'jspdf-yworks';
import { observer } from 'mobx-react-lite';
import singleCellStore_importedDirectly from './SingleCellStore';
import { colors, PatientData } from './SingleCellStore';
import { StudyViewPageStore } from 'pages/studyView/StudyViewPageStore';
import { GenericAssayData } from 'cbioportal-ts-api-client';
import PieChart from 'pages/studyView/charts/pieChart/PieChart';
interface ChartProps {
    singleCellStore: any;
    pieChartData: GenericAssayData[];
    store: StudyViewPageStore;
    studyViewFilterFlag: boolean;
    setStudyViewFilterFlag: (value: any) => void;
}

interface PieChartData {
    value: string;
    percentage: number;
    color?: string;
}

interface VictoryEventProps {
    index: number;
}

const Chart: React.FC<ChartProps> = observer(
    ({
        singleCellStore,
        pieChartData,
        store,
        studyViewFilterFlag,
        setStudyViewFilterFlag,
    }) => {
        const {
            dataBins,
            tooltipEnabled,
            downloadSvg,
            setDownloadSvg,
            downloadPdf,
            setDownloadPdf,
            heading,
            isHovered,
            setIsHovered,
            hoveredSliceIndex,
            setHoveredSliceIndex,
        } = singleCellStore;

        if (!singleCellStore) {
            return null;
        }
        const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
        const [tooltipHovered, setTooltipHovered] = useState<boolean>(false);
        const [downloadOptionsVisible, setDownloadOptionsVisible] = useState<
            boolean
        >(false);

        const svgRef = useRef<SVGSVGElement>(null);

        let differentPatientIds: string[] = [];
        for (let i = 0; i < pieChartData.length; i++) {
            let currentId = pieChartData[i].patientId;
            if (!differentPatientIds.includes(currentId)) {
                differentPatientIds.push(currentId);
            }
        }
        let patientData: PatientData = {};
        for (let i = 0; i < differentPatientIds.length; i++) {
            let id = differentPatientIds[i];
            patientData[id] = [];
            for (let j = 0; j < pieChartData.length; j++) {
                if (pieChartData[j].patientId === id) {
                    patientData[id].push({
                        stableId: pieChartData[j].stableId,
                        value: parseFloat(pieChartData[j].value),
                    });
                }
            }
        }
        useEffect(() => {
            if (tooltipEnabled) {
                setTooltipVisible(true);
            } else {
                if (isHovered || tooltipHovered) {
                    setTooltipVisible(true);
                } else {
                    const timeoutId = setTimeout(
                        () => setTooltipVisible(false),
                        300
                    );
                    return () => clearTimeout(timeoutId);
                }
            }
        }, [isHovered, tooltipHovered, tooltipEnabled]);
        const uniqueIds: any = [
            ...new Set(
                pieChartData.map((item: any) => item.genericAssayStableId)
            ),
        ];
        const sumValues: { [key: string]: number } = {};
        let totalSum = 0;
        uniqueIds.forEach((id: string) => {
            sumValues[id] = pieChartData.reduce((acc: number, item: any) => {
                if (item.genericAssayStableId === id) {
                    const value = parseFloat(item.value);
                    totalSum += value;
                    return acc + value;
                }
                return acc;
            }, 0);
        });

        const pieData = Object.keys(sumValues).map((key, index) => {
            const color = colors[index];
            return {
                value: key,
                percentage: sumValues[key],
                color: color,
            };
        });
        const pieData2 = Object.keys(sumValues).map((key, index) => {
            const color = colors[index];
            const count = sumValues[key];
            const percentage = count / totalSum;
            const freq = (percentage * 100).toFixed(2) + '%';

            return {
                value: key,
                count: count,
                freq: freq,
                color: color,
                percentage: percentage,
            };
        });

        useEffect(() => {
            setStudyViewFilterFlag(true);
        }, [store.selectedSamples.result]);
        console.log(pieData, 'here is piedata');
        return (
            <>
                <div id="div-to-download" style={{ position: 'relative' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '60vh',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginTop: '100px',
                                alignItems: 'center',
                                marginBottom: '20px',
                            }}
                        >
                            <PieChart
                                width={500}
                                height={560}
                                ref={undefined}
                                onUserSelection={() => {}}
                                openComparisonPage={undefined}
                                filters={[]}
                                data={pieData2}
                                placement={'right'}
                                label={'Type of cell'}
                                labelDescription={'dummy'}
                                patientAttribute={true}
                            />
                        </div>
                    </div>

                    <div
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            cursor: 'pointer',
                            border: '1px solid lightgrey',
                            padding: '5px',
                            borderRadius: '4px',
                            transition: 'background-color 0.3s ease',
                        }}
                        onMouseEnter={() => setDownloadOptionsVisible(true)}
                        onMouseLeave={() => setDownloadOptionsVisible(false)}
                        className="btn btn-default btn-xs"
                    >
                        <i
                            className="fa fa-cloud-download"
                            aria-hidden="true"
                        />
                        {downloadOptionsVisible && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'white',
                                    boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                                    zIndex: 220,
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    transition: 'opacity 0.3s ease-out',
                                    opacity: downloadOptionsVisible ? 1 : 0,
                                }}
                            >
                                <div
                                    style={{
                                        padding: '8px',
                                        cursor: 'pointer',
                                        transition:
                                            'background-color 0.3s ease',
                                    }}
                                    onClick={() =>
                                        handleDownloadSvgUtils(
                                            'div-to-download',
                                            'piechart_chart',
                                            'pieChart'
                                        )
                                    }
                                    onMouseEnter={e =>
                                        (e.currentTarget.style.backgroundColor =
                                            '#f0f0f0')
                                    }
                                    onMouseLeave={e =>
                                        (e.currentTarget.style.backgroundColor =
                                            'white')
                                    }
                                >
                                    SVG
                                </div>
                                <div
                                    style={{
                                        padding: '8px',
                                        cursor: 'pointer',
                                        transition:
                                            'background-color 0.3s ease',
                                    }}
                                    onClick={() =>
                                        handleDownloadDataUtils(
                                            pieChartData,
                                            'pie_chart_data.txt'
                                        )
                                    }
                                    onMouseEnter={e =>
                                        (e.currentTarget.style.backgroundColor =
                                            '#f0f0f0')
                                    }
                                    onMouseLeave={e =>
                                        (e.currentTarget.style.backgroundColor =
                                            'white')
                                    }
                                >
                                    Data
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            marginLeft: '250px',
                            marginRight: '250px',
                            marginBottom: '40px',
                        }}
                    >
                        {pieData.map((data: any, index: any) => (
                            <div key={index} style={{ marginTop: '10px' }}>
                                <div
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: data.color,
                                        display: 'inline-block',
                                        marginLeft: '10px',
                                        marginRight: '10px',
                                    }}
                                ></div>
                                <span
                                    className="pie-label"
                                    data-percentage={(
                                        (data.percentage / totalSum) *
                                        100
                                    ).toFixed(2)}
                                >
                                    {data.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    }
);

export default Chart;
