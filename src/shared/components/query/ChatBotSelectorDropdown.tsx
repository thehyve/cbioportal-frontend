import React from 'react';

import mainStyles from '../../../../packages/oncokb-frontend-commons/src/components/main.module.scss';
import { Collapse } from 'react-collapse';
import classnames from 'classnames';

export type ChatBotSelectorDropdownProps = {
    collapsibleArea: JSX.Element;
    dropdownTitle: string;
};

export const ChatBotSelectorDropdown: React.FunctionComponent<ChatBotSelectorDropdownProps> = (
    props: ChatBotSelectorDropdownProps
) => {
    const [componentCollapsed, updateLevelCollapse] = React.useState(true);

    return (
        <div>
            <div
                data-test="chatboxselector-dropdown-header"
                style={{
                    padding: '25px 0px 0px 0px',
                    borderStyle: 'none none solid none',
                    borderColor: '#ddd',
                    borderWidth: '1px',
                }}
                // className={collapsibleStyles['collapsible-header']}
                onClick={() => updateLevelCollapse(!componentCollapsed)}
            >
                <span style={{ fontSize: 14 }}>{props.dropdownTitle}</span>
                <span style={{ float: 'right' }}>
                    {componentCollapsed ? (
                        <i
                            className={classnames(
                                'fa fa-chevron-down',
                                mainStyles['blue-icon']
                            )}
                        />
                    ) : (
                        <i
                            className={classnames(
                                'fa fa-chevron-up',
                                mainStyles['blue-icon']
                            )}
                        />
                    )}
                </span>
            </div>
            <Collapse isOpened={!componentCollapsed}>
                <div style={{ padding: '25px 0px 0px 0px' }}>
                    {props.collapsibleArea}
                </div>
            </Collapse>
        </div>
    );
};
