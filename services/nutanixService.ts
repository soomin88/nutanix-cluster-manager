import { ClusterConfig, Category, DataRow } from '../types';

/**
 * Backend API URL
 */
const BACKEND_URL = 'http://localhost:8000';

/**
 * Attempts to verify connection to a Nutanix Cluster.
 */
export const verifyClusterConnection = async (cluster: ClusterConfig): Promise<{success: boolean; clusterName: string}> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/verify-cluster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cluster),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Verification failed');
    }

    return await response.json();
  } catch (error: any) {
    console.error('[DEBUG] Verification Failed:', error.message);
    throw error;
  }
};

/**
 * Fetches data based on Category.
 */
export const fetchData = async (
  cluster: ClusterConfig, 
  category: Category,
  performanceParams?: { 
    startTime?: string; 
    endTime?: string; 
    interval?: number; 
    aggregationType?: string;
    ratio?: number;
    rf?: number;
  }
): Promise<DataRow[]> => {
  try {
    const params = new URLSearchParams({ category });
    
    // Performance 카테고리일 때만 시간 파라미터 추가
    if (category === 'Performance' && performanceParams) {
      if (performanceParams.startTime) params.append('startTime', performanceParams.startTime);
      if (performanceParams.endTime) params.append('endTime', performanceParams.endTime);
      if (performanceParams.interval) params.append('interval', performanceParams.interval.toString());
      if (performanceParams.aggregationType) params.append('aggregationType', performanceParams.aggregationType);
    }
    
    // Resources 카테고리일 때 ratio, rf 파라미터 추가
    if (category === 'Resources' && performanceParams) {
      if (performanceParams.ratio) params.append('ratio', performanceParams.ratio.toString());
      if (performanceParams.rf) params.append('rf', performanceParams.rf.toString());
    }
    
    const response = await fetch(`${BACKEND_URL}/api/fetch-data?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cluster),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch data');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[DEBUG] Fetch Failed:', error.message);
    throw error;
  }
};