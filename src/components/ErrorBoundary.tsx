import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    onReset?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback onReset={this.handleReset} onReload={this.handleReload} />;
        }

        return this.props.children;
    }
}

function ErrorFallback({ onReset, onReload }: { onReset: () => void; onReload: () => void }) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
            <div className="text-center max-w-md space-y-6">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">{t('error.title')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t('error.description')}
                    </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" onClick={onReset}>
                        {t('common.reset')}
                    </Button>
                    <Button onClick={onReload} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        {t('error.reload')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
