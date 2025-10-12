import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, BarChart3, Activity } from 'lucide-react';

interface MainChartProps {
  view: string;
  data: any;
  prodLogs: any[];
}

interface ChartDataPoint {
  date: string;
  productivity: number;
  tasksCompleted: number;
  studyTime: number;
}

interface ProductivityLog {
  date: string;
  log: {
    completion_rate: number;
    total_tasks: number;
    completed_tasks: number;
    study_time?: number;
  };
}

const MainChart: React.FC<MainChartProps> = ({ view, data, prodLogs }) => {
  const [selectedMetric, setSelectedMetric] = useState<'productivity' | 'tasks' | 'study'>('productivity');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Transform real productivity data into chart format
  const transformProdLogsToChartData = (logs: ProductivityLog[]): ChartDataPoint[] => {
    console.log('TransformProdLogsToChartData: Input logs:', logs);
    
    if (!logs || logs.length === 0) {
      console.log('TransformProdLogsToChartData: No logs provided');
      return [];
    }

    const transformed = logs.map((log, index) => {
      console.log(`TransformProdLogsToChartData: Processing log ${index}:`, log);
      const result = {
        date: log.date,
        productivity: log.log?.completion_rate || 0,
        tasksCompleted: log.log?.completed_tasks || 0,
        studyTime: log.log?.study_time || 0,
      };
      console.log(`TransformProdLogsToChartData: Transformed result ${index}:`, result);
      return result;
    });
    
    console.log('TransformProdLogsToChartData: Final transformed data:', transformed);
    return transformed;
  };

  // Update chart data when prodLogs or view changes
  useEffect(() => {
    console.log('MainChart: prodLogs received:', prodLogs);
    console.log('MainChart: prodLogs length:', prodLogs?.length);
    console.log('MainChart: view:', view);
    
    if (prodLogs && prodLogs.length > 0) {
      console.log('MainChart: First prodLog item:', prodLogs[0]);
      const transformedData = transformProdLogsToChartData(prodLogs);
      console.log('MainChart: Transformed data:', transformedData);
      setChartData(transformedData);
    } else {
      console.log('MainChart: No prodLogs data, setting empty array');
      // Fallback to empty data if no logs available
      setChartData([]);
    }
  }, [prodLogs, view]);

  const getMaxValue = () => {
    switch (selectedMetric) {
      case 'productivity':
        return 100;
      case 'tasks':
        return Math.max(...chartData.map(d => d.tasksCompleted));
      case 'study':
        return Math.max(...chartData.map(d => d.studyTime));
      default:
        return 100;
    }
  };

  const getValue = (point: ChartDataPoint) => {
    switch (selectedMetric) {
      case 'productivity':
        return point.productivity;
      case 'tasks':
        return point.tasksCompleted;
      case 'study':
        return point.studyTime;
      default:
        return point.productivity;
    }
  };

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'productivity':
        return 'Productivity (%)';
      case 'tasks':
        return 'Tasks Completed';
      case 'study':
        return 'Study Time (hours)';
      default:
        return 'Productivity (%)';
    }
  };

  const getMetricColor = () => {
    switch (selectedMetric) {
      case 'productivity':
        return 'from-blue-500 to-indigo-600';
      case 'tasks':
        return 'from-green-500 to-emerald-600';
      case 'study':
        return 'from-purple-500 to-violet-600';
      default:
        return 'from-blue-500 to-indigo-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (view === 'Daily') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (view === 'Weekly') {
      return `Week ${Math.ceil(date.getDate() / 7)}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
  };

  const maxValue = getMaxValue();

  // Generate fallback sample data for debugging
  const generateFallbackData = (): ChartDataPoint[] => {
    const days = view === 'Daily' ? 7 : view === 'Weekly' ? 4 : 6;
    const data: ChartDataPoint[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (view === 'Daily') {
        date.setDate(date.getDate() - i);
      } else if (view === 'Weekly') {
        date.setDate(date.getDate() - (i * 7));
      } else {
        date.setMonth(date.getMonth() - i);
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        productivity: Math.floor(Math.random() * 40) + 60, // 60-100%
        tasksCompleted: Math.floor(Math.random() * 8) + 2, // 2-10 tasks
        studyTime: Math.floor(Math.random() * 4) + 1, // 1-5 hours
      });
    }
    
    return data;
  };

  // Use fallback data if no real data is available (for debugging)
  const displayData = chartData.length > 0 ? chartData : generateFallbackData();
  const isUsingFallbackData = chartData.length === 0;

  // Show loading or empty state only if we have no data at all
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="ml-3 text-xl font-semibold text-gray-900 dark:text-white">
                {view} Productivity Chart
              </h2>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {prodLogs === null ? 'Loading productivity data...' : 'No productivity data available for this period'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Debug: prodLogs length = {prodLogs?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-lg dark:shadow-indigo-500/10 mb-8 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="ml-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
              {view} Productivity Chart
            </h2>
          </div>
          
          {/* Metric Selector */}
          <div className="bg-gray-50/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setSelectedMetric('productivity')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selectedMetric === 'productivity'
                    ? 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
              >
                <Activity size={14} className="inline mr-1" />
                Productivity
              </button>
              <button
                onClick={() => setSelectedMetric('tasks')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selectedMetric === 'tasks'
                    ? 'bg-green-500 dark:bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
              >
                <Calendar size={14} className="inline mr-1" />
                Tasks
              </button>
              <button
                onClick={() => setSelectedMetric('study')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selectedMetric === 'study'
                    ? 'bg-purple-500 dark:bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <TrendingUp size={14} className="inline mr-1" />
                Study
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue * 0.75)}</span>
            <span>{Math.round(maxValue * 0.5)}</span>
            <span>{Math.round(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 mr-4 h-64 relative">
            {/* Grid lines */}
            <div className="absolute inset-0">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                <div
                  key={index}
                  className="absolute w-full border-t border-gray-200 dark:border-gray-600"
                  style={{ top: `${ratio * 100}%` }}
                />
              ))}
            </div>

            {/* Chart bars */}
            <div className="absolute inset-0 flex items-end justify-between px-2">
              {displayData.map((point, index) => {
                const value = getValue(point);
                const height = (value / maxValue) * 100;
                const isHovered = hoveredPoint === index;
                
                return (
                  <div
                    key={index}
                    className="flex-1 mx-0.5 relative group"
                    onMouseEnter={() => setHoveredPoint(index)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Bar */}
                    <div
                      className={`w-full bg-gradient-to-t ${getMetricColor()} rounded-t transition-all duration-300 ${
                        isHovered ? 'opacity-80 scale-105' : 'opacity-70'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-10 whitespace-nowrap">
                        <div className="font-medium">{formatDate(point.date)}</div>
                        <div>{getMetricLabel()}: {value}{selectedMetric === 'productivity' ? '%' : selectedMetric === 'study' ? 'h' : ''}</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="ml-12 mr-4 mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            {displayData.filter((_, index) => index % Math.ceil(displayData.length / 6) === 0).map((point, index) => (
              <span key={index}>{formatDate(point.date)}</span>
            ))}
          </div>
        </div>

        {/* Chart summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {displayData.length > 0 ? Math.round(displayData.reduce((sum, point) => sum + point.productivity, 0) / displayData.length) : 0}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Productivity</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {displayData.reduce((sum, point) => sum + point.tasksCompleted, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {displayData.reduce((sum, point) => sum + point.studyTime, 0)}h
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Study Time</div>
          </div>
        </div>
        
        {/* Debug info */}
        {isUsingFallbackData && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Debug:</strong> Using fallback sample data. Real data: {prodLogs?.length || 0} items
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainChart; 