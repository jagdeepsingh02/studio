import * as React from "react";
import { findDOMNode } from "react-dom";
import { action } from "mobx";
import { observer } from "mobx-react";
import * as classNames from "classnames";
import { bind } from "bind-decorator";

import { Icon } from "shared/ui/icon";

import { Waveform } from "instrument/window/waveform/generic";

import { appStore } from "instrument/window/app-store";
import { historyItemBlocks, historyNavigator } from "instrument/window/history";
import { IHistoryItem } from "instrument/window/history-item";

////////////////////////////////////////////////////////////////////////////////

@observer
export class HistoryItems extends React.Component<{ historyItems: IHistoryItem[] }> {
    render() {
        return this.props.historyItems.map(historyItem => {
            let element = historyItem.listItemElement;

            let showCheckbox = false;

            if (appStore.selectHistoryItemsSpecification) {
                if (appStore.selectHistoryItemsSpecification.historyItemType === "chart") {
                    if (historyItem instanceof Waveform) {
                        showCheckbox = true;
                    } else {
                        element = <div />;
                    }
                } else {
                    showCheckbox = true;
                }
            }

            let className = classNames(
                `EezStudio_HistoryItemEnclosure`,
                `EezStudio_HistoryItem_${historyItem.id}`,
                {
                    selected: !appStore.selectHistoryItemsSpecification && historyItem.selected
                }
            );

            return (
                <div
                    key={historyItem.id}
                    className={className}
                    onClick={event => {
                        let historyItems = [historyItem];
                        if (event.ctrlKey) {
                            historyItems = historyItems.concat(
                                ...historyNavigator.selectedHistoryItems
                            );
                        }
                        historyNavigator.selectHistoryItems(historyItems);
                    }}
                >
                    {showCheckbox && (
                        <input
                            type="checkbox"
                            checked={appStore.isHistoryItemSelected(historyItem.id)}
                            onChange={event => {
                                appStore.selectHistoryItem(historyItem.id, event.target.checked);
                            }}
                        />
                    )}
                    {element}
                </div>
            );
        });
    }
}

@observer
export class History extends React.Component<{}, {}> {
    animationFrameRequestId: any;
    div: Element;
    fromBottom: number | undefined;
    fromTop: number | undefined;

    componentDidMount() {
        this.autoScroll();
        this.div.addEventListener("scroll", this.onScroll);
    }

    componentDidUpdate() {
        // make sure scroll bar is recalculated after render
        $(this.div).css("overflow", "hidden");
        setTimeout(() => {
            $(this.div).css("overflow", "auto");
        }, 1);
    }

    componentWillUnmount() {
        window.cancelAnimationFrame(this.animationFrameRequestId);

        this.div.removeEventListener("scroll", this.onScroll);
    }

    moveToTop() {
        this.fromBottom = 0;
        this.fromTop = undefined;
    }

    moveToBottom() {
        this.fromBottom = undefined;
        this.fromTop = 0;
    }

    @action
    selectHistoryItem(historyItem: IHistoryItem) {
        setTimeout(() => {
            const element = $(this.div).find(`.EezStudio_HistoryItem_${historyItem.id}`)[0];
            if (element) {
                element.scrollIntoView({ block: "center" });
                setTimeout(() => {
                    element.scrollIntoView({ block: "center" });
                }, 0);
            } else {
                console.warn("History item not found", historyItem);
            }
        }, 0);
    }

    @bind
    autoScroll() {
        if ($(this.div).is(":visible")) {
            if (this.fromBottom !== undefined) {
                if (this.fromBottom != this.div.scrollTop) {
                    this.div.scrollTop = this.fromBottom;
                }
            } else if (this.fromTop !== undefined) {
                let scrollTop = this.div.scrollHeight - this.div.clientHeight - this.fromTop;
                if (scrollTop != this.div.scrollTop) {
                    this.div.scrollTop = scrollTop;
                }
            }
        }

        this.animationFrameRequestId = window.requestAnimationFrame(this.autoScroll);
    }

    lastScrollHeight: number;
    lastClientHeight: number;

    @bind
    onScroll(event: any) {
        if (
            this.div.scrollHeight === this.lastScrollHeight &&
            this.div.clientHeight === this.lastClientHeight
        ) {
            if (this.fromBottom !== undefined) {
                this.fromBottom = this.div.scrollTop;
            } else if (this.fromTop !== undefined) {
                this.fromTop = this.div.scrollHeight - this.div.clientHeight - this.div.scrollTop;
            }
        }

        this.lastScrollHeight = this.div.scrollHeight;
        this.lastClientHeight = this.div.clientHeight;
    }

    @bind
    onDelete() {
        if (appStore.filters.deleted) {
            historyNavigator.purgeHistoryItems();
        } else {
            historyNavigator.deleteHistoryItems();
        }
    }

    @bind
    onFocus() {
        EEZStudio.electron.ipcRenderer.on("delete", this.onDelete);
    }

    @bind
    onBlur() {
        EEZStudio.electron.ipcRenderer.removeListener("delete", this.onDelete);
    }

    render() {
        return (
            <div
                ref={(ref: any) => {
                    let div = findDOMNode(ref);
                    if (div && div.parentElement) {
                        this.div = div.parentElement;
                    }
                }}
                className={"EezStudio_History"}
                onClick={event => {
                    if ($(event.target).closest(".EezStudio_HistoryItemEnclosure").length === 0) {
                        historyNavigator.selectHistoryItems([]);
                    }
                }}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                tabIndex={0}
            >
                {historyNavigator.hasOlder && (
                    <button
                        className="btn btn-secondary"
                        style={{ marginBottom: 20 }}
                        onClick={() => {
                            this.fromBottom = undefined;
                            this.fromTop = undefined;

                            const scrollHeight = this.div.scrollHeight;

                            historyNavigator.loadOlder();

                            window.requestAnimationFrame(() => {
                                this.div.scrollTop = this.div.scrollHeight - scrollHeight;
                            });
                        }}
                    >
                        <Icon icon="material:expand_less" /> More
                    </button>
                )}
                {historyItemBlocks.map(historyItems => {
                    if (historyItems.length === 0) {
                        return null;
                    }
                    return <HistoryItems key={historyItems[0].id} historyItems={historyItems} />;
                })}
                {historyNavigator.hasNewer && (
                    <button
                        className="btn btn-secondary"
                        onClick={historyNavigator.loadNewer}
                        style={{ marginTop: 15 }}
                    >
                        <Icon icon="material:expand_more" /> More
                    </button>
                )}
            </div>
        );
    }
}