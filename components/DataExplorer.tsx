import React, { useState, useEffect, useCallback } from 'react';
import { ClusterConfig, Category, DataRow } from '../types';
import { CATEGORIES, FIELD_DEFINITIONS, DEFAULT_FIELDS } from '../constants';
import { fetchData } from '../services/nutanixService';
import { Download, RefreshCw, ChevronDown, Check, ChevronRight } from 'lucide-react';

interface DataExplorerProps {
  cluster: ClusterConfig;
}

const DataExplorer: React.FC<DataExplorerProps> = ({ cluster }) => {
  const [category, setCategory] = useState<Category>('VM');
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_FIELDS['VM']);
  const [data, setData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  
  // Performance 전용 상태
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [interval, setInterval] = useState<number>(30);
  const [aggregationType, setAggregationType] = useState<'max' | 'average'>('average');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  
  // Resources 전용 상태
  const [ratio, setRatio] = useState<number>(3);
  const [rf, setRf] = useState<number>(2);
  const [cvmVcore, setCvmVcore] = useState<number>(0);
  const [cvmMemory, setCvmMemory] = useState<number>(0);
  
  // 정렬 상태
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Reset selection when category changes
  useEffect(() => {
    setSelectedFields(DEFAULT_FIELDS[category]);
    setData([]); // Clear old data
    
    // Performance 카테고리로 변경 시 기본 시간 설정
    if (category === 'Performance') {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
      const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };
      
      setStartTime(formatDateTime(oneHourAgo));
      setEndTime(formatDateTime(now));
      setInterval(30);
    }
  }, [category]);

  const loadData = useCallback(async (ignoreCache: boolean = false) => {
    // Performance 카테고리인데 시간이 설정되지 않았으면 로드하지 않음
    if (category === 'Performance' && (!startTime || !endTime)) {
      return;
    }
    
    // Resources 카테고리인데 ratio나 rf가 설정되지 않았으면 로드하지 않음
    if (category === 'Resources' && (!ratio || !rf)) {
      return;
    }
    
    setLoading(true);
    try {
      const result = await fetchData(cluster, category, { 
        startTime, 
        endTime, 
        interval, 
        aggregationType,
        ratio,
        rf,
        cvmVcore,
        cvmMemory,
        ignoreCache
      });
      setData(result);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }, [cluster, category, startTime, endTime, interval, aggregationType, ratio, rf, cvmVcore, cvmMemory]);

  // Load data immediately when category changes or when component mounts with a valid cluster
  useEffect(() => {
    if (cluster.isVerified && category !== 'Performance' && category !== 'Resources') {
      loadData();
    }
    // Performance와 Resources는 사용자가 Apply 버튼을 눌러야만 로드
  }, [loadData, cluster, category]);

  const toggleField = (key: string) => {
    setSelectedFields(prev => 
      prev.includes(key) 
        ? prev.filter(f => f !== key)
        : [...prev, key]
    );
  };
  
  // 정렬 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 방향 전환
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드를 클릭하면 해당 필드로 오름차순 정렬
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 정렬된 데이터
  const sortedData = React.useMemo(() => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      // null/undefined 처리
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // 숫자 비교
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // 문자열 비교
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [data, sortField, sortDirection]);

  const toggleClusterExpansion = (clusterName: string) => {
    setExpandedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterName)) {
        newSet.delete(clusterName);
      } else {
        newSet.add(clusterName);
      }
      return newSet;
    });
  };



  const exportToXLSX = async () => {
    if (data.length === 0) return;

    try {
      // 실제 Cluster Name 가져오기 (데이터의 clusterName 필드 또는 기본값)
      const actualClusterName = (data[0]?.clusterName as string) || cluster.name || cluster.ip;

      // Resources는 특별한 처리 필요
      if (category === 'Resources') {
        const cpuData = data.filter(row => row.table === 'CPU');
        const memoryData = data.filter(row => row.table === 'Memory');
        
        // CPU 필드
        const cpuFields = ['hostName', 'vmCount', 'numaOver', 'pCore', 'useVCore', 'recommendVcoreRatio', 'currentVcoreRatio', 'result'];
        const cpuFieldLabels: Record<string, string> = {
          hostName: 'Host name',
          vmCount: 'VM Count',
          numaOver: 'NUMA over',
          pCore: 'pCore',
          useVCore: 'Use vCore',
          recommendVcoreRatio: 'Recommend vcore Ratio',
          currentVcoreRatio: 'Current vcore Ratio',
          result: 'Result'
        };
        
        // Memory 필드
        const memoryFields = ['hostName', 'vmCount', 'numaOver', 'memoryGiB', 'useMemoryGiB', 'recommendUse', 'availableMemory', 'result'];
        const memoryFieldLabels: Record<string, string> = {
          hostName: 'Host name',
          vmCount: 'VM Count',
          numaOver: 'NUMA over',
          memoryGiB: 'Memory(GiB)',
          useMemoryGiB: 'Use Memory(GiB) =(A)',
          recommendUse: 'Recommend Use =(B)',
          availableMemory: 'Available memory (B-A)',
          result: 'Result'
        };
        
        const response = await fetch('http://localhost:8000/api/export-xlsx', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [...cpuData, ...memoryData],
            fields: cpuData.length > 0 ? cpuFields : memoryFields,
            fieldLabels: cpuData.length > 0 ? cpuFieldLabels : memoryFieldLabels,
            filename: `${actualClusterName}_${category}_${new Date().toISOString().split('T')[0]}`,
            isResources: true,
            cpuData: cpuData,
            memoryData: memoryData,
            cpuFields: cpuFields,
            memoryFields: memoryFields,
            cpuFieldLabels: cpuFieldLabels,
            memoryFieldLabels: memoryFieldLabels
          }),
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${actualClusterName}_${category}_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        return;
      }

      // 기존 로직 (VM, Hardware, Performance)
      const fieldLabels: Record<string, string> = {};
      selectedFields.forEach(field => {
        const def = FIELD_DEFINITIONS[category].find(f => f.key === field);
        fieldLabels[field] = def?.label || field;
      });

      const response = await fetch('http://localhost:8000/api/export-xlsx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          fields: selectedFields,
          fieldLabels,
          filename: `${actualClusterName}_${category}_${new Date().toISOString().split('T')[0]}`,
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${actualClusterName}_${category}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export XLSX');
    }
  };

  const availableFields = FIELD_DEFINITIONS[category];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1 flex flex-col min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
        <div>
           <h3 className="text-base font-bold text-gray-800">Cluster Explorer: <span className="text-nutanix-blue">{cluster.ip}</span></h3>
           <p className="text-xs text-gray-500">View and export details for selected entities.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
             <select 
               className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-nutanix-blue focus:border-nutanix-blue block w-32 p-1.5 pr-7"
               value={category}
               onChange={(e) => setCategory(e.target.value as Category)}
             >
               {CATEGORIES.map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
               ))}
             </select>
             <ChevronDown className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16} />
          </div>

          {/* Fields Multi-Select Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsFieldDropdownOpen(!isFieldDropdownOpen)}
              className="flex items-center justify-between w-40 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-nutanix-blue"
            >
              <span className="truncate">{selectedFields.length} cols</span>
              <ChevronDown size={14} className="ml-1" />
            </button>
            
            {isFieldDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsFieldDropdownOpen(false)}
                />
                <div className="absolute top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {availableFields.map(field => (
                      <div 
                        key={field.key}
                        onClick={() => toggleField(field.key)}
                        className="flex items-center px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer"
                      >
                         <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center
                           ${selectedFields.includes(field.key) ? 'bg-nutanix-blue border-nutanix-blue' : 'border-gray-300'}
                         `}>
                           {selectedFields.includes(field.key) && <Check size={12} className="text-white" />}
                         </div>
                         <span className="text-sm text-gray-700">{field.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={() => loadData(true)}
            className="flex items-center gap-1 px-2 py-1.5 text-gray-500 hover:text-nutanix-blue border border-gray-300 rounded-lg hover:bg-gray-50"
            title="API Recall (Ignore Cache)"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="text-xs font-medium">API Recall</span>
          </button>
          
          <button 
            onClick={exportToXLSX}
            disabled={loading || data.length === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors
              ${loading || data.length === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
              }`}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Performance 전용 시간/인터벌 입력 섹션 */}
      {category === 'Performance' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance Query Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Interval (seconds)</label>
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                min="1"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Aggregation</label>
              <select
                value={aggregationType}
                onChange={(e) => setAggregationType(e.target.value as 'max' | 'average')}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue bg-white"
              >
                <option value="max">Max</option>
                <option value="average">Average</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadData}
                disabled={loading || !startTime || !endTime}
                className="w-full px-3 py-1.5 bg-nutanix-blue text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center gap-1"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={14} />
                {loading ? 'Loading...' : 'Apply & Fetch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resources 전용 Ratio/RF 입력 섹션 */}
      {category === 'Resources' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Resource Analysis Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CPU Ratio</label>
              <select
                value={ratio}
                onChange={(e) => setRatio(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">RF</label>
              <select
                value={rf}
                onChange={(e) => setRf(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue bg-white"
              >
                <option value={2}>RF2</option>
                <option value={3}>RF3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CVM vCore</label>
              <input
                type="number"
                value={cvmVcore}
                onChange={(e) => setCvmVcore(Number(e.target.value))}
                min="0"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue bg-white"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CVM Memory (GiB)</label>
              <input
                type="number"
                value={cvmMemory}
                onChange={(e) => setCvmMemory(Number(e.target.value))}
                min="0"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue bg-white"
                placeholder="0"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadData}
                disabled={loading}
                className="w-full px-3 py-1.5 bg-nutanix-blue text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center gap-1"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={14} />
                {loading ? 'Loading...' : 'Apply & Fetch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {category === 'Resources' ? (
        // Resources 전용 렌더링
        <div className="space-y-6">
          {/* CPU 테이블 */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700">CPU</h5>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Host name</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">VM Count</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">NUMA over</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">pCore</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Use vCore</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Recommend vcore Ratio</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Current vcore Ratio</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Result</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.filter(row => row.table === 'CPU').map((row, idx) => (
                    <tr key={idx} className={row.hostName === 'Total' ? 'bg-blue-50 font-semibold' : ''}>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.hostName}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.vmCount}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.numaOver}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.pCore}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.useVCore}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.recommendVcoreRatio}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.currentVcoreRatio}</td>
                      <td className={`px-3 py-2 text-sm font-semibold text-center ${row.result === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                        {row.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Memory 테이블 */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700">Memory</h5>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Host name</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">VM Count</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">NUMA over</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Memory(GiB)</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Use Memory(GiB) =(A)</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Recommend Use =(B)</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Available memory (B-A)</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Result</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.filter(row => row.table === 'Memory').map((row, idx) => (
                    <tr key={idx} className={row.hostName === 'Total' ? 'bg-blue-50 font-semibold' : ''}>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.hostName}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.vmCount}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.numaOver}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.memoryGiB}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.useMemoryGiB}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.recommendUse}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">{row.availableMemory}</td>
                      <td className={`px-3 py-2 text-sm font-semibold text-center ${row.result === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                        {row.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // 기존 테이블 렌더링
        <div className="overflow-x-auto border border-gray-200 rounded-lg flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {selectedFields.map(fieldKey => {
                  const def = availableFields.find(f => f.key === fieldKey);
                  const isSorted = sortField === fieldKey;
                  return (
                    <th 
                      key={fieldKey}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort(fieldKey)}
                      title="클릭하여 정렬"
                    >
                      <div className="flex items-center gap-1">
                        <span>{def?.label || fieldKey}</span>
                        {isSorted && (
                          <span className="text-nutanix-blue">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={selectedFields.length} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="animate-spin text-nutanix-blue" size={32} />
                    <span>Loading data from Prism...</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                 <td colSpan={selectedFields.length} className="px-3 py-8 text-center text-gray-500 text-sm">
                    No data available or filters too restrictive.
                 </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => {
                // Performance 카테고리에서 클러스터 행과 호스트 행을 구분
                const isClusterRow = category === 'Performance' && row.entityType === 'cluster';
                const isHostRow = category === 'Performance' && row.entityType === 'host';
                const parentCluster = isHostRow ? row.parentCluster : null;
                const isExpanded = isClusterRow && expandedClusters.has(row.entityName || '');
                
                // 호스트 행이고 부모 클러스터가 펼쳐지지 않았다면 표시하지 않음
                if (isHostRow && parentCluster && !expandedClusters.has(parentCluster)) {
                  return null;
                }
                
                return (
                  <tr 
                    key={idx} 
                    className={`hover:bg-gray-50 transition-colors ${isHostRow ? 'bg-blue-50' : ''}`}
                  >
                    {selectedFields.map((fieldKey, fieldIdx) => (
                      <td 
                        key={`${idx}-${fieldKey}`} 
                        className={`px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap max-w-xs ${
                          isHostRow ? 'pl-8' : ''
                        }`}
                      >
                        {fieldIdx === 0 && isClusterRow ? (
                          <button
                            onClick={() => toggleClusterExpansion(row.entityName || '')}
                            className="flex items-center gap-1 text-left hover:text-nutanix-blue"
                          >
                            <ChevronRight 
                              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              size={16} 
                            />
                            <span className="font-semibold">{row[fieldKey]}</span>
                          </button>
                        ) : (
                          row[fieldKey]
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}
      
      <div className="mt-4 text-xs text-gray-400 text-right">
        Displaying {data.length} rows
      </div>
    </div>
  );
};

export default DataExplorer;