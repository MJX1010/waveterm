// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Modal } from "@/app/modals/modal";
import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { modalsModel } from "@/store/modalmodel";
import * as keyutil from "@/util/keyutil";
import { base64ToString, stringToBase64 } from "@/util/util";
import { memo, useCallback, useEffect, useRef, useState } from "react";

interface AddDirFavoriteModalProps {
    initialPath?: string;
    initialConnection?: string;
}

function getLastPathSegment(path: string): string {
    if (!path) return "";
    const normalized = path.replace(/[\\/]+$/, "");
    const lastSlash = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
    return lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
}

function generateUniqueKey(label: string, existing: Record<string, unknown>): string {
    const sanitized = label.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const base = `dirfav@${sanitized}`;
    if (!(base in existing)) return base;
    let i = 2;
    while (`${base}-${i}` in existing) i++;
    return `${base}-${i}`;
}

function getNextDisplayOrder(existing: Record<string, any>): number {
    let maxOrder = 0;
    for (const val of Object.values(existing)) {
        const order = val?.["display:order"] ?? 0;
        if (order > maxOrder) maxOrder = order;
    }
    return maxOrder + 1;
}

const AddDirFavoriteModal = memo(({ initialPath, initialConnection }: AddDirFavoriteModalProps) => {
    const [dirPath, setDirPath] = useState(initialPath ?? "");
    const [label, setLabel] = useState(getLastPathSegment(initialPath ?? ""));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pathInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        pathInputRef.current?.focus();
    }, []);

    const handleCancel = useCallback(() => {
        modalsModel.popModal();
    }, []);

    const handleAdd = useCallback(async () => {
        const trimmedPath = dirPath.trim();
        if (!trimmedPath) {
            setError("Directory path is required");
            return;
        }

        const displayLabel = label.trim() || getLastPathSegment(trimmedPath);
        if (!displayLabel) {
            setError("Label is required");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const configDir = (window as any).api.getConfigDir();
            const fullPath = `${configDir}/widgets.json`;

            let existing: Record<string, any> = {};
            try {
                const fileData = await RpcApi.FileReadCommand(TabRpcClient, { info: { path: fullPath } }, null);
                if (fileData?.data64) {
                    const content = base64ToString(fileData.data64);
                    if (content.trim()) {
                        existing = JSON.parse(content);
                    }
                }
            } catch {
                // File doesn't exist yet, start with empty object
            }

            const key = generateUniqueKey(displayLabel, existing);
            const meta: Record<string, any> = {
                view: "term",
                controller: "shell",
                "cmd:cwd": trimmedPath,
            };
            if (initialConnection) {
                meta.connection = initialConnection;
            }

            existing[key] = {
                "display:order": getNextDisplayOrder(existing),
                icon: "folder-open",
                color: "#4ade80",
                label: displayLabel,
                description: `Open terminal in ${trimmedPath}`,
                blockdef: { meta },
            };

            const formatted = JSON.stringify(existing, null, 4);
            await RpcApi.FileWriteCommand(
                TabRpcClient,
                { info: { path: fullPath }, data64: stringToBase64(formatted) },
                null
            );

            modalsModel.popModal();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(`Failed to save: ${msg}`);
        } finally {
            setSaving(false);
        }
    }, [dirPath, label, initialConnection]);

    const handleKeyDown = useCallback(
        (waveEvent: WaveKeyboardEvent): boolean => {
            if (keyutil.checkKeyPressed(waveEvent, "Escape")) {
                handleCancel();
                return true;
            }
            if (keyutil.checkKeyPressed(waveEvent, "Enter")) {
                handleAdd();
                return true;
            }
            return false;
        },
        [handleCancel, handleAdd]
    );

    return (
        <Modal
            className="pt-6 pb-4 px-5"
            onOk={handleAdd}
            onCancel={handleCancel}
            onClose={handleCancel}
            okLabel="Add"
            cancelLabel="Cancel"
            okDisabled={saving || !dirPath.trim()}
        >
            <div className="font-bold text-primary mx-4 pb-2.5">Add Directory Favorite</div>
            <div className="flex flex-col gap-4 mx-4 mb-4 max-w-[500px]">
                <div className="flex flex-col gap-1.5">
                    <label className="text-secondary text-sm">Directory Path</label>
                    <input
                        ref={pathInputRef}
                        type="text"
                        value={dirPath}
                        onChange={(e) => {
                            setDirPath(e.target.value);
                            if (!label || label === getLastPathSegment(dirPath)) {
                                setLabel(getLastPathSegment(e.target.value));
                            }
                        }}
                        placeholder="/path/to/directory"
                        className="bg-panel rounded-md border border-border py-1.5 px-3 min-h-[30px] text-inherit focus:ring-2 focus:ring-accent focus:outline-none"
                        onKeyDown={(e) => keyutil.keydownWrapper(handleKeyDown)(e)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-secondary text-sm">Display Name</label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="my-project"
                        className="bg-panel rounded-md border border-border py-1.5 px-3 min-h-[30px] text-inherit focus:ring-2 focus:ring-accent focus:outline-none"
                        onKeyDown={(e) => keyutil.keydownWrapper(handleKeyDown)(e)}
                    />
                </div>
                {error && <div className="text-error text-sm">{error}</div>}
            </div>
        </Modal>
    );
});

AddDirFavoriteModal.displayName = "AddDirFavoriteModal";

export { AddDirFavoriteModal };
