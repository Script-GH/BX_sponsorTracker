import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { FileSpreadsheet } from "lucide-react";

interface UploadConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    fileName: string | null;
    fileSize: string | null;
}

export function UploadConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    fileName,
    fileSize
}: UploadConfirmationDialogProps) {
    if (!fileName) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl">Upload Excel File</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to import data from this file?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                        <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <p className="text-slate-900 font-medium text-lg">{fileName}</p>
                    {fileSize && <p className="text-slate-500 text-sm mt-1">{fileSize}</p>}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-end mt-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 sm:flex-none border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Import Data
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
