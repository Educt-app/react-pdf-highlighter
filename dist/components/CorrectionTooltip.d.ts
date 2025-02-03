import { default as React } from 'react';
interface CorrectionTooltipProps {
    correction: string;
    error: string;
    error_type: string;
    position: {
        top: number;
        left: number;
    };
    onAccept: () => void;
    onReject: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}
export declare const CorrectionTooltip: React.FC<CorrectionTooltipProps>;
export {};
