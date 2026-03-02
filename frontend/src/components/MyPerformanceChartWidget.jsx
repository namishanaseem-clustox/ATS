import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getMyPerformance } from '../api/dashboard';

const MyPerformanceChartWidget = () => {
    const { data, isLoading } = useQuery({
        queryKey: ['my-performance'],
        queryFn: getMyPerformance
    });

    const chartData = data || [];

    return (
        <div className="bg-white shadow-sm border border-gray-200 overflow-hidden w-full">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-[15px] uppercase tracking-wide">MY PERFORMANCE</h3>
            </div>

            <div className="p-5">
                <h4 className="text-[11px] font-bold text-gray-500 uppercase flex items-center mb-6">
                    MY CANDIDATES <span className="ml-1 text-gray-300">℗</span>
                </h4>

                <div style={{ width: '100%', height: 256 }}>
                    {isLoading ? (
                        <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">Loading chart...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                    domain={[0, 800]}
                                    ticks={[0, 200, 400, 600, 800]}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="candidates"
                                    fill="#3B82F6"
                                    radius={[2, 2, 0, 0]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyPerformanceChartWidget;
