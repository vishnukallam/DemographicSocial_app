import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8 text-center">
                    <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                    <p className="text-gray-700 mb-6">The application encountered an unexpected error.</p>
                    <details className="bg-white p-4 rounded shadow-lg text-left overflow-auto max-w-2xl w-full text-xs font-mono border border-red-200 text-red-800">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                    >
                        Return Home
                    </button>
                    <button
                        onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                        className="mt-4 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold"
                    >
                        Clear Cache & Login
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
