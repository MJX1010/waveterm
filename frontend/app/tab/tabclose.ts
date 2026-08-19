// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { modalsModel } from "@/app/store/modalmodel";
import { getApi } from "@/app/store/global";

export function confirmAndCloseTab(workspaceId: string, tabId: string, confirmClose: boolean): Promise<boolean> {
    if (!confirmClose) {
        return getApi().closeTab(workspaceId, tabId, false);
    }
    return new Promise<boolean>((resolve) => {
        modalsModel.pushModal("ConfirmModal", {
            title: "Close Tab",
            message: "Are you sure you want to close this tab?",
            okLabel: "Close Tab",
            cancelLabel: "Cancel",
            onConfirm: () => {
                getApi()
                    .closeTab(workspaceId, tabId, false)
                    .then(resolve)
                    .catch((e) => {
                        console.log("error closing tab", e);
                        resolve(false);
                    });
            },
            onCancel: () => {
                resolve(false);
            },
        });
    });
}
