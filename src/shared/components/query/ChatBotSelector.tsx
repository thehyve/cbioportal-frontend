import * as React from 'react';
import { observer } from 'mobx-react';
import { action, makeObservable } from 'mobx';
import { FlexRow, FlexCol } from '../flexbox/FlexBox';
import { getOncoQueryDocUrl } from '../../api/urls';
import { QueryStoreComponent, Focus, GeneReplacement } from './QueryStore';
import SectionHeader from '../sectionHeader/SectionHeader';
import OQLTextArea, { GeneBoxType } from '../GeneSelectionBox/OQLTextArea';
import { SingleGeneQuery } from 'shared/lib/oql/oql-parser';
import { Gene, CBioPortalAPIInternal } from 'cbioportal-ts-api-client';

@observer
export default class ChatBotSelector extends QueryStoreComponent<{}, {}> {
    constructor(props: any, public internalClient: CBioPortalAPIInternal) {
        super(props);
        makeObservable(this);
    }

    @action.bound
    handleOQLUpdate(
        oql: {
            query: SingleGeneQuery[];
            error?: { start: number; end: number; message: string };
        },
        genes: { found: Gene[]; suggestions: GeneReplacement[] },
        queryStr: string
    ): void {
        if (queryStr !== this.store.aiQuery) {
            this.store.aiQuery = queryStr;
        }
    }

    async handleSubmit() {
        this.store.aiMessage = '';
        this.store.geneQuery = '';
        let result = await this.store.getAIResponse();
        const parts = result.query.split('OQL: ', 2);

        if (parts.length < 2 || parts[1].trim().toUpperCase() === 'FALSE') {
            this.store.aiMessage = 'Please enter a valid OQL question.';
        } else {
            this.store.geneQuery = parts[0].trim();
        }
    }

    render() {
        return (
            <FlexCol>
                <FlexRow>
                    <OQLTextArea
                        focus={this.store.geneQueryErrorDisplayStatus}
                        inputGeneQuery={this.store.aiQuery}
                        validateInputGeneQuery={false}
                        location={GeneBoxType.DEFAULT}
                        textBoxPrompt={'Enter your Query in Natural Language'}
                        callback={this.handleOQLUpdate}
                        error={this.store.aiMessage}
                        // messages={this.store.oqlMessages}
                    ></OQLTextArea>
                    <FlexCol>
                        <button
                            style={{
                                paddingLeft: 10,
                                paddingRight: 10,
                                marginLeft: 10,
                            }}
                            disabled={this.store.generateQueryEnabled}
                            className="btn btn-primary btn-lg"
                            onClick={() => this.handleSubmit()}
                            data-test="generateButton"
                        >
                            Generate Query
                        </button>
                    </FlexCol>
                </FlexRow>
                <SectionHeader
                    className="sectionLabel"
                    secondaryComponent={
                        <a target="_blank" href={getOncoQueryDocUrl()}>
                            <strong>Hint:</strong> See some example queries here{' '}
                            <i className={'fa fa-external-link'} />
                        </a>
                    }
                ></SectionHeader>
            </FlexCol>
        );
    }
}
