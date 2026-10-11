import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        if (process.env.NODE_ENV === 'development') {
            console.error("ErrorBoundary caught an error", error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="w-full h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-6">
                        <span className="material-icons-round text-red-500 text-5xl">warning</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-4">Something went wrong.</h1>
                    <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                        A critical error occurred while trying to load this view. Please try refreshing the page or returning to the home screen.
                    </p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-600/20"
                        >
                            Refresh Page
                        </button>
                        <button 
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.href = '/';
                            }}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                        >
                            Return to Home
                        </button>
                    </div>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="mt-8 p-4 bg-red-950/50 border border-red-900/50 rounded-xl max-w-2xl text-left overflow-auto custom-scrollbar">
                            <p className="text-red-400 font-mono text-xs whitespace-pre-wrap">{this.state.error.toString()}</p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;
