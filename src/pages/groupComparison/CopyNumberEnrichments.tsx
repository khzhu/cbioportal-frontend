import * as React from "react";
import {observer} from "mobx-react";
import EnrichmentsDataSetDropdown from "../resultsView/enrichments/EnrichmentsDataSetDropdown";
import AlterationEnrichmentContainer from "../resultsView/enrichments/AlterationEnrichmentsContainer";
import GroupComparisonStore from "./GroupComparisonStore";
import autobind from "autobind-decorator";
import {MolecularProfile} from "../../shared/api/generated/CBioPortalAPI";
import {MakeMobxView} from "../../shared/components/MobxView";
import LoadingIndicator from "../../shared/components/loadingIndicator/LoadingIndicator";
import ErrorMessage from "../../shared/components/ErrorMessage";
import {MakeEnrichmentsTabUI, getNumSamples} from "./GroupComparisonUtils";
import { remoteData } from "public-lib/api/remoteData";
import _ from "lodash";
import { AlterationContainerType } from "pages/resultsView/enrichments/EnrichmentsUtil";

export interface ICopyNumberEnrichmentsProps {
    store: GroupComparisonStore;
}

@observer
export default class CopyNumberEnrichments extends React.Component<ICopyNumberEnrichmentsProps, {}> {
    @autobind
    private onChangeProfile(profileMap:{[studyId:string]:MolecularProfile}) {
        this.props.store.setCopyNumberEnrichmentProfileMap(profileMap);
    }

    readonly tabUI = MakeEnrichmentsTabUI(()=>this.props.store, ()=>this.enrichmentsUI, "copy-number", true, true, true);

    private readonly enrichmentAnalysisGroups = remoteData({
        await:()=>[this.props.store.activeGroups],
        invoke:()=>{
            const groups = _.map(this.props.store.activeGroups.result, group => {
                return {
                    name:group.nameWithOrdinal,
                    description:`Number (percentage) of ${this.props.store.usePatientLevelEnrichments ? "patients" : "samples"} in ${group.nameWithOrdinal} that have the listed alteration in the listed gene.`,
                    count: getNumSamples(group),
                    color: group.color
                }
            })
            return Promise.resolve(groups);
        }
    });

    readonly enrichmentsUI = MakeMobxView({
        await:()=>[
            this.props.store.copyNumberEnrichmentData,
            this.enrichmentAnalysisGroups,
            this.props.store.selectedStudyCopyNumberEnrichmentProfileMap,
            this.enrichmentAnalysisGroups,
            this.props.store.studies
        ],
        render:()=>{
            let headerName = "Copy number";
            let studyIds = Object.keys(this.props.store.selectedStudyCopyNumberEnrichmentProfileMap.result!);
            if (studyIds.length === 1) {
                headerName = this.props.store.selectedStudyCopyNumberEnrichmentProfileMap.result![studyIds[0]].name
            }
            return (
                <div data-test="GroupComparisonCopyNumberEnrichments">
                    <EnrichmentsDataSetDropdown
                        dataSets={this.props.store.copyNumberEnrichmentProfiles}
                        onChange={this.onChangeProfile}
                        selectedProfileByStudyId={this.props.store.selectedStudyCopyNumberEnrichmentProfileMap.result!}
                        studies={this.props.store.studies.result!}
                    />

                    <AlterationEnrichmentContainer data={this.props.store.copyNumberEnrichmentData.result!}
                        groups={this.enrichmentAnalysisGroups.result}
                        alteredVsUnalteredMode={false}
                        headerName={headerName}
                        showCNAInTable={true}
                        containerType={AlterationContainerType.COPY_NUMBER}
                        patientLevelEnrichments={this.props.store.usePatientLevelEnrichments}
                        onSetPatientLevelEnrichments={this.props.store.setUsePatientLevelEnrichments}
                    />
                </div>
            );
        },
        renderPending:()=><LoadingIndicator center={true} isLoading={true} size={"big"}/>,
        renderError:()=><ErrorMessage/>
    });

    render() {
        return this.tabUI.component;
    }
}
