import React from 'react';
import { CheckCircleIcon, LoaderIcon, XCircleIcon, CircleIcon } from './icons';

export type StepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface Step {
    name: string;
    status: StepStatus;
}

interface ThinkingStepperProps {
    steps: Step[];
}

const StatusIcon = ({ status }: { status: StepStatus }) => {
    switch (status) {
        case 'completed':
            return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
        case 'active':
            return <LoaderIcon className="w-5 h-5 text-blue-500 animate-spin" />;
        case 'error':
            return <XCircleIcon className="w-5 h-5 text-red-500" />;
        case 'pending':
        default:
            return <CircleIcon className="w-5 h-5 text-gray-500" />;
    }
};

const ThinkingStepper: React.FC<ThinkingStepperProps> = ({ steps }) => {
    if (steps.length === 0) return null;
    
    return (
        <div className="space-y-4 py-2">
            {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <StatusIcon status={step.status} />
                    </div>
                    <p className={`text-sm transition-colors ${step.status === 'active' ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>
                        {step.name}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default ThinkingStepper;

