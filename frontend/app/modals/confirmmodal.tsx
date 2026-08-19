// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Modal } from "@/app/modals/modal";
import { modalsModel } from "@/app/store/modalmodel";
import { memo, useEffect } from "react";

interface ConfirmModalProps {
    title: string;
    message: string;
    okLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal = memo(({ title, message, okLabel = "Ok", cancelLabel = "Cancel", onConfirm, onCancel }: ConfirmModalProps) => {
    const handleConfirm = () => {
        modalsModel.popModal();
        onConfirm();
    };

    const handleCancel = () => {
        modalsModel.popModal();
        onCancel();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === "Escape") {
                e.preventDefault();
                handleCancel();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <Modal
            className="p-4 min-w-[400px]"
            onOk={handleConfirm}
            onCancel={handleCancel}
            onClose={handleCancel}
            okLabel={okLabel}
            cancelLabel={cancelLabel}
        >
            <div className="flex flex-col gap-3 mb-4">
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-secondary">{message}</p>
            </div>
        </Modal>
    );
});

ConfirmModal.displayName = "ConfirmModal";

export { ConfirmModal };
