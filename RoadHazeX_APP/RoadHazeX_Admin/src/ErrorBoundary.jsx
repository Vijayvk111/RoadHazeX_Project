import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        if (process.env.NODE_ENV === 'development') {
            console.error("Admin ErrorBoundary caught an error", error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-6">
                        <span className="material-icons-round text-red-500 text-5xl">gpp_bad</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-4">Command Center Error</h1>
                    <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                        A critical failure occurred in the admin dashboard. Please refresh to restore the connection.
                    </p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-600/20"
                        >
                            Reconnect
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;
