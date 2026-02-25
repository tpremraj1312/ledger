import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { acceptInvite } from '../services/familyService';

const JoinFamily = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No invitation token provided.');
            return;
        }

        const join = async () => {
            try {
                const data = await acceptInvite(token);
                setStatus('success');
                setMessage(data.message || 'Successfully joined the family group!');
                setTimeout(() => navigate('/dashboard'), 3000);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Failed to accept invitation. The link may be expired or already used.');
            }
        };

        join();
    }, [token, navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-10 w-full max-w-md shadow-xl text-center border border-gray-100">

                {status === 'loading' && (
                    <>
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 size={32} className="text-blue-600 animate-spin" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Joining Family Group...</h2>
                        <p className="text-sm text-gray-500">Verifying your invitation link.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={32} className="text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to the Family! 🎉</h2>
                        <p className="text-sm text-gray-500 mb-6">{message}</p>
                        <p className="text-xs text-gray-400">Redirecting to dashboard in 3 seconds...</p>
                        <button onClick={() => navigate('/dashboard')}
                            className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                            Go to Dashboard Now
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={32} className="text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h2>
                        <p className="text-sm text-gray-500 mb-6">{message}</p>
                        <button onClick={() => navigate('/dashboard')}
                            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                            Go to Dashboard
                        </button>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default JoinFamily;
