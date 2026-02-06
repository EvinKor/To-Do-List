import React, { useState } from 'react';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
    const [token, setToken] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleSetToken = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (!token.trim()) {
            setError('Token is required');
            return;
        }

        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `mrbur_sso=${encodeURIComponent(token.trim())}; Path=/; SameSite=Lax${secure}`;
        setMessage('Token saved. Redirecting...');
        onLoginSuccess();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-400/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-8 bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10">
                <div className="flex flex-col items-center mb-8">
                    <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg mb-4">
                        <span className="text-3xl font-bold text-white">P</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Set Token</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-center">
                        Paste your token to continue.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-green-600 dark:text-green-400 text-sm">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSetToken} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Token</label>
                        <textarea
                            required
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all dark:text-white min-h-[120px]"
                            placeholder="Paste token here"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Save Token
                    </button>
                </form>
            </div>
        </div>
    );
}
