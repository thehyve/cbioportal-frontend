import {assert} from "chai";
import {
    heatmapClusterValueFn, numTracksWhoseDataChanged, transitionSortConfig,
    transition, transitionTrackGroupSortPriority
} from "./DeltaUtils";
import {createStubInstance, match, SinonStub, spy} from "sinon";
import OncoprintJS from "oncoprintjs";
import { MolecularProfile, CancerStudy } from 'shared/api/generated/CBioPortalAPI';
import { AlterationTypeConstants } from 'pages/resultsView/ResultsViewPageStore';
import {
    CLINICAL_TRACK_GROUP_INDEX,
    GENETIC_TRACK_GROUP_INDEX,
    IHeatmapTrackSpec,
    IOncoprintProps
} from "./Oncoprint";
import { SortOrder } from "shared/api/generated/CBioPortalAPIInternal";

describe("Oncoprint DeltaUtils", ()=>{
    describe("numTracksWhoseDataChanged", ()=>{
        it("should return 0 for empty inputs", ()=>{
            assert.equal(numTracksWhoseDataChanged([], []), 0);
        });
        it("should return 2 for one empty input and one with two (both added/deleted)", ()=>{
            assert.equal(numTracksWhoseDataChanged([{key:"a", data:[]},{key:"b", data:[]}], []), 2, "tracks added");
            assert.equal(numTracksWhoseDataChanged([], [{key:"a", data:[]},{key:"b", data:[]}]), 2, "tracks deleted");
        });
        it("should return 3 for one track deleted, one track added, one track changed", ()=>{
            let state1 = [{key:"a", data:[]}, {key:"b", data:[]}];
            let state2 = [{key:"b", data:[1]}, {key:"c", data:[]}];
            assert.equal(numTracksWhoseDataChanged(state1, state2), 3, "test one direction");
            assert.equal(numTracksWhoseDataChanged(state2, state1), 3, "test other direction");
        });
        it("should return X for X tracks changed", ()=>{
            let state1 = [{key:"a", data:[1]}, {key:"b", data:[3,4]}, {key:"c", data:[6,1]}, {key:"d",data:[10]}];
            let state2 = [{key:"a", data:[]}, {key:"b", data:[33,3,4]}, {key:"c", data:[10,20]}, {key:"d",data:[-6,-3,1,0]}];
            for (let i=0; i<state1.length; i++) {
                assert.equal(numTracksWhoseDataChanged(state1.slice(i), state2.slice(i)), state1.length - i);
                assert.equal(numTracksWhoseDataChanged(state2.slice(i), state1.slice(i)), state1.length - i);
            }
        });
    });

    describe("transition", () => {
        const makeMinimalOncoprintProps = (): IOncoprintProps => ({
            clinicalTracks: [],
            geneticTracks: [],
            genesetHeatmapTracks: [],
            heatmapTracks: [],
            divId: 'myDomId',
            width: 1000,
        });
        const makeMinimalProfileMap = () => undefined;

        it("renders an expandable genetic track if an expansion callback is provided for it", () => {
            // given a genetic track specification with an expandCallback
            const expansionCallback = spy();
            const newProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [{
                    key: 'GENETICTRACK_1',
                    label: 'GENE1 / GENE2',
                    oql: '[GENE1: AMP; GENE2: AMP;]',
                    info: '10%',
                    data: [],
                    expansionCallback: expansionCallback
                }]
            };
            const oncoprint: OncoprintJS<any> = createStubInstance(OncoprintJS);
            (oncoprint.addTracks as SinonStub).returns([1]);
            const trackIdsByKey = {};
            // when instructed to render the track from scratch
            transition(
                newProps,
                makeMinimalOncoprintProps(),
                oncoprint,
                () => trackIdsByKey,
                () => makeMinimalProfileMap()
            );
            // then it adds a track with an expandCallback track property that
            // calls the provided function
            assert.isTrue((oncoprint.addTracks as SinonStub).called);
            (oncoprint.addTracks as SinonStub).args.forEach(([trackParamArray]) => {
                trackParamArray.forEach((trackParams: any) => {
                    if (trackParams.expandCallback !== undefined) {
                        trackParams.expandCallback();
                    }
                });
            });
            assert.isTrue(
                expansionCallback.called,
                'calling the expand callbacks of added tracks should invoke the one provided'
            );
        });

        it("renders expansion tracks if they are added to an existing genetic track", () => {
            // given a genetic track specification with three expansion tracks
            const expandableTrack = {
                key: 'GENETICTRACK_0',
                label: 'GENE5 / GENE7 / GENE1',
                oql: '[GENE5: HOMDEL; GENE7: AMP HOMDEL; GENE1: HOMDEL]',
                info: '60%',
                data: [],
            };
            const oldProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [expandableTrack]
            };
            const newProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [{
                    ...expandableTrack,
                    expansionTrackList: [
                        {key: 'GENETICTRACK_0_EXPANSION_0', label: 'GENE5', oql: 'GENE5: HOMDEL', info: '30%', data: []},
                        {key: 'GENETICTRACK_0_EXPANSION_1', label: 'GENE7', oql: 'GENE7: AMP HOMDEL', info: '40%', data: []},
                        {key: 'GENETICTRACK_0_EXPANSION_2', label: 'GENE1', oql: 'GENE1: HOMDEL', info: '10%', data: []}
                    ]
                }]
            };
            const oncoprint: OncoprintJS<any> = createStubInstance(OncoprintJS);
            (oncoprint.addTracks as SinonStub).returns([1]);
            const trackIdsByKey = {'GENETICTRACK_0': 5};
            // when instructed to render the track from scratch
            transition(
                newProps,
                oldProps,
                oncoprint,
                () => trackIdsByKey,
                () => makeMinimalProfileMap()
            );
            // then it adds the three expansion tracks to the Oncoprint
            assert.equal(
                (oncoprint.addTracks as SinonStub).callCount,
                3,
                'Adding three expansion tracks should involve adding three tracks'
            );
            assert.isTrue(
                (oncoprint.addTracks as SinonStub).alwaysCalledWith(
                    [match.has('expansion_of', trackIdsByKey['GENETICTRACK_0'])]
                ),
                'Expansion tracks should be marked as expansions of their parent'
            );
            assert.isTrue(
                (oncoprint.addTracks as SinonStub).calledWith(
                    [match({label: 'GENE7', track_info: '40%'})]
                ),
                'The expansion tracks added should correspond to those requested'
            );
        });

        it("disables further expansion if expansions are added to a genetic track", () => {
            // given
            const expandableTrack = {
                key: 'GENETICTRACK_0',
                label: 'MY_EXPANDABLE_TRACK',
                oql: '["MY_EXPANDABLE_TRACK" GENE3;]',
                info: '0%',
                data: []
            };
            const oldProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [expandableTrack]
            };
            const newProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [{
                    ...expandableTrack,
                    expansionTrackList: [
                        {key: 'GENETICTRACK_0_EXPANSION_0', label: 'GENE3', oql: 'GENE3;', info: '0%', data: []}
                    ]
                }]
            };
            const trackIdsByKey = {'GENETICTRACK_0': 8};
            const oncoprint = createStubInstance(OncoprintJS);
            (oncoprint.addTracks as SinonStub).returns([1]);
            // when
            transition(
                newProps,
                oldProps,
                oncoprint,
                () => trackIdsByKey,
                () => makeMinimalProfileMap()
            );
            // then
            assert.isTrue((oncoprint.disableTrackExpansion as SinonStub).calledWith(8));
        });

        it("re-enables expansion if an expandable genetic track no longer has expansions", () => {
            // given
            const expandableTrack = {
                key: 'GENETICTRACK_0',
                label: 'GENE3 / GENE4',
                oql: '[GENE3; GENE4]',
                info: '0%',
                data: [],
                expansionCallback: () => { /* do nothing */ }
            };
            const oldProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [{
                    ...expandableTrack,
                    expansionTrackList: [
                        {key: 'GENETICTRACK_0_EXPANSION_0', label: 'GENE3', oql: 'GENE3;', info: '0%', data: []},
                        {key: 'GENETICTRACK_0_EXPANSION_1', label: 'GENE4', oql: 'GENE4;', info: '0%', data: []}
                    ]
                }]
            };
            const newProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [expandableTrack]
            };
            const trackIdsByKey = {'GENETICTRACK_0': 2};
            const oncoprint = createStubInstance(OncoprintJS);
            (oncoprint.addTracks as SinonStub).returns([1]);
            // when
            transition(
                newProps,
                oldProps,
                oncoprint,
                () => trackIdsByKey,
                () => makeMinimalProfileMap()
            );
            // then
            assert.isTrue((oncoprint.enableTrackExpansion as SinonStub).calledWith(2));
        });

        it("supplies genetic expansions with callbacks that update track IDs when collapsing", () => {
            // given a track being expanded
            const expandableTrack = {
                key: 'GENETICTRACK_0',
                label: 'GENE1 / GENE2',
                oql: '[GENE1: MUT; GENE2: MUT]',
                info: '6.28%',
                data: [],
            };
            const preExpandProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [expandableTrack]
            };
            const postExpandProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [{
                    ...expandableTrack,
                    expansionTrackList: [
                        {key: 'GENETICTRACK_0_EXPANSION_0', label: 'GENE1', oql: 'GENE5: MUT', info: '0%', data: []},
                        {key: 'GENETICTRACK_0_EXPANSION_1', label: 'GENE2', oql: 'GENE7: MUT', info: '6.28%', data: []},
                    ]
                }]
            };
            const oncoprint: OncoprintJS<any> = createStubInstance(OncoprintJS);
            (oncoprint.addTracks as SinonStub).returns([27]);
            const trackIdsByKey: {[trackKey: string]: number} = {
                'GENETICTRACK_0': 5
            };
            // when rendering this transition
            transition(
                postExpandProps,
                preExpandProps,
                oncoprint,
                () => trackIdsByKey,
                () => makeMinimalProfileMap()
            );
            // then it lists these expansions' IDs in the map and passes the
            // newly added tracks callbacks that unlist them again
            assert.deepEqual(
                trackIdsByKey,
                {
                    'GENETICTRACK_0': 5,
                    'GENETICTRACK_0_EXPANSION_0': 27,
                    'GENETICTRACK_0_EXPANSION_1': 27
                },
                "expansion tracks should have been listed before they're removed"
            );
            (oncoprint.addTracks as SinonStub).args.forEach(
                // call the removeCallback with the track ID
                ([[trackParams]]) => { trackParams.removeCallback(27); }
            );
            assert.deepEqual(
                trackIdsByKey,
                {'GENETICTRACK_0': 5},
                'expansion tracks should have disappeared from the list after removal'
            );
        });

        it("renders a genetic track with a coloured label if so requested", () => {
            // given a genetic track specification with a label color
            const newProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                geneticTracks: [{
                    key: 'GENETICTRACK_14',
                    label: 'GENE7',
                    oql: 'GENE7: A316M;',
                    info: '0%',
                    data: [],
                    labelColor: 'fuchsia'
                }]
            };
            const oncoprint: OncoprintJS<any> = createStubInstance(OncoprintJS);
            (oncoprint.addTracks as SinonStub).returns([1]);
            const trackIdsByKey = {};
            // when instructed to render the track from scratch
            transition(
                newProps,
                makeMinimalOncoprintProps(),
                oncoprint,
                () => trackIdsByKey,
                () => makeMinimalProfileMap()
            );
            // then it adds a track with the specified track label color
            assert.isTrue(
                (oncoprint.addTracks as SinonStub).calledWith(
                    [match.has('track_label_color', 'fuchsia')]
                )
            );
        });

        it("renders a heatmap track with a coloured label if so requested", () => {
            // given a single-gene heatmap track specification with a label color
            const newProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                heatmapTracks: [{
                    key: '"HEATMAPTRACK_mystudy_Zscores,GENE25"',
                    label: '  GENE25',
                    data: [],
                    molecularProfileId: 'mystudy_Zscores',
                    molecularAlterationType: 'MRNA_EXPRESSION',
                    datatype: 'Z-SCORE',
                    onRemove: () => { /* update external state */ },
                    trackGroupIndex: 3,
                    labelColor: 'olive'
                }]
            };
            const oncoprint: OncoprintJS<any> = createStubInstance(OncoprintJS);
            (oncoprint.addTracks as SinonStub).returns([1]);
            const trackIdsByKey = {};
            // when instructed to render the track from scratch
            transition(
                newProps,
                makeMinimalOncoprintProps(),
                oncoprint,
                () => trackIdsByKey,
                () => makeMinimalProfileMap()
            );
            // then it adds a track with the specified track label color
            assert.isTrue(
                (oncoprint.addTracks as SinonStub).calledWith(
                    [match.has('track_label_color', 'olive')]
                )
            );
        });
    });

    describe("transitionTrackGroupSortPriority", ()=>{
        let oncoprint:any;
        beforeEach(()=>{
            oncoprint = {setTrackGroupSortPriority: spy()};
        });
        it("should not do anything if the heatmap tracks are both empty", ()=>{
           transitionTrackGroupSortPriority(
               {heatmapTracks:[], genesetHeatmapTracks:[]},
               {heatmapTracks:[], genesetHeatmapTracks:[]},
               oncoprint
           );
           assert.equal(oncoprint.setTrackGroupSortPriority.callCount, 0);
        });
        it("should not do anything on initialisation if no heatmap tracks are added", ()=>{
           transitionTrackGroupSortPriority(
               {heatmapTracks:[], genesetHeatmapTracks:[]},
               {},
               oncoprint
           );
           assert.equal(oncoprint.setTrackGroupSortPriority.callCount, 0);
        });
        it("should not do anything if the heatmap tracks are the same", ()=>{
            transitionTrackGroupSortPriority(
                {heatmapTracks:[{trackGroupIndex: 2}, {trackGroupIndex: 3}], genesetHeatmapTracks: []},
                {heatmapTracks:[{trackGroupIndex: 2}, {trackGroupIndex: 3}], genesetHeatmapTracks: []},
                oncoprint
            );
            assert.equal(oncoprint.setTrackGroupSortPriority.callCount, 0);
        });
        it("should not do anything if the gene set heatmap tracks are the same", ()=>{
            transitionTrackGroupSortPriority(
                {heatmapTracks:[], genesetHeatmapTracks: [{trackGroupIndex: 2}]},
                {heatmapTracks:[], genesetHeatmapTracks: [{trackGroupIndex: 2}]},
                oncoprint
            );
            assert.equal(oncoprint.setTrackGroupSortPriority.callCount, 0);
        });
        it("should not do anything if the heatmap tracks are different but same groups", ()=>{
            transitionTrackGroupSortPriority(
                {heatmapTracks:[{trackGroupIndex: 2}, {trackGroupIndex: 3}, {trackGroupIndex: 3}, {trackGroupIndex: 3}], genesetHeatmapTracks: []},
                {heatmapTracks:[{trackGroupIndex: 2}, {trackGroupIndex: 2}, {trackGroupIndex: 2}, {trackGroupIndex: 3}], genesetHeatmapTracks: []},
                oncoprint
            );
            assert.equal(oncoprint.setTrackGroupSortPriority.callCount, 0);
        });
        it("should set the track group sort priority if the heatmap track groups have changed and no gene set heatmap is present", ()=>{
            transitionTrackGroupSortPriority(
                {heatmapTracks:[{trackGroupIndex: 2}, {trackGroupIndex: 4}, {trackGroupIndex: 2}, {trackGroupIndex: 3}], genesetHeatmapTracks: []},
                {heatmapTracks:[{trackGroupIndex: 2}, {trackGroupIndex: 3}, {trackGroupIndex: 3}, {trackGroupIndex: 3}], genesetHeatmapTracks: []},
                oncoprint
            );
            assert.equal(oncoprint.setTrackGroupSortPriority.callCount, 1, "called once");
            assert.deepEqual(
                oncoprint.setTrackGroupSortPriority.args[0][0],
                [CLINICAL_TRACK_GROUP_INDEX, 2, 3, 4, GENETIC_TRACK_GROUP_INDEX],
                "right priority order"
            );
        });
        it("should set the track group sort priority including gene set heatmaps if heatmap track groups have changed", ()=>{
            transitionTrackGroupSortPriority(
                {
                    heatmapTracks: [{trackGroupIndex: 2}, {trackGroupIndex: 4}, {trackGroupIndex: 2}, {trackGroupIndex: 3}],
                    genesetHeatmapTracks: [{trackGroupIndex: 5}]
                },
                {
                    heatmapTracks:[{trackGroupIndex: 2}, {trackGroupIndex: 3}, {trackGroupIndex: 3}, {trackGroupIndex: 3}],
                    genesetHeatmapTracks: [{trackGroupIndex: 4}]
                },
                oncoprint
            );
            assert.equal(oncoprint.setTrackGroupSortPriority.callCount, 1, "called once");
            assert.deepEqual(
                oncoprint.setTrackGroupSortPriority.args[0][0],
                [CLINICAL_TRACK_GROUP_INDEX, 2, 3, 4, 5, GENETIC_TRACK_GROUP_INDEX],
                "right priority order"
            );
        });
        it("should set the track group sort priority on initialisation if only a gene set heatmap is present", ()=>{
            transitionTrackGroupSortPriority(
                {heatmapTracks:[], genesetHeatmapTracks: [{trackGroupIndex: 2}, {trackGroupIndex: 2}]},
                {},
                oncoprint
            );
            assert.equal(oncoprint.setTrackGroupSortPriority.callCount, 1, "called once");
            assert.deepEqual(
                oncoprint.setTrackGroupSortPriority.args[0][0],
                [CLINICAL_TRACK_GROUP_INDEX, 2, GENETIC_TRACK_GROUP_INDEX],
                "right priority order"
            );
        });
    });

    describe("transitionSortConfig", ()=>{
        let oncoprint:any;
        beforeEach(()=>{
            oncoprint = { setSortConfig:spy(()=>{}) };
        });
        it("should not do anything if no sortConfig specified", ()=>{
            transitionSortConfig({}, {}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 0);
        });
        it("should not do anything if the given sort configs have no order or cluster heatmap group specified, regardless of changes", ()=>{
            transitionSortConfig({sortConfig:{}}, {sortConfig:{}}, oncoprint);
            transitionSortConfig({sortConfig:{sortByMutationType:true}}, {sortConfig:{sortByMutationType:false}}, oncoprint);
            transitionSortConfig({sortConfig:{sortByMutationType:true}}, {sortConfig:{sortByMutationType:true}}, oncoprint);
            transitionSortConfig({sortConfig:{sortByDrivers:true}}, {sortConfig:{sortByMutationType:false, sortByDrivers: false}}, oncoprint);
            transitionSortConfig({sortConfig:{}}, {sortConfig:{sortByMutationType:false}}, oncoprint);
            transitionSortConfig({}, {sortConfig:{sortByMutationType:false}}, oncoprint);
            transitionSortConfig({sortConfig:{sortByMutationType:false}}, {}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 0);
        });
        it("should set the config to new order if order is specified, no sort config specified before", ()=>{
            transitionSortConfig({sortConfig:{order:["5","3","2"]}},{}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 1, "called once");
            assert.deepEqual(oncoprint.setSortConfig.args[0][0], {type:"order", order:["5","3","2"]}, "correct sort config used");
        });
        it("should set the config to new order if order is specified, no order specified before", ()=>{
            transitionSortConfig({sortConfig:{order:["5","3","2"]}},{sortConfig:{}}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 1, "called once");
            assert.deepEqual(oncoprint.setSortConfig.args[0][0], {type:"order", order:["5","3","2"]}, "correct sort config used");
        });
        it("should set the config to new order if order is specified, different order specified before", ()=>{
            transitionSortConfig({sortConfig:{order:["6","4","0","2"]}},{sortConfig:{order:["1"]}}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 1, "called once");
            assert.deepEqual(oncoprint.setSortConfig.args[0][0], {type:"order", order:["6","4","0","2"]}, "correct sort config used");
        });
        it("should not do anything if same order given (same object, shallow equality)", ()=>{
            const order = "0,1,2,3,4".split(",");
            transitionSortConfig({sortConfig:{order}},{sortConfig:{order}}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 0);
        });
        it("should set the config to order, if order and cluster heatmap group specified", ()=>{
            const order = "0,1,2,3,4".split(",");
            transitionSortConfig({sortConfig:{order, clusterHeatmapTrackGroupIndex:1}},{sortConfig:{order}}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 0, "no change registered bc order overrides heatmap");

            transitionSortConfig({sortConfig:{order, clusterHeatmapTrackGroupIndex:1}}, {}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 1, "called once");
            assert.deepEqual(oncoprint.setSortConfig.args[0][0], { type: "order", order}, "correct sort config used");
        });
        it("should set the config to heatmap if heatmap index specified, no sort config specified before", ()=>{
            transitionSortConfig({sortConfig:{clusterHeatmapTrackGroupIndex:1}}, {}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 1, "called once");
            assert.deepEqual(oncoprint.setSortConfig.args[0][0], {type:"cluster", track_group_index:1, clusterValueFn: heatmapClusterValueFn}, "correct sort config used");
        });
        it("should set the config to heatmap if heatmap index specified, no heatmap index or order specified before", ()=>{
            transitionSortConfig({sortConfig:{clusterHeatmapTrackGroupIndex:1}}, {sortConfig:{}}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 1, "called once");
            assert.deepEqual(oncoprint.setSortConfig.args[0][0], {type:"cluster", track_group_index:1, clusterValueFn: heatmapClusterValueFn}, "correct sort config used");
        });
        it("should set the config to heatmap if heatmap index specified, no heatmap index specified before, order specified before", ()=>{
            transitionSortConfig({sortConfig:{clusterHeatmapTrackGroupIndex:1}}, {sortConfig:{order:["1"]}}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 1, "called once");
            assert.deepEqual(oncoprint.setSortConfig.args[0][0], {type:"cluster", track_group_index:1, clusterValueFn: heatmapClusterValueFn}, "correct sort config used");
        });
        it("should set the config to heatmap if heatmap index specified, different heatmap index specified before", ()=>{
            transitionSortConfig({sortConfig:{clusterHeatmapTrackGroupIndex:5}}, {sortConfig:{clusterHeatmapTrackGroupIndex:2}}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 1, "called once");
            assert.deepEqual(oncoprint.setSortConfig.args[0][0], {type:"cluster", track_group_index:5, clusterValueFn: heatmapClusterValueFn}, "correct sort config used");
        });
        it("should not do anything if heatmap index specified, same heatmap index specified before", ()=>{
            transitionSortConfig({sortConfig:{clusterHeatmapTrackGroupIndex:2}}, {sortConfig:{clusterHeatmapTrackGroupIndex:2}}, oncoprint);
            assert.equal(oncoprint.setSortConfig.callCount, 0);
        });
    });

    describe('Treatment heatmap tracks', () => {

        const makeMinimalOncoprintProps = (): IOncoprintProps => ({
            clinicalTracks: [],
            geneticTracks: [],
            genesetHeatmapTracks: [],
            heatmapTracks: [],
            divId: 'myDomId',
            width: 1000
        });

        const trackSpecKeyToTrackId = () => {return {
            'TREATMENTTRACK_1': 1,
            'TREATMENTTRACK_2': 2
        };};

        const molecularProfileMap = () => {return{
// tslint:disable-next-line: no-object-literal-type-assertion
            'profile1': {
                'datatype': 'TREATMENT_RESPONSE',
                'description': 'asdadasd',
                'molecularAlterationType': "TREATMENT_RESPONSE",
                'molecularProfileId': 'profile1',
                'name': 'asasdas',
                'showProfileInAnalysisTab': true,
                'study': {} as any,
                'studyId': 'study1',
                'pivotThreshold': 1,
                'sortOrder': SortOrder.ASC} as MolecularProfile
        };};

        it('receive track id for ruleset sharing of last added treatment profile', () => {

            const prevProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                heatmapTracks: [{
                    key: 'TREATMENTTRACK_1',
                    label: '',
                    molecularProfileId: "profile1",
                    molecularAlterationType: "TREATMENT_RESPONSE",
                    data: [
                        {profile_data: 1, study: "study1", uid: "uid"}, 
                        {profile_data: 2, study: "study1", uid: "uid"}, 
                        {profile_data: 3, study: "study1", uid: "uid"}
                    ],
                    datatype: "TREATMENT_RESPONSE",
                    trackGroupIndex: 1,
                    onRemove: () => {}
                }]
            };

            const nextProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                heatmapTracks: [{
                    key: 'TREATMENTTRACK_1',
                    label: '',
                    molecularProfileId: "profile1",
                    molecularAlterationType: "TREATMENT_RESPONSE",
                    data: [
                        {profile_data: 1, study: "study1", uid: "uid"}, 
                        {profile_data: 2, study: "study1", uid: "uid"}, 
                        {profile_data: 3, study: "study1", uid: "uid"}
                    ],
                    datatype: "TREATMENT_RESPONSE",
                    trackGroupIndex: 1,
                    onRemove: () => {}
                },{
                    key: 'TREATMENTTRACK_2',
                    label: '',
                    molecularProfileId: "profile1",
                    molecularAlterationType: "TREATMENT_RESPONSE",
                    data: [
                        {profile_data: 4, study: "study1", uid: "uid"}, 
                        {profile_data: 5, study: "study1", uid: "uid"}, 
                        {profile_data: 6, study: "study1", uid: "uid"}
                    ],
                    datatype: "TREATMENT_RESPONSE",
                    trackGroupIndex: 1,
                    onRemove: () => {}
                }]
            };

            let oncoprint: OncoprintJS<any> = createStubInstance(OncoprintJS);
            
            // deacitvated because private method
            //transitionTracks(prevProps, prevProps, oncoprint, trackSpecKeyToTrackId, molecularProfileMap);
            
            assert.equal(prevProps.heatmapTracks[0].maxProfileValue, 3);
            assert.equal(prevProps.heatmapTracks[0].ruleSetTrackId, 1);
            
            // oncoprint = createStubInstance(OncoprintJS);
            // deacitvated because private method
            //transitionTracks(nextProps, prevProps, oncoprint, trackSpecKeyToTrackId, molecularProfileMap);

            // TODO: fix problems with the line above throwing an error, I have no clue why this happens.

            // assert.equal(nextProps.heatmapTracks[0].maxProfileValue, 6);
            // assert.equal(nextProps.heatmapTracks[0].ruleSetTrackId, 2);

            // assert.equal(prevProps.heatmapTracks[0].maxProfileValue, 6);
            // assert.equal(prevProps.heatmapTracks[0].ruleSetTrackId, 2);

        });

        it('shareRuleSet called', () => {

            const prevProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                heatmapTracks: [{
                    key: 'TREATMENTTRACK_1',
                    label: '',
                    molecularProfileId: "profile1",
                    molecularAlterationType: "TREATMENT_RESPONSE",
                    data: [
                        {profile_data: 1, study: "study1", uid: "uid"}, 
                        {profile_data: 2, study: "study1", uid: "uid"}, 
                        {profile_data: 3, study: "study1", uid: "uid"}
                    ],
                    datatype: "TREATMENT_RESPONSE",
                    trackGroupIndex: 1,
                    onRemove: () => {}
                }]
            };

            const nextProps: IOncoprintProps = {
                ...makeMinimalOncoprintProps(),
                heatmapTracks: [{
                    key: 'TREATMENTTRACK_1',
                    label: '',
                    molecularProfileId: "profile1",
                    molecularAlterationType: "TREATMENT_RESPONSE",
                    data: [
                        {profile_data: 1, study: "study1", uid: "uid"}, 
                        {profile_data: 2, study: "study1", uid: "uid"}, 
                        {profile_data: 3, study: "study1", uid: "uid"}
                    ],
                    datatype: "TREATMENT_RESPONSE",
                    trackGroupIndex: 1,
                    onRemove: () => {}
                },{
                    key: 'TREATMENTTRACK_2',
                    label: '',
                    molecularProfileId: "profile1",
                    molecularAlterationType: "TREATMENT_RESPONSE",
                    data: [
                        {profile_data: 4, study: "study1", uid: "uid"}, 
                        {profile_data: 5, study: "study1", uid: "uid"}, 
                        {profile_data: 6, study: "study1", uid: "uid"}
                    ],
                    datatype: "TREATMENT_RESPONSE",
                    trackGroupIndex: 1,
                    onRemove: () => {}
                }]
            };

            let oncoprint: OncoprintJS<any> = createStubInstance(OncoprintJS);
            
            // deacitvated because private method
            //transitionTracks(prevProps, prevProps, oncoprint, trackSpecKeyToTrackId, molecularProfileMap);
            
            assert.isTrue((oncoprint.shareRuleSet as SinonStub).called);
            
        });

    });
});