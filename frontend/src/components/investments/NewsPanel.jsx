import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, ExternalLink, Newspaper } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL;
const getToken = () => localStorage.getItem('token');

const NewsPanel = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API}/api/investments/news`, { headers: { Authorization: `Bearer ${getToken()}` } })
            .then(r => setNews(r.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex flex-col items-center py-20"><Loader2 size={28} className="icc-spinner text-indigo-500" /><p className="mt-3 text-slate-500">Loading news...</p></div>;
    if (!news.length) return (
        <div className="flex flex-col items-center py-20 text-slate-400">
            <Newspaper size={48} className="opacity-20 mb-3" /><p className="text-lg font-semibold text-slate-600">No news available</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition group">
                    {item.image && (
                        <div className="overflow-hidden h-40">
                            <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                    )}
                    <div className="p-4">
                        <div className="flex justify-between mb-2">
                            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">{item.source}</span>
                            <span className="text-xs text-slate-400">{new Date(item.pubDate).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 line-clamp-2 mb-1.5">{item.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-3 mb-3">{item.summary}</p>
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-700 border-t border-slate-100 pt-3 transition">
                            Read Article <ExternalLink size={11} />
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NewsPanel;
